# s12: Изоляция задач и рабочих деревьев

`s01 > s02 > s03 > s04 > s05 > s06 | s07 > s08 > s09 > s10 > s11 > [ s12 ]`

> *"Каждый работает в своей директории и никому не мешает"* — задачи управляют целями, рабочие деревья управляют каталогами, а связываются через ID.

## Проблема

К s11 агенты уже умеют автоматически забирать и завершать задачи. Но все задачи всё ещё выполняются в одной общей директории. Если два агента одновременно рефакторят разные модули, они начнут сталкиваться: агент A редактирует `config.py`, агент B тоже редактирует `config.py`, unstaged changes смешиваются, а откатить это чисто уже нельзя.

Доска задач знает *что* нужно сделать, но ничего не говорит о том, *где* это делать. Исправление — дать каждой задаче собственную директорию `git worktree`. Задачи управляют целями, рабочие деревья — контекстом выполнения. Связка идёт по ID задачи.

## Решение

```
Контур управления (.tasks/)         Контур выполнения (.worktrees/)
+------------------+                +------------------------+
| task_1.json      |                | auth-refactor/         |
|   status: in_progress  <------>   branch: wt/auth-refactor
|   worktree: "auth-refactor"   |   task_id: 1             |
+------------------+                +------------------------+
| task_2.json      |                | ui-login/              |
|   status: pending    <------>     branch: wt/ui-login
|   worktree: "ui-login"       |   task_id: 2             |
+------------------+                +------------------------+
                                    |
                          index.json (реестр worktree)
                          events.jsonl (журнал жизненного цикла)

Машины состояний:
  Задача:   pending -> in_progress -> completed
  Worktree: absent  -> active      -> removed | kept
```

## Как это работает

1. **Создаём задачу.** Сначала сохраняем цель.

```python
TASKS.create("Implement auth refactor")
# -> .tasks/task_1.json  status=pending  worktree=""
```

2. **Создаём worktree и привязываем к задаче.** Если передать `task_id`, задача автоматически перейдёт в `in_progress`.

```python
WORKTREES.create("auth-refactor", task_id=1)
# -> git worktree add -b wt/auth-refactor .worktrees/auth-refactor HEAD
# -> новая запись в index.json, а task_1.json получает worktree="auth-refactor"
```

Привязка обновляет состояние с обеих сторон:

```python
def bind_worktree(self, task_id, worktree):
    task = self._load(task_id)
    task["worktree"] = worktree
    if task["status"] == "pending":
        task["status"] = "in_progress"
    self._save(task)
```

3. **Выполняем команды внутри worktree.** `cwd` указывает на изолированную директорию.

```python
subprocess.run(command, shell=True, cwd=worktree_path,
               capture_output=True, text=True, timeout=300)
```

4. **Закрытие работы.** Есть два варианта:

- `worktree_keep(name)` — сохранить директорию на потом.
- `worktree_remove(name, complete_task=True)` — удалить директорию, завершить связанную задачу и сгенерировать событие. Один вызов закрывает и окружение, и задачу.

```python
def remove(self, name, force=False, complete_task=False):
    self._run_git(["worktree", "remove", wt["path"]])
    if complete_task and wt.get("task_id") is not None:
        self.tasks.update(wt["task_id"], status="completed")
        self.tasks.unbind_worktree(wt["task_id"])
        self.events.emit("task.completed", ...)
```

5. **Поток событий.** Каждый шаг жизненного цикла дописывается в `.worktrees/events.jsonl`:

```json
{
  "event": "worktree.remove.after",
  "task": {"id": 1, "status": "completed"},
  "worktree": {"name": "auth-refactor", "status": "removed"},
  "ts": 1730000000
}
```

Генерируемые события: `worktree.create.before/after/failed`, `worktree.remove.before/after/failed`, `worktree.keep`, `task.completed`.

После падения процесса состояние восстанавливается по `.tasks/` и `.worktrees/index.json` на диске. Память разговора эфемерна, файловое состояние — долговечно.

## Что изменилось относительно s11

| Компонент | Было (s11) | Стало (s12) |
|-----------|------------|-------------|
| Координация | доска задач (`owner/status`) | доска задач + явная привязка к worktree |
| Область выполнения | общая директория | изолированная директория на задачу |
| Восстановление | только статус задач | статус задач + индекс рабочих деревьев |
| Закрытие | завершение задачи | завершение задачи + явный `keep/remove` |
| Наблюдаемость жизненного цикла | неявно через логи | явные события в `.worktrees/events.jsonl` |

## Попробуйте

```sh
cd learn-claude-code
python agents/s12_worktree_task_isolation.py
```

1. `Создай задачи для backend auth и frontend login page, затем покажи список задач`
2. `Создай worktree "auth-refactor" для задачи 1, а затем привяжи задачу 2 к новому worktree "ui-login"`
3. `Запусти "git status --short" внутри worktree "auth-refactor"`
4. `Сохрани worktree "ui-login", затем покажи список worktree и проверь события`
5. `Удали worktree "auth-refactor" с complete_task=true, затем покажи задачи, worktree и события`
