# s06: Сжатие контекста

`s01 > s02 > s03 > s04 > s05 > [ s06 ] | s07 > s08 > s09 > s10 > s11 > s12`

> *"Контекст всё равно заполнится; нужно уметь освобождать место"* — трёхслойная стратегия сжатия делает бесконечные сессии возможными.

## Проблема

Окно контекста конечно. Один `read_file` на файле в 1000 строк легко стоит ~4000 токенов. Прочитайте 30 файлов и выполните 20 bash-команд — и вы уже упрётесь в 100 000+ токенов. Без сжатия агент не сможет работать на больших кодовых базах.

## Решение

Три слоя, от самых мягких к самым агрессивным:

```
Каждый ход:
+------------------+
| Результат инструмента |
+------------------+
        |
        v
[Слой 1: микросжатие]           (тихо, каждый ход)
  Заменяет tool_result старше 3 ходов
  на "[Previous: used {tool_name}]"
        |
        v
[Проверка: токенов > 50000?]
   |               |
   no              yes
   |               |
   v               v
продолжить  [Слой 2: автосжатие]
              Сохраняет transcript в .transcripts/
              LLM делает сводку разговора.
              Все сообщения заменяются на [сводку].
                    |
                    v
            [Слой 3: инструмент сжатия]
              Модель сама вызывает compact.
              Используется та же сводка, что и в auto_compact.
```

## Как это работает

1. **Слой 1 — микросжатие (`micro_compact`)**: перед каждым вызовом LLM старые результаты инструментов заменяются заглушками.

```python
def micro_compact(messages: list) -> list:
    tool_results = []
    for i, msg in enumerate(messages):
        if msg["role"] == "user" and isinstance(msg.get("content"), list):
            for j, part in enumerate(msg["content"]):
                if isinstance(part, dict) and part.get("type") == "tool_result":
                    tool_results.append((i, j, part))
    if len(tool_results) <= KEEP_RECENT:
        return messages
    for _, _, part in tool_results[:-KEEP_RECENT]:
        if len(part.get("content", "")) > 100:
            part["content"] = f"[Previous: used {tool_name}]"
    return messages
```

2. **Слой 2 — автосжатие (`auto_compact`)**: когда оценка токенов превышает порог, полный transcript сохраняется на диск, после чего LLM просится сделать сводку.

```python
def auto_compact(messages: list) -> list:
    # Save transcript for recovery
    transcript_path = TRANSCRIPT_DIR / f"transcript_{int(time.time())}.jsonl"
    with open(transcript_path, "w") as f:
        for msg in messages:
            f.write(json.dumps(msg, default=str) + "\n")
    # LLM summarizes
    response = client.messages.create(
        model=MODEL,
        messages=[{"role": "user", "content":
            "Summarize this conversation for continuity..."
            + json.dumps(messages, default=str)[:80000]}],
        max_tokens=2000,
    )
    return [
        {"role": "user", "content": f"[Compressed]\n\n{response.content[0].text}"},
        {"role": "assistant", "content": "Understood. Continuing."},
    ]
```

3. **Слой 3 — ручной `compact`**: инструмент `compact` запускает то же сжатие по требованию.

4. Цикл объединяет все три слоя:

```python
def agent_loop(messages: list):
    while True:
        micro_compact(messages)                        # Layer 1
        if estimate_tokens(messages) > THRESHOLD:
            messages[:] = auto_compact(messages)       # Layer 2
        response = client.messages.create(...)
        # ... tool execution ...
        if manual_compact:
            messages[:] = auto_compact(messages)       # Layer 3
```

Полная история не исчезает безвозвратно: она просто уходит из активного контекста в transcripts на диске.

## Что изменилось относительно s05

| Компонент | Было (s05) | Стало (s06) |
|-----------|------------|-------------|
| Инструменты | 5 | 5 (base + `compact`) |
| Управление контекстом | отсутствует | трёхслойное сжатие |
| Микросжатие | отсутствует | старые результаты → placeholders |
| Автосжатие | отсутствует | срабатывает по порогу токенов |
| Transcripts | отсутствуют | сохраняются в `.transcripts/` |

## Попробуйте

```sh
cd learn-claude-code
python agents/s06_context_compact.py
```

1. `Прочитай по очереди каждый Python-файл в каталоге agents/`
2. `Продолжай читать файлы, пока сжатие не сработает автоматически`
3. `Используй инструмент compact, чтобы вручную сжать разговор`
