# s04: Субагенты

`s01 > s02 > s03 > [ s04 ] s05 > s06 | s07 > s08 > s09 > s10 > s11 > s12`

> *"Разбивай крупную работу на части; каждой подзадаче — чистый контекст"* — у каждой подзадачи свой независимый `messages[]`, поэтому основной диалог не захламляется.

## Проблема

Пока агент работает, массив `messages` растёт. Каждое чтение файла, каждый вывод bash остаётся в контексте навсегда. На вопрос «Какой тестовый фреймворк использует этот проект?» может понадобиться прочитать 5 файлов, но родительскому агенту нужен только ответ: `pytest`.

## Решение

```
Родительский агент                 Субагент
+------------------+              +------------------+
| messages=[...]   |              | messages=[]      | <-- чистый старт
|                  |  dispatch    |                  |
| tool: task       | -----------> | while tool_use:  |
|   prompt="..."   |              |   call tools     |
|                  |  сводка      |   append results |
|   result = "..." | <----------- | return last text |
+------------------+              +------------------+

Контекст родителя остаётся чистым. Контекст субагента выбрасывается.
```

## Как это работает

1. Родитель получает инструмент `task`. Дочерний агент получает все базовые инструменты, кроме `task`, чтобы не было рекурсивного бесконтрольного спавна.

```python
PARENT_TOOLS = CHILD_TOOLS + [
    {"name": "task",
     "description": "Spawn a subagent with fresh context.",
     "input_schema": {
         "type": "object",
         "properties": {"prompt": {"type": "string"}},
         "required": ["prompt"],
     }},
]
```

2. Субагент стартует с `messages=[]` и крутит свой отдельный цикл. Родителю возвращается только финальный текст.

```python
def run_subagent(prompt: str) -> str:
    sub_messages = [{"role": "user", "content": prompt}]
    for _ in range(30):  # safety limit
        response = client.messages.create(
            model=MODEL, system=SUBAGENT_SYSTEM,
            messages=sub_messages,
            tools=CHILD_TOOLS, max_tokens=8000,
        )
        sub_messages.append({"role": "assistant",
                             "content": response.content})
        if response.stop_reason != "tool_use":
            break
        results = []
        for block in response.content:
            if block.type == "tool_use":
                handler = TOOL_HANDLERS.get(block.name)
                output = handler(**block.input)
                results.append({"type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(output)[:50000]})
        sub_messages.append({"role": "user", "content": results})
    return "".join(
        b.text for b in response.content if hasattr(b, "text")
    ) or "(нет сводки)"
```

Вся история дочернего агента, включая десятки tool call, выбрасывается. Родитель получает один абзац сводки как обычный `tool_result`.

## Что изменилось относительно s03

| Компонент | Было (s03) | Стало (s04) |
|-----------|------------|-------------|
| Инструменты | 5 | 5 базовых + `task` у родителя |
| Контекст | один общий | изоляция родителя и ребёнка |
| Субагент | отсутствует | функция `run_subagent()` |
| Возвращаемое значение | N/A | только текст сводки |

## Попробуйте

```sh
cd learn-claude-code
python agents/s04_subagent.py
```

1. `Используй подзадачу, чтобы выяснить, какой тестовый фреймворк использует этот проект`
2. `Делегируй чтение всех .py-файлов и верни краткое описание каждого`
3. `Через task создай новый модуль, а затем проверь его отсюда`
