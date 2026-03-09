# s03: План задач

`s01 > s02 > [ s03 ] s04 > s05 > s06 | s07 > s08 > s09 > s10 > s11 > s12`

> *"Агент без плана быстро начинает блуждать"* — сначала перечисли шаги, потом выполняй.

## Проблема

На многошаговых задачах модель теряет нить. Она повторяет уже сделанное, пропускает шаги или уходит в сторону. В длинных диалогах это усиливается: системный промпт постепенно тонет в результатах инструментов. Рефакторинг из 10 шагов может пройти шаги 1-3, а потом модель начнёт импровизировать, потому что забыла пункты 4-10.

## Решение

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> | Tools   |
| prompt |      |       |      | + todo  |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
                          |
              +-----------+-----------+
              | TodoManager state     |
              | [ ] task A            |
              | [>] task B  <- doing  |
              | [x] task C            |
              +-----------------------+
                          |
              if rounds_since_todo >= 3:
                inject <reminder> into tool_result
```

## Как это работает

1. `TodoManager` хранит элементы со статусами. Только один элемент одновременно может быть `in_progress`.

```python
class TodoManager:
    def update(self, items: list) -> str:
        validated, in_progress_count = [], 0
        for item in items:
            status = item.get("status", "pending")
            if status == "in_progress":
                in_progress_count += 1
            validated.append({"id": item["id"], "text": item["text"],
                              "status": status})
        if in_progress_count > 1:
            raise ValueError("Only one task can be in_progress")
        self.items = validated
        return self.render()
```

2. Инструмент `todo` подключается в карту диспетчеризации так же, как и любой другой.

```python
TOOL_HANDLERS = {
    # ...base tools...
    "todo": lambda **kw: TODO.update(kw["items"]),
}
```

3. Если модель 3 и более раунда не вызывает `todo`, в контекст подмешивается напоминание.

```python
if rounds_since_todo >= 3 and messages:
    last = messages[-1]
    if last["role"] == "user" and isinstance(last.get("content"), list):
        last["content"].insert(0, {
            "type": "text",
            "text": "<reminder>Update your todos.</reminder>",
        })
```

Ограничение «только один `in_progress`» заставляет модель фокусироваться последовательно. Напоминание создаёт ощущение внешней подотчётности.

## Что изменилось относительно s02

| Компонент | Было (s02) | Стало (s03) |
|-----------|------------|-------------|
| Инструменты | 4 | 5 (`+todo`) |
| Планирование | нет | `TodoManager` со статусами |
| Напоминание | нет | `<reminder>` после 3 раундов |
| Цикл агента | простой dispatch | `+ rounds_since_todo` counter |

## Попробуйте

```sh
cd learn-claude-code
python agents/s03_todo_write.py
```

1. `Отрефактори файл hello.py: добавь type hints, docstring и main guard`
2. `Создай Python-пакет с __init__.py, utils.py и tests/test_utils.py`
3. `Проверь все Python-файлы и исправь стилевые проблемы`
