# s07: Система задач

`s01 > s02 > s03 > s04 > s05 > s06 | [ s07 ] s08 > s09 > s10 > s11 > s12`

> *"Разбей большую цель на маленькие задачи, упорядочь их и сохрани на диск"* — файловый граф задач с зависимостями становится фундаментом для мультиагентной координации.

## Проблема

`TodoManager` из s03 — это плоский чеклист в памяти: без порядка, без зависимостей и почти без состояний. Но реальные цели имеют структуру: задача B зависит от A, задачи C и D можно делать параллельно, а задача E ждёт завершения и C, и D.

Если связи между задачами не выражены явно, агент не понимает:

- что уже готово к выполнению;
- что заблокировано;
- что можно делать параллельно.

А поскольку список живёт только в памяти, сжатие контекста из s06 просто его сотрёт.

## Решение

Поднимаем чеклист до **графа задач**, который хранится на диске. Каждая задача — отдельный JSON-файл со статусом, зависимостями (`blockedBy`) и обратными связями (`blocks`). Такой граф в любой момент отвечает на три вопроса:

- **Что готово?** — задачи со статусом `pending` и пустым `blockedBy`.
- **Что заблокировано?** — задачи, ожидающие незавершённых зависимостей.
- **Что уже завершено?** — `completed` задачи, которые автоматически разблокируют зависящие от них.

```
.tasks/
  task_1.json  {"id":1, "status":"completed"}
  task_2.json  {"id":2, "blockedBy":[1], "status":"pending"}
  task_3.json  {"id":3, "blockedBy":[1], "status":"pending"}
  task_4.json  {"id":4, "blockedBy":[2,3], "status":"pending"}

Граф задач (DAG):
                 +----------+
            +--> | task 2   | --+
            |    | pending  |   |
+----------+     +----------+    +--> +----------+
| task 1   |                          | task 4   |
| completed| --> +----------+    +--> | blocked  |
+----------+     | task 3   | --+     +----------+
                 | pending  |
                 +----------+

Порядок:       task 1 должна завершиться раньше 2 и 3
Параллелизм:   tasks 2 и 3 могут идти одновременно
Зависимости:   task 4 ждёт и 2, и 3
Статусы:       pending -> in_progress -> completed
```

Этот граф задач становится опорной структурой для всего, что идёт после s07: фоновые задачи (s08), команды агентов (s09+) и изоляция через рабочие деревья (s12) читают и пишут в одну и ту же систему.

## Как это работает

1. **TaskManager**: один JSON-файл на задачу, CRUD и граф зависимостей.

```python
class TaskManager:
    def __init__(self, tasks_dir: Path):
        self.dir = tasks_dir
        self.dir.mkdir(exist_ok=True)
        self._next_id = self._max_id() + 1

    def create(self, subject, description=""):
        task = {"id": self._next_id, "subject": subject,
                "status": "pending", "blockedBy": [],
                "blocks": [], "owner": ""}
        self._save(task)
        self._next_id += 1
        return json.dumps(task, indent=2)
```

2. **Разрешение зависимостей**: завершение задачи убирает её ID из `blockedBy` у всех остальных, автоматически разблокируя зависимые задачи.

```python
def _clear_dependency(self, completed_id):
    for f in self.dir.glob("task_*.json"):
        task = json.loads(f.read_text())
        if completed_id in task.get("blockedBy", []):
            task["blockedBy"].remove(completed_id)
            self._save(task)
```

3. **Переходы статусов и wiring зависимостей**: `update` обрабатывает переходы и связи.

```python
def update(self, task_id, status=None,
           add_blocked_by=None, add_blocks=None):
    task = self._load(task_id)
    if status:
        task["status"] = status
        if status == "completed":
            self._clear_dependency(task_id)
    self._save(task)
```

4. В карте диспетчеризации появляется четыре инструмента для задач.

```python
TOOL_HANDLERS = {
    # ...base tools...
    "task_create": lambda **kw: TASKS.create(kw["subject"]),
    "task_update": lambda **kw: TASKS.update(kw["task_id"], kw.get("status")),
    "task_list":   lambda **kw: TASKS.list_all(),
    "task_get":    lambda **kw: TASKS.get(kw["task_id"]),
}
```

Начиная с s07, для многошаговой работы граф задач становится стандартом. План задач из s03 остаётся удобным вариантом для коротких односеансовых чеклистов.

## Что изменилось относительно s06

| Компонент | Было (s06) | Стало (s07) |
|-----------|------------|-------------|
| Инструменты | 5 | 8 (`task_create/update/list/get`) |
| Модель планирования | плоский чеклист в памяти | граф задач с зависимостями на диске |
| Связи | отсутствуют | рёбра `blockedBy` и `blocks` |
| Статусы | сделано / не сделано | `pending` -> `in_progress` -> `completed` |
| Постоянство | теряется при compact | переживает compact и рестарты |

## Попробуйте

```sh
cd learn-claude-code
python agents/s07_task_system.py
```

1. `Создай 3 задачи: "Подготовить проект", "Написать код", "Написать тесты". Свяжи их зависимостями по порядку.`
2. `Покажи все задачи и граф их зависимостей`
3. `Заверши задачу 1, а затем снова покажи список задач, чтобы увидеть разблокировку задачи 2`
4. `Создай доску задач для рефакторинга: parse -> transform -> emit -> test, где transform и emit могут идти параллельно после parse`
