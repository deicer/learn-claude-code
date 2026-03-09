# s01: Цикл агента

`[ s01 ] s02 > s03 > s04 > s05 > s06 | s07 > s08 > s09 > s10 > s11 > s12`

> *"Одного цикла и Bash уже достаточно"* — один инструмент + один цикл = агент.

## Проблема

Языковая модель умеет рассуждать о коде, но не может *потрогать* реальный мир: читать файлы, запускать тесты, проверять ошибки. Без цикла каждый вызов инструмента требует вручную копировать результат обратно в диалог. Циклом становитесь вы.

## Решение

```
+--------+      +-------+      +---------+
|  User  | ---> |  LLM  | ---> |  Tool   |
| prompt |      |       |      | execute |
+--------+      +---+---+      +----+----+
                    ^                |
                    |   tool_result  |
                    +----------------+
                    (цикл, пока stop_reason == "tool_use")
```

Весь поток управления держится на одном условии выхода. Цикл работает, пока модель продолжает вызывать инструменты.

## Как это работает

1. Запрос пользователя становится первым сообщением.

```python
messages.append({"role": "user", "content": query})
```

2. Отправляем `messages` и описания инструментов в LLM.

```python
response = client.messages.create(
    model=MODEL, system=SYSTEM, messages=messages,
    tools=TOOLS, max_tokens=8000,
)
```

3. Добавляем ответ ассистента. Проверяем `stop_reason`: если модель не вызвала инструмент, работа закончена.

```python
messages.append({"role": "assistant", "content": response.content})
if response.stop_reason != "tool_use":
    return
```

4. Выполняем каждый вызов инструмента, собираем результаты и добавляем их как сообщение пользователя. Затем возвращаемся к шагу 2.

```python
results = []
for block in response.content:
    if block.type == "tool_use":
        output = run_bash(block.input["command"])
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": output,
        })
messages.append({"role": "user", "content": results})
```

Если собрать всё в одну функцию:

```python
def agent_loop(query):
    messages = [{"role": "user", "content": query}]
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = run_bash(block.input["command"])
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

Вот и весь агент меньше чем в 30 строк. Всё остальное в этом курсе наслоится сверху, не меняя сам цикл.

## Что изменилось

| Компонент | До | После |
|-----------|----|--------|
| Цикл агента | отсутствует | `while True` + `stop_reason` |
| Инструменты | отсутствуют | `bash` (один инструмент) |
| Сообщения | отсутствуют | накапливаемый список |
| Управление потоком | отсутствует | `stop_reason != "tool_use"` |

## Попробуйте

```sh
cd learn-claude-code
python agents/s01_agent_loop.py
```

1. `Создай файл hello.py, который печатает "Hello, World!"`
2. `Покажи все Python-файлы в этом каталоге`
3. `Какая сейчас активная git-ветка?`
4. `Создай каталог test_output и запиши в него 3 файла`
