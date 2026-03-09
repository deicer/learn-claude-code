# s09: Команды агентов

`s01 > s02 > s03 > s04 > s05 > s06 | s07 > s08 > [ s09 ] s10 > s11 > s12`

> *"Когда задача слишком велика для одного, делегируй её напарникам"* — постоянные напарники и асинхронные почтовые ящики.

## Проблема

Субагенты из s04 — одноразовые: создали, поработали, вернули сводку, умерли. У них нет личности, нет памяти между вызовами. Фоновые задачи из s08 умеют запускать shell-команды, но не принимают LLM-управляемые решения.

Для настоящей командной работы нужны:

1. постоянные агенты, живущие дольше одного запроса;
2. идентичность и управление жизненным циклом;
3. канал связи между агентами.

## Решение

```
Жизненный цикл напарника:
  запуск -> РАБОТАЕТ -> ОЖИДАНИЕ -> РАБОТАЕТ -> ... -> ЗАВЕРШЕНИЕ

Коммуникация:
  .team/
    config.json           <- состав команды + статусы
    inbox/
      alice.jsonl         <- append-only, drain-on-read
      bob.jsonl
      lead.jsonl

              +--------+    send("alice","bob","...")    +--------+
              | alice  | -----------------------------> |  bob   |
              | loop   |    bob.jsonl << {json_line}    |  loop  |
              +--------+                                +--------+
                   ^                                         |
                   |        BUS.read_inbox("alice")          |
                   +---- alice.jsonl -> read + drain ---------+
```

## Как это работает

1. `TeammateManager` поддерживает `config.json` со списком участников команды.

```python
class TeammateManager:
    def __init__(self, team_dir: Path):
        self.dir = team_dir
        self.dir.mkdir(exist_ok=True)
        self.config_path = self.dir / "config.json"
        self.config = self._load_config()
        self.threads = {}
```

2. `spawn()` создаёт нового участника и запускает его агентный цикл в отдельном потоке.

```python
def spawn(self, name: str, role: str, prompt: str) -> str:
    member = {"name": name, "role": role, "status": "working"}
    self.config["members"].append(member)
    self._save_config()
    thread = threading.Thread(
        target=self._teammate_loop,
        args=(name, role, prompt), daemon=True)
    thread.start()
    return f"Spawned teammate '{name}' (role: {role})"
```

3. `MessageBus` использует append-only JSONL-входящий ящик. `send()` дописывает строку, `read_inbox()` читает всё и очищает файл.

```python
class MessageBus:
    def send(self, sender, to, content, msg_type="message", extra=None):
        msg = {"type": msg_type, "from": sender,
               "content": content, "timestamp": time.time()}
        if extra:
            msg.update(extra)
        with open(self.dir / f"{to}.jsonl", "a") as f:
            f.write(json.dumps(msg) + "\n")

    def read_inbox(self, name):
        path = self.dir / f"{name}.jsonl"
        if not path.exists(): return "[]"
        msgs = [json.loads(l) for l in path.read_text().strip().splitlines() if l]
        path.write_text("")  # drain
        return json.dumps(msgs, indent=2)
```

4. Каждый напарник перед каждым LLM-вызовом проверяет входящий ящик и добавляет новые сообщения в контекст.

```python
def _teammate_loop(self, name, role, prompt):
    messages = [{"role": "user", "content": prompt}]
    for _ in range(50):
        inbox = BUS.read_inbox(name)
        if inbox != "[]":
            messages.append({"role": "user",
                "content": f"<inbox>{inbox}</inbox>"})
            messages.append({"role": "assistant",
                "content": "Noted inbox messages."})
        response = client.messages.create(...)
        if response.stop_reason != "tool_use":
            break
        # execute tools, append results...
    self._find_member(name)["status"] = "idle"
```

## Что изменилось относительно s08

| Компонент | Было (s08) | Стало (s09) |
|-----------|------------|-------------|
| Инструменты | 6 | 9 (`+spawn/send/read_inbox`) |
| Агенты | один агент | lead + N напарников |
| Постоянство | отсутствует | `config.json` + JSONL-входящий ящик |
| Потоки | только фоновые команды | полноценный агентный цикл на поток |
| Жизненный цикл | fire-and-forget | `idle -> working -> idle` |
| Коммуникация | отсутствует | личные сообщения + broadcast |

## Попробуйте

```sh
cd learn-claude-code
python agents/s09_agent_teams.py
```

1. `Заспавнь alice как coder и bob как tester. Пусть alice отправит bob сообщение.`
2. `Разошли всем напарникам сообщение "status update: phase 1 complete"`
3. `Проверь, есть ли сообщения во входящем ящике лида`
4. `Введи /team, чтобы посмотреть состав команды и статусы`
5. `Введи /inbox, чтобы вручную проверить входящий ящик лидера`
