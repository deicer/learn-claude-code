# s11: Автономные агенты

`s01 > s02 > s03 > s04 > s05 > s06 | s07 > s08 > s09 > s10 > [ s11 ] s12`

> *"Напарники сами смотрят на доску и забирают задачи"* — лидеру больше не нужно вручную раздавать каждую задачу.

## Проблема

В s09-s10 напарники работают только по прямому указанию. Лидеру приходится спавнить каждого с конкретным запросом. Есть 10 ничьих задач на доске? Значит, лидер назначит все 10 вручную. Такой подход не масштабируется.

Настоящая автономность выглядит иначе: напарники сами смотрят на доску задач, сами забирают ничьи задачи, выполняют их и затем ищут следующую работу.

Есть ещё один тонкий момент: после сжатия контекста из s06 агент может забыть, кто он такой. Это исправляется повторным внедрением его идентичности.

## Решение

```
Жизненный цикл напарника с idle-циклом:

+-------+
| запуск |
+---+---+
    |
    v
+-------+   tool_use     +-------+
| РАБОТА| <------------- |  LLM  |
+---+---+                +-------+
    |
    | stop_reason != tool_use (или вызван idle tool)
    v
+--------+
| ОЖИД.  |  опрос каждые 5 с, максимум 60 с
+---+----+
    |
    +---> проверить inbox --> есть письмо? ---> РАБОТА
    |
    +---> проверить .tasks/ -> есть свободная? -> забрать -> РАБОТА
    |
    +---> тайм-аут 60 c --------------------> ЗАВЕРШЕНИЕ

Повторная инъекция идентичности после compress:
  if len(messages) <= 3:
    messages.insert(0, identity_block)
```

## Как это работает

1. Цикл напарника делится на две фазы: `WORK` и `IDLE`. Когда LLM перестаёт вызывать инструменты или сама вызывает `idle`, агент переходит в ожидание.

```python
def _loop(self, name, role, prompt):
    while True:
        # -- WORK PHASE --
        messages = [{"role": "user", "content": prompt}]
        for _ in range(50):
            response = client.messages.create(...)
            if response.stop_reason != "tool_use":
                break
            # execute tools...
            if idle_requested:
                break

        # -- IDLE PHASE --
        self._set_status(name, "idle")
        resume = self._idle_poll(name, messages)
        if not resume:
            self._set_status(name, "shutdown")
            return
        self._set_status(name, "working")
```

2. В idle-фазе агент циклически опрашивает входящий ящик и доску задач.

```python
def _idle_poll(self, name, messages):
    for _ in range(IDLE_TIMEOUT // POLL_INTERVAL):  # 60s / 5s = 12
        time.sleep(POLL_INTERVAL)
        inbox = BUS.read_inbox(name)
        if inbox:
            messages.append({"role": "user",
                "content": f"<inbox>{inbox}</inbox>"})
            return True
        unclaimed = scan_unclaimed_tasks()
        if unclaimed:
            claim_task(unclaimed[0]["id"], name)
            messages.append({"role": "user",
                "content": f"<auto-claimed>Task #{unclaimed[0]['id']}: "
                           f"{unclaimed[0]['subject']}</auto-claimed>"})
            return True
    return False  # timeout -> shutdown
```

3. Сканирование доски задач: ищем `pending`, без владельца и без блокировок.

```python
def scan_unclaimed_tasks() -> list:
    unclaimed = []
    for f in sorted(TASKS_DIR.glob("task_*.json")):
        task = json.loads(f.read_text())
        if (task.get("status") == "pending"
                and not task.get("owner")
                and not task.get("blockedBy")):
            unclaimed.append(task)
    return unclaimed
```

4. Повторная инъекция идентичности: если сообщений слишком мало, значит, скорее всего, сработал compact, и агенту нужно напомнить, кто он.

```python
if len(messages) <= 3:
    messages.insert(0, {"role": "user",
        "content": f"<identity>You are '{name}', role: {role}, "
                   f"team: {team_name}. Continue your work.</identity>"})
    messages.insert(1, {"role": "assistant",
        "content": f"I am {name}. Continuing."})
```

## Что изменилось относительно s10

| Компонент | Было (s10) | Стало (s11) |
|-----------|------------|-------------|
| Инструменты | 12 | 14 (`+idle`, `+claim_task`) |
| Автономность | лидер раздаёт работу | самоорганизация |
| Фаза ожидания | отсутствует | опрос входящего ящика и доски задач |
| Захват задач | только вручную | автозахват свободных задач |
| Идентичность | только системный промпт | + повторное внедрение после compact |
| Тайм-аут | отсутствует | 60 секунд простоя -> автозавершение |

## Попробуйте

```sh
cd learn-claude-code
python agents/s11_autonomous_agents.py
```

1. `Создай на доске 3 задачи, затем заспавнь alice и bob. Посмотри, как они сами их заберут.`
2. `Заспавнь напарника-coder и позволь ему самому найти работу на доске задач`
3. `Создай задачи с зависимостями и посмотри, как напарники соблюдают порядок блокировок`
4. `Введи /tasks, чтобы посмотреть доску задач с владельцами`
5. `Введи /team, чтобы увидеть, кто сейчас работает, а кто простаивает`
