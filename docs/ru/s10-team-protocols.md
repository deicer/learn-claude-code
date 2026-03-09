# s10: Командные протоколы

`s01 > s02 > s03 > s04 > s05 > s06 | s07 > s08 > s09 > [ s10 ] s11 > s12`

> *"Напарникам нужны общие правила общения"* — один паттерн «запрос-ответ» управляет всеми переговорами.

## Проблема

В s09 напарники умеют работать и общаться, но у них нет структурированной координации.

**Shutdown**: если просто убить поток, файлы могут остаться наполовину записанными, а `config.json` — устаревшим. Нужен handshake: лидер просит завершиться, напарник либо соглашается и аккуратно выходит, либо отклоняет запрос и продолжает работу.

**Plan approval**: если лидер говорит «отрефактори auth-модуль», напарник начинает сразу. Но для рискованных изменений лидер должен сначала посмотреть план.

Обе ситуации имеют одну и ту же форму: одна сторона отправляет запрос с уникальным ID, другая отвечает, ссылаясь на тот же ID.

## Решение

```
Протокол завершения          Протокол утверждения плана
===================          =========================

Лидер            Напарник    Напарник          Лидер
  |                 |           |                 |
  |--shutdown_req-->|           |--plan_req------>|
  | {req_id:"abc"}  |           | {req_id:"xyz"}  |
  |                 |           |                 |
  |<--shutdown_resp-|           |<--plan_resp-----|
  | {req_id:"abc",  |           | {req_id:"xyz",  |
  |  approve:true}  |           |  approve:true}  |

Общий FSM:
  [pending] --approve--> [approved]
  [pending] --reject---> [rejected]

Трекеры:
  shutdown_requests = {req_id: {target, status}}
  plan_requests     = {req_id: {from, plan, status}}
```

## Как это работает

1. Лидер инициирует shutdown: генерирует `request_id` и отправляет запрос через входящий ящик.

```python
shutdown_requests = {}

def handle_shutdown_request(teammate: str) -> str:
    req_id = str(uuid.uuid4())[:8]
    shutdown_requests[req_id] = {"target": teammate, "status": "pending"}
    BUS.send("lead", teammate, "Please shut down gracefully.",
             "shutdown_request", {"request_id": req_id})
    return f"Shutdown request {req_id} sent (status: pending)"
```

2. Напарник получает запрос и отвечает approve/reject.

```python
if tool_name == "shutdown_response":
    req_id = args["request_id"]
    approve = args["approve"]
    shutdown_requests[req_id]["status"] = "approved" if approve else "rejected"
    BUS.send(sender, "lead", args.get("reason", ""),
             "shutdown_response",
             {"request_id": req_id, "approve": approve})
```

3. Approval плана устроен так же. Напарник отправляет план, создавая `request_id`, а лидер отвечает на тот же ID.

```python
plan_requests = {}

def handle_plan_review(request_id, approve, feedback=""):
    req = plan_requests[request_id]
    req["status"] = "approved" if approve else "rejected"
    BUS.send("lead", req["from"], feedback,
             "plan_approval_response",
             {"request_id": request_id, "approve": approve})
```

Один FSM, два применения. Машина состояний `pending -> approved | rejected` подходит для любого протокола «запрос-ответ».

## Что изменилось относительно s09

| Компонент | Было (s09) | Стало (s10) |
|-----------|------------|-------------|
| Инструменты | 9 | 12 (`+shutdown_req/resp +plan`) |
| Shutdown | только естественный выход | согласованный протокол «запрос-ответ» |
| Gating плана | отсутствует | submit/review с подтверждением |
| Корреляция | отсутствует | `request_id` на каждый запрос |
| FSM | отсутствует | `pending -> approved/rejected` |

## Попробуйте

```sh
cd learn-claude-code
python agents/s10_team_protocols.py
```

1. `Заспавнь alice как coder, а затем запроси её завершение`
2. `Покажи список напарников и проверь статус alice после одобрения shutdown`
3. `Заспавнь bob с рискованной задачей на рефакторинг. Посмотри его план и отклони его.`
4. `Заспавнь charlie, попроси его отправить план, а затем одобри его`
5. `Введи /team, чтобы следить за статусами`
