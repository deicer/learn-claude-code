# s08: Фоновые задачи

`s01 > s02 > s03 > s04 > s05 > s06 | s07 > [ s08 ] s09 > s10 > s11 > s12`

> *"Медленные операции можно увести в фон, пока агент думает дальше"* — демон-потоки запускают команды в фоне и подмешивают уведомления по завершении.

## Проблема

Некоторые команды работают минутами: `npm install`, `pytest`, `docker build`. В блокирующем цикле модель просто сидит и ждёт. Если пользователь говорит «установи зависимости и пока это идёт, создай config-файл», агент выполняет это последовательно, а не параллельно.

## Решение

```
Основной поток             Фоновый поток
+-----------------+        +-----------------+
| цикл агента     |        | идёт subprocess |
| ...             |        | ...             |
| [вызов LLM] <---+------ | enqueue(result) |
|  ^слив очереди  |       +-----------------+
+-----------------+

Линия времени:
Агент --[спавн A]--[спавн B]--[другая работа]----
             |          |
             v          v
          [A идёт]   [B идёт]      (параллельно)
             |          |
             +-- результаты подмешиваются перед следующим вызовом LLM --+
```

## Как это работает

1. `BackgroundManager` хранит задачи и потокобезопасную очередь уведомлений.

```python
class BackgroundManager:
    def __init__(self):
        self.tasks = {}
        self._notification_queue = []
        self._lock = threading.Lock()
```

2. `run()` запускает демон-поток и сразу возвращает управление.

```python
def run(self, command: str) -> str:
    task_id = str(uuid.uuid4())[:8]
    self.tasks[task_id] = {"status": "running", "command": command}
    thread = threading.Thread(
        target=self._execute, args=(task_id, command), daemon=True)
    thread.start()
    return f"Background task {task_id} started"
```

3. Когда subprocess завершается, результат попадает в очередь уведомлений.

```python
def _execute(self, task_id, command):
    try:
        r = subprocess.run(command, shell=True, cwd=WORKDIR,
            capture_output=True, text=True, timeout=300)
        output = (r.stdout + r.stderr).strip()[:50000]
    except subprocess.TimeoutExpired:
        output = "Error: Timeout (300s)"
    with self._lock:
        self._notification_queue.append({
            "task_id": task_id, "result": output[:500]})
```

4. Перед каждым вызовом LLM агент опустошает очередь уведомлений.

```python
def agent_loop(messages: list):
    while True:
        notifs = BG.drain_notifications()
        if notifs:
            notif_text = "\n".join(
                f"[bg:{n['task_id']}] {n['result']}" for n in notifs)
            messages.append({"role": "user",
                "content": f"<background-results>\n{notif_text}\n"
                           f"</background-results>"})
            messages.append({"role": "assistant",
                "content": "Noted background results."})
        response = client.messages.create(...)
```

Сам агентный цикл остаётся однопоточным. В параллель уходит только I/O подзадач и subprocess.

## Что изменилось относительно s07

| Компонент | Было (s07) | Стало (s08) |
|-----------|------------|-------------|
| Инструменты | 8 | 6 (base + `background_run` + `check`) |
| Выполнение | только блокирующее | блокирующее + фоновые потоки |
| Уведомления | отсутствуют | очередь очищается на каждом цикле |
| Параллельность | отсутствует | демон-потоки |

## Попробуйте

```sh
cd learn-claude-code
python agents/s08_background_tasks.py
```

1. `Запусти "sleep 5 && echo done" в фоне, а пока он работает, создай файл`
2. `Стартуй 3 фоновые задачи: "sleep 2", "sleep 4", "sleep 6". Затем проверь их статус.`
3. `Запусти pytest в фоне и продолжай параллельно делать другие вещи`
