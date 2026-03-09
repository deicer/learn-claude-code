# s05: Навыки

`s01 > s02 > s03 > s04 > [ s05 ] s06 | s07 > s08 > s09 > s10 > s11 > s12`

> *"Подгружай знания по мере необходимости, а не заранее"* — знания подмешиваются через `tool_result`, а не через системный промпт заранее.

## Проблема

Вы хотите, чтобы агент соблюдал доменные процессы: git-конвенции, паттерны тестирования, чеклисты код-ревью. Если сложить всё это в системный промпт, вы сожжёте кучу токенов на навыки, которые в конкретной задаче вообще не пригодятся. 10 навыков по 2000 токенов каждый — это 20 000 токенов, большая часть которых в текущем запросе просто лишняя.

## Решение

```
Системный промпт (Слой 1 — всегда присутствует):
+--------------------------------------+
| Ты агент по работе с кодом.          |
| Доступные навыки:                    |
|   - git: Помощники по git-процессу   |  ~100 токенов/навык
|   - test: Практики тестирования      |
+--------------------------------------+

Когда модель вызывает load_skill("git"):
+--------------------------------------+
| tool_result (Слой 2 — по запросу):   |
| <skill name="git">                   |
|   Полные инструкции по git...        |  ~2000 токенов
|   Шаг 1: ...                         |
| </skill>                             |
+--------------------------------------+
```

Слой 1: в системном промпте лежат только *имена* навыков, это дёшево.  
Слой 2: *полное содержимое* навыка приходит через `tool_result`, только когда оно реально нужно.

## Как это работает

1. Каждый навык — это директория с файлом `SKILL.md` и YAML frontmatter.

```
skills/
  pdf/
    SKILL.md       # ---\n name: pdf\n description: Process PDF files\n ---\n ...
  code-review/
    SKILL.md       # ---\n name: code-review\n description: Review code\n ---\n ...
```

2. `SkillLoader` сканирует `SKILL.md` и использует имя директории как идентификатор навыка.

```python
class SkillLoader:
    def __init__(self, skills_dir: Path):
        self.skills = {}
        for f in sorted(skills_dir.rglob("SKILL.md")):
            text = f.read_text()
            meta, body = self._parse_frontmatter(text)
            name = meta.get("name", f.parent.name)
            self.skills[name] = {"meta": meta, "body": body}

    def get_descriptions(self) -> str:
        lines = []
        for name, skill in self.skills.items():
            desc = skill["meta"].get("description", "")
            lines.append(f"  - {name}: {desc}")
        return "\n".join(lines)

    def get_content(self, name: str) -> str:
        skill = self.skills.get(name)
        if not skill:
            return f"Error: Unknown skill '{name}'."
        return f"<skill name=\"{name}\">\n{skill['body']}\n</skill>"
```

3. Слой 1 идёт в системный промпт. Слой 2 — это ещё один обычный обработчик инструмента.

```python
SYSTEM = f"""Ты агент по работе с кодом в {WORKDIR}.
Доступные навыки:
{SKILL_LOADER.get_descriptions()}"""

TOOL_HANDLERS = {
    # ...base tools...
    "load_skill": lambda **kw: SKILL_LOADER.get_content(kw["name"]),
}
```

Модель знает, какие навыки вообще доступны, но тянет полный текст только по необходимости.

## Что изменилось относительно s04

| Компонент | Было (s04) | Стало (s05) |
|-----------|------------|-------------|
| Инструменты | 5 (base + task) | 5 (base + `load_skill`) |
| Системный промпт | статическая строка | + описания навыков |
| Знания | отсутствуют | `skills/*/SKILL.md` |
| Инъекция | отсутствует | двухслойная: system + tool_result |

## Попробуйте

```sh
cd learn-claude-code
python agents/s05_skill_loading.py
```

1. `Какие навыки доступны?`
2. `Загрузи навык agent-builder и следуй его инструкциям`
3. `Мне нужен code review — сначала загрузи подходящий навык`
4. `Собери MCP-сервер с помощью навыка mcp-builder`
