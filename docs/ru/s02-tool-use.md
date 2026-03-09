# s02: Инструменты

`s01 > [ s02 ] s03 > s04 > s05 > s06 | s07 > s08 > s09 > s10 > s11 > s12`

> *"Добавить инструмент — значит добавить один обработчик"* — цикл остаётся тем же; новый инструмент означает новый обработчик в карте диспетчеризации.

## Проблема

Когда у агента есть только `bash`, он запускает shell для всего подряд. `cat` непредсказуемо обрезает вывод, `sed` ломается на спецсимволах, а каждый вызов bash становится широкой и слабо ограниченной поверхностью атаки. Специализированные инструменты вроде `read_file` и `write_file` позволяют навязать песочницу по путям на уровне самого инструмента.

Главная мысль: чтобы добавить инструмент, не нужно менять сам цикл.

## Решение

```
+--------+      +-------+      +------------------+
|  User  | ---> |  LLM  | ---> | Tool Dispatch    |
| prompt |      |       |      | {                |
+--------+      +---+---+      |   bash: run_bash |
                    ^           |   read: run_read |
                    |           |   write: run_wr  |
                    +-----------+   edit: run_edit |
                    tool_result | }                |
                                +------------------+

Карта диспетчеризации — это словарь: {tool_name: handler_function}.
Один lookup заменяет любую if/elif-цепочку.
```

## Как это работает

1. У каждого инструмента есть свой обработчик. Песочница по путям не даёт выйти за пределы рабочей директории.

```python
def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path

def run_read(path: str, limit: int = None) -> str:
    text = safe_path(path).read_text()
    lines = text.splitlines()
    if limit and limit < len(lines):
        lines = lines[:limit]
    return "\n".join(lines)[:50000]
```

2. Карта диспетчеризации связывает имена инструментов с обработчиками.

```python
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"],
                                        kw["new_text"]),
}
```

3. Внутри цикла мы просто находим обработчик по имени. Тело цикла не меняется со времён s01.

```python
for block in response.content:
    if block.type == "tool_use":
        handler = TOOL_HANDLERS.get(block.name)
        output = handler(**block.input) if handler \
            else f"Unknown tool: {block.name}"
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": output,
        })
```

Добавить инструмент = добавить обработчик + схему инструмента. Цикл остаётся нетронутым.

## Что изменилось относительно s01

| Компонент | Было (s01) | Стало (s02) |
|-----------|------------|-------------|
| Инструменты | 1 (`bash`) | 4 (`bash`, `read`, `write`, `edit`) |
| Диспетчеризация | жёсткий вызов `bash` | словарь `TOOL_HANDLERS` |
| Безопасность путей | нет | песочница через `safe_path()` |
| Цикл агента | без изменений | без изменений |

## Попробуйте

```sh
cd learn-claude-code
python agents/s02_tool_use.py
```

1. `Прочитай файл requirements.txt`
2. `Создай файл greet.py с функцией greet(name)`
3. `Отредактируй greet.py и добавь docstring к функции`
4. `Снова прочитай greet.py и проверь, что правка применилась`
