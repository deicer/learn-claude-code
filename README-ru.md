[English](./README.md) | [中文](./README-zh.md) | [日本語](./README-ja.md) | [Русский](./README-ru.md)
# Learn Claude Code -- собираем nano-агента в стиле Claude Code с нуля
<img width="260" src="https://github.com/user-attachments/assets/fe8b852b-97da-4061-a467-9694906b5edf" /><br>

Сканируйте QR-код в WeChat, чтобы подписаться на нас,  
или подпишитесь в X: [shareAI-Lab](https://x.com/baicai003)

```
                    THE AGENT PATTERN
                    =================

    User --> messages[] --> LLM --> response
                                      |
                            stop_reason == "tool_use"?
                           /                          \
                         yes                           no
                          |                             |
                    execute tools                    return text
                    append results
                    loop back -----------------> messages[]


    Это минимальный цикл. Он нужен любому AI-агенту для программирования.
    В продакшене поверх него добавляются политики, разрешения и жизненный цикл.
```

**12 последовательных сессий: от простого цикла до изолированного автономного выполнения.**  
**Каждая сессия добавляет ровно один механизм. У каждого механизма есть свой девиз.**

> **s01** &nbsp; *"One loop & Bash is all you need"* — один инструмент + один цикл = агент
>
> **s02** &nbsp; *"Adding a tool means adding one handler"* — цикл не меняется; новые инструменты просто регистрируются в dispatch map
>
> **s03** &nbsp; *"An agent without a plan drifts"* — сначала перечисли шаги, потом выполняй; доля завершённых задач резко растёт
>
> **s04** &nbsp; *"Break big tasks down; each subtask gets a clean context"* — субагенты используют отдельный `messages[]`, поэтому основной диалог остаётся чистым
>
> **s05** &nbsp; *"Load knowledge when you need it, not upfront"* — знания подмешиваются через `tool_result`, а не заранее через system prompt
>
> **s06** &nbsp; *"Context will fill up; you need a way to make room"* — трёхслойное сжатие контекста позволяет вести бесконечные сессии
>
> **s07** &nbsp; *"Break big goals into small tasks, order them, persist to disk"* — файловый граф задач с зависимостями закладывает основу для мультиагентной координации
>
> **s08** &nbsp; *"Run slow operations in the background; the agent keeps thinking"* — долгие операции уходят в фон, а агент продолжает мыслить дальше
>
> **s09** &nbsp; *"When the task is too big for one, delegate to teammates"* — постоянные напарники + асинхронные почтовые ящики
>
> **s10** &nbsp; *"Teammates need shared communication rules"* — один паттерн request-response покрывает все переговоры
>
> **s11** &nbsp; *"Teammates scan the board and claim tasks themselves"* — напарники сами смотрят на доску задач и забирают работу
>
> **s12** &nbsp; *"Each works in its own directory, no interference"* — задачи управляют целями, worktree управляют каталогами, связь держится на ID

---

## Базовый паттерн

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({"role": "assistant",
                         "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

Каждая следующая сессия добавляет поверх этого цикла ещё один механизм, не меняя сам цикл.

## Область проекта

Этот репозиторий — учебный проект формата 0→1 по сборке mini/nano-агента в стиле Claude Code.  
Ради ясной обучающей траектории здесь намеренно упрощены или опущены некоторые продакшен-механизмы:

- полноценные event/hook-шины, например `PreToolUse`, `SessionStart/End`, `ConfigChange`  
  В `s12` есть только минимальный append-only поток lifecycle-событий для обучения.
- rule-based система разрешений и trust-workflows
- контроль жизненного цикла сессий (`resume`/`fork`) и более полный lifecycle worktree
- полные детали runtime MCP: transport, OAuth, subscribe/poll ресурсов

Считайте JSONL mailbox-протокол команды в этом репозитории учебной реализацией, а не утверждением о внутренностях какого-либо конкретного продакшен-агента.

## Быстрый старт

```sh
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt
cp .env.example .env   # Отредактируйте .env и добавьте свой ANTHROPIC_API_KEY

python agents/s01_agent_loop.py       # Начинайте отсюда
python agents/s12_worktree_task_isolation.py  # Полная конечная точка прогрессии
python agents/s_full.py               # Итоговая версия: все механизмы вместе
```

### Веб-платформа

Интерактивные визуализации, пошаговые схемы, просмотр исходников и документация.

```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

## Учебный путь

```
Этап 1: ЦИКЛ                       Этап 2: ПЛАНИРОВАНИЕ И ЗНАНИЯ
==================                 =================================
s01  The Agent Loop        [1]     s03  TodoWrite               [5]
     while + stop_reason                TodoManager + напоминание
     |                                  |
     +-> s02  Tool Use          [4]     s04  Subagents            [5]
              dispatch map: name->handler   отдельный messages[] на каждого дочернего агента
                                            |
                                       s05  Skills               [5]
                                            SKILL.md через tool_result
                                            |
                                       s06  Context Compact      [5]
                                            трёхслойное сжатие

Этап 3: ПОСТОЯНСТВО                 Этап 4: КОМАНДЫ
==================                 ============================
s07  Tasks                 [8]     s09  Agent Teams            [9]
     файловый CRUD + граф зависимостей  напарники + JSONL inbox
     |                                  |
s08  Background Tasks      [6]     s10  Team Protocols         [12]
     фоновые потоки + очередь уведомлений  shutdown + approval FSM
                                        |
                                   s11  Autonomous Agents      [14]
                                        idle-cycle + auto-claim
                                   |
                                   s12  Worktree Isolation     [16]
                                        координация задач + изолированные каталоги выполнения

                                   [N] = число инструментов
```

## Архитектура

```
learn-claude-code/
|
|-- agents/                        # Python-реализации по шагам (s01-s12 + итоговый s_full)
|-- docs/{en,zh,ja,ru}/            # Документация с упором на ментальные модели (4 языка)
|-- web/                           # Интерактивная учебная платформа (Next.js)
|-- skills/                        # Skill-файлы для s05
+-- .github/workflows/ci.yml       # CI: typecheck + build
```

## Документация

Формат с упором на ментальные модели: проблема, решение, ASCII-схема, минимальный код.  
Доступно на [English](./docs/en/) | [中文](./docs/zh/) | [日本語](./docs/ja/) | [Русский](./docs/ru/).

| Сессия | Тема | Девиз |
|--------|------|-------|
| [s01](./docs/ru/s01-the-agent-loop.md) | Цикл агента | *One loop & Bash is all you need* |
| [s02](./docs/ru/s02-tool-use.md) | Инструменты | *Adding a tool means adding one handler* |
| [s03](./docs/ru/s03-todo-write.md) | TodoWrite | *An agent without a plan drifts* |
| [s04](./docs/ru/s04-subagent.md) | Субагенты | *Break big tasks down; each subtask gets a clean context* |
| [s05](./docs/ru/s05-skill-loading.md) | Skills | *Load knowledge when you need it, not upfront* |
| [s06](./docs/ru/s06-context-compact.md) | Сжатие контекста | *Context will fill up; you need a way to make room* |
| [s07](./docs/ru/s07-task-system.md) | Система задач | *Break big goals into small tasks, order them, persist to disk* |
| [s08](./docs/ru/s08-background-tasks.md) | Фоновые задачи | *Run slow operations in the background; the agent keeps thinking* |
| [s09](./docs/ru/s09-agent-teams.md) | Команды агентов | *When the task is too big for one, delegate to teammates* |
| [s10](./docs/ru/s10-team-protocols.md) | Командные протоколы | *Teammates need shared communication rules* |
| [s11](./docs/ru/s11-autonomous-agents.md) | Автономные агенты | *Teammates scan the board and claim tasks themselves* |
| [s12](./docs/ru/s12-worktree-task-isolation.md) | Изоляция worktree и задач | *Each works in its own directory, no interference* |

## Что дальше: от понимания к реальному использованию

После этих 12 сессий вы будете понимать устройство агента изнутри. Применить это знание можно двумя путями:

### Kode Agent CLI -- Open-Source CLI для coding-агента

> `npm i -g @shareai-lab/kode`

Поддержка Skill и LSP, готовность к Windows, подключение GLM / MiniMax / DeepSeek и других открытых моделей. Установили и пользуетесь.

GitHub: **[shareAI-lab/Kode-cli](https://github.com/shareAI-lab/Kode-cli)**

### Kode Agent SDK -- встраивайте агентные возможности в своё приложение

Официальный Claude Code Agent SDK под капотом общается с полноценным CLI-процессом: на каждого параллельного пользователя нужен отдельный терминальный процесс. Kode SDK — это отдельная библиотека без per-user process overhead, которую можно встраивать в бэкенды, расширения браузера, embedded-устройства и другие окружения.

GitHub: **[shareAI-lab/Kode-agent-sdk](https://github.com/shareAI-lab/Kode-agent-sdk)**

---

## Репозиторий-сестра: от *сессий по запросу* к *постоянно работающему ассистенту*

Агент из этого репозитория — модель **использовал и закрыл**: открыли терминал, дали задачу, завершили работу, следующая сессия стартует с пустого контекста. Так устроена модель Claude Code.

[OpenClaw](https://github.com/openclaw/openclaw) показал другой вариант: поверх того же agent core достаточно двух механизмов, чтобы агент превратился из «подтолкни и он шевельнётся» в «сам просыпается каждые 30 секунд и проверяет, нет ли работы»:

- **Heartbeat** — каждые 30 секунд система отправляет агенту сообщение и просит проверить, есть ли что делать. Ничего нет? Спит дальше. Есть? Действует сразу.
- **Cron** — агент может сам планировать будущие задачи и автоматически выполнять их в нужный момент.

Добавьте маршрутизацию по IM-каналам (WhatsApp / Telegram / Slack / Discord, 13+ платформ), постоянную память контекста и систему личности Soul — и агент превратится из одноразового инструмента в всегда включённого персонального AI-ассистента.

**[claw0](https://github.com/shareAI-lab/claw0)** — наш сопутствующий учебный репозиторий, который разбирает эти механизмы с нуля:

```
claw agent = agent core + heartbeat + cron + IM chat + memory + soul
```

```
learn-claude-code                   claw0
(ядро рантайма агента:              (активный always-on ассистент:
 цикл, инструменты, планирование,    heartbeat, cron, IM-каналы,
 команды, изоляция worktree)         память, личность soul)
```

## Лицензия

MIT

---

**Модель и есть агент. Наша работа — дать ей инструменты и не мешать.**
