export interface ScenarioRuOverride {
  title?: string;
  description?: string;
  steps?: Array<{
    content?: string;
    annotation?: string;
  }>;
}

export const SCENARIO_RU_OVERRIDES: Record<string, ScenarioRuOverride> = {
  s02: {
    title: `Инструменты`,
    description: `Агент работает с инструментами чтения, записи, правки и bash`,
    steps: [
      {
        content: `Добавь функцию greet(name) в hello.py`,
        annotation: `Пользователь просит изменить код`,
      },
      {
        content: `Сначала прочитаю текущий файл.`,
        annotation: `Модель выбирает read_file вместо cat через bash`,
      },
      {
        content: `hello.py`,
        annotation: `Отдельный инструмент чтения даёт более чистый доступ к файлу`,
      },
      {
        content: `print("Hello, World!")`,
        annotation: `Содержимое файла возвращается модели`,
      },
      {
        content: `hello.py
---
def greet(name):
    print(f"Hello, {name}!")

greet("World")`,
        annotation: `write_file заменяет содержимое файла целиком`,
      },
      {
        content: `Файл успешно записан`,
        annotation: `Запись подтверждена`,
      },
      {
        content: `Я обновил hello.py: добавил функцию greet(name), которая принимает имя как параметр.`,
        annotation: `4 инструмента лучше 1: у каждого есть чёткая и узкая роль`,
      },
    ],
  },
  s03: {
    title: `План задач`,
    description: `Агент создаёт видимый план до начала выполнения`,
    steps: [
      {
        content: `Собери CLI-калькулятор с операциями add, subtract, multiply, divide`,
        annotation: `Многошаговая задача, которой помогает явное планирование`,
      },
      {
        content: `[
  { "id": 1, "task": "Создать calc.py с разбором аргументов", "status": "in_progress" },
  { "id": 2, "task": "Реализовать 4 операции", "status": "pending" },
  { "id": 3, "task": "Добавить обработку ошибок", "status": "pending" },
  { "id": 4, "task": "Проверить все операции", "status": "pending" }
]`,
        annotation: `TodoManager создаёт видимый план ДО того, как будет написан код`,
      },
      {
        content: `Список задач создан: 4 пункта`,
        annotation: `План теперь виден и его можно отслеживать`,
      },
      {
        content: `calc.py
---
import sys

def calculate(op, a, b):
    ops = {'+': a+b, '-': a-b, '*': a*b, '/': a/b}
    return ops.get(op, 'Unknown operator')

if __name__ == '__main__':
    a, op, b = float(sys.argv[1]), sys.argv[2], float(sys.argv[3])
    print(calculate(op, a, b))`,
        annotation: `Выполняются задачи #1 и #2: создаём файл и операции`,
      },
      {
        content: `Файл успешно записан`,
        annotation: `Код записан`,
      },
      {
        content: `python calc.py 10 + 5`,
        annotation: `Выполняется задача #4: тестирование`,
      },
      {
        content: `15.0`,
        annotation: `Тест проходит`,
      },
      {
        content: `Калькулятор собран и проверен. Все 4 операции работают корректно.`,
        annotation: `Видимый план повышает качество выполнения, потому что прогресс можно отслеживать`,
      },
    ],
  },
  s04: {
    title: `Субагенты`,
    description: `Агент порождает субагента для изолированного выполнения подзадачи`,
    steps: [
      {
        content: `Сделай рефакторинг калькулятора: раздели его на модули и добавь тесты`,
        annotation: `Сложная задача, подходящая для делегирования`,
      },
      {
        content: `Тесты я делегирую субагенту, а сам займусь рефакторингом.`,
        annotation: `Агент решает разделить работу через инструмент Task`,
      },
      {
        content: `Напиши unit-тесты для calc.py, покрыв все 4 операции и крайние случаи вроде деления на ноль`,
        annotation: `Task запускает субагента с собственным изолированным контекстом`,
      },
      {
        content: `[Субагент запущен] Контекст: свежий messages[], те же инструменты, ограниченный промпт`,
        annotation: `Субагент получает чистый контекст и не путается в разговоре родителя`,
      },
      {
        content: `Создан test_calc.py с 8 тест-кейсами. Все проходят.`,
        annotation: `Субагент завершает работу и возвращает родителю краткую сводку`,
      },
      {
        content: `calc.py -> calc/operations.py, calc/cli.py`,
        annotation: `Родитель продолжает свою часть работы: рефакторинг`,
      },
      {
        content: `Файлы успешно записаны`,
        annotation: `Модули разделены`,
      },
      {
        content: `Я разделил код на calc/operations.py и calc/cli.py. Тесты написал субагент, и они все проходят.`,
        annotation: `Изоляция контекста не даёт разным задачам смешиваться`,
      },
    ],
  },
  s05: {
    title: `Навыки`,
    description: `Агент подгружает внешние знания из файлов SKILL.md`,
    steps: [
      {
        content: `Создай новый проект Next.js с TypeScript`,
        annotation: `Задача требует знаний о конкретном фреймворке`,
      },
      {
        content: `[Загрузчик навыков] Ищу файлы SKILL.md... Найдено: nextjs.SKILL.md`,
        annotation: `Загрузчик навыков находит подходящий навык до запуска основного цикла`,
      },
      {
        content: `[Навык подключён] nextjs.SKILL.md -> добавлено сообщение tool_result`,
        annotation: `Содержимое навыка попадает в tool_result, а не раздувает системный промпт`,
      },
      {
        content: `У меня есть знания по настройке Next.js. Давайте создам структуру проекта.`,
        annotation: `Модель получила знания о фреймворке из файла навыка`,
      },
      {
        content: `npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir`,
        annotation: `Используем знания из навыка для правильных флагов`,
      },
      {
        content: `Успех! Создан my-app в /workspace/my-app`,
        annotation: `Проект создан с корректной конфигурацией`,
      },
      {
        content: `Проект Next.js создан с TypeScript, Tailwind CSS, ESLint, App Router и директорией src/.`,
        annotation: `Навыки приходят через tool_result, а не через системный промпт, поэтому контекст остаётся компактным`,
      },
    ],
  },
  s06: {
    title: `Сжатие контекста`,
    description: `Агент сжимает контекст, когда число токенов подходит к порогу`,
    steps: [
      {
        content: `Проанализируй все Python-файлы в этом проекте и кратко опиши каждый`,
        annotation: `Задача, которая породит очень большой контекст`,
      },
      {
        content: `find . -name '*.py' -type f`,
        annotation: `Ищем все файлы для анализа`,
      },
      {
        content: `./src/main.py
./src/utils.py
./src/models.py
./tests/test_main.py
... (ещё 28 файлов)`,
        annotation: `Найдено 32 файла: чтение их всех сильно раздует контекст`,
      },
      {
        content: `Я буду читать и разбирать каждый файл по порядку.`,
        annotation: `Агент начинает обрабатывать файлы один за другим`,
      },
      {
        content: `./src/main.py`,
        annotation: `Читаем файл 1 из 32...`,
      },
      {
        content: `[..., 450 строк кода ...]`,
        annotation: `Большой фрагмент содержимого добавлен в messages[]`,
      },
      {
        content: `[ContextManager] Число токенов: 148,231 / порог 150,000
Запуск трёхслойного сжатия:
  1. Убрать содержимое tool_result > 1000 символов -> заменить сводкой
  2. Объединить последовательные ответы ассистента
  3. Сжать старейшие 50% разговора в сводку
Результат: 148,231 -> 42,087 токенов`,
        annotation: `Сжатие автоматически срабатывает при приближении к лимиту`,
      },
      {
        content: `Продолжаю анализ уже со сжатым контекстом. Файлы 1-18 сведены в краткую сводку, перехожу к оставшимся.`,
        annotation: `Забывая старые tool_result, агент может работать сколь угодно долго`,
      },
    ],
  },
  s08: {
    title: `Фоновые задачи`,
    description: `Агент выполняет долгие задачи в фоновых потоках`,
    steps: [
      {
        content: `Запусти тесты и, пока они идут, исправь lint-ошибки`,
        annotation: `Две задачи, которые можно выполнять параллельно`,
      },
      {
        content: `Запущу тесты в фоне и параллельно поправлю lint.`,
        annotation: `Агент видит возможность для конкурентного выполнения`,
      },
      {
        content: `pytest tests/ -v --timeout=300`,
        annotation: `Менеджер фоновых задач создаёт поток для долгого прогона тестов`,
      },
      {
        content: `[Менеджер фоновых задач] Поток запущен: task_001
Выполняется: pytest tests/ -v --timeout=300
Статус: in_progress`,
        annotation: `Поток работает независимо, а основной цикл продолжается`,
      },
      {
        content: `Фоновая задача запущена: task_001`,
        annotation: `Управление сразу возвращается агенту`,
      },
      {
        content: `ruff check --fix .`,
        annotation: `Пока тесты идут в фоне, агент исправляет lint`,
      },
      {
        content: `Исправлено 12 lint-ошибок в 5 файлах`,
        annotation: `Lint исправляется параллельно с тестами`,
      },
      {
        content: `[Уведомление] Фоновая задача task_001 завершена
Результат: 47 тестов прошли, 2 упали
Проблемные тесты: test_auth.py::test_token_expiry, test_api.py::test_rate_limit`,
        annotation: `Фоновый поток уведомляет основной цикл через очередь уведомлений`,
      },
      {
        content: `Lint уже исправлен. Тесты завершились: 47 прошли, 2 упали. Теперь починю падающие тесты.`,
        annotation: `Неблокирующее выполнение через потоки и очередь позволяет реально работать параллельно`,
      },
    ],
  },
  s09: {
    title: `Команды агентов`,
    description: `Постоянные напарники общаются через JSONL-входящие ящики`,
    steps: [
      {
        content: `Собери полноценное приложение: фронтенд на React, бэкенд на Python, плюс тесты`,
        annotation: `Крупная задача, требующая командной работы`,
      },
      {
        content: `spawn_teammate(
  name: "frontend-dev",
  role: "специалист по React"
)
spawn_teammate(
  name: "backend-dev",
  role: "специалист по Python API"
)`,
        annotation: `В отличие от субагентов из s04, напарники живут дольше одной задачи`,
      },
      {
        content: `[Менеджер напарников] Команда создана:
  .team/config.json записан
  frontend-dev [idle] - собственный поток, собственный цикл агента
  backend-dev [idle] - собственный поток, собственный цикл агента`,
        annotation: `Каждый напарник крутит свой цикл while(tool_use) в отдельном потоке`,
      },
      {
        content: `send_message(
  to: "backend-dev",
  content: "Собери пользовательское API: GET/POST /users"
)`,
        annotation: `Сообщение дописывается в .team/inbox/backend-dev.jsonl`,
      },
      {
        content: `[backend-dev] Проверка входящего ящика... 1 новое сообщение
  От: lead
  Содержимое: "Собери пользовательское API: GET/POST /users"
  (входящий ящик очищен после чтения)`,
        annotation: `Входящий ящик работает по схеме read-then-clear и не даёт обработать одно и то же дважды`,
      },
      {
        content: `[backend-dev -> frontend-dev] Ответ через входящий ящик:
  "API готово: GET /users, POST /users, GET /users/:id"
  Записано в .team/inbox/frontend-dev.jsonl`,
        annotation: `Напарники пишут друг другу через тот же самый JSONL-механизм`,
      },
      {
        content: `Команда общается через файловые входящие ящики. У каждого напарника свой .jsonl-файл: для отправки туда дописывают строки, для чтения файл дренируется.`,
        annotation: `JSONL-входящие ящики развязывают время отправителя и время получателя`,
      },
    ],
  },
  s10: {
    title: `Протоколы команды`,
    description: `Протоколы «запрос-ответ» для shutdown и согласования плана`,
    steps: [
      {
        content: `Работа закончена. Аккуратно останови команду.`,
        annotation: `Нельзя просто убить потоки: нужна согласованная остановка`,
      },
      {
        content: `shutdown_request(
  teammate: "backend-dev",
  request_id: "req_abc123"
)`,
        annotation: `Идентификатор запроса связывает запрос и ответ`,
      },
      {
        content: `[Shutdown FSM] req_abc123: pending
  Lead -> inbox backend-dev:
  { type: "shutdown_request", request_id: "req_abc123" }`,
        annotation: `FSM отслеживает состояния: pending -> approved | rejected`,
      },
      {
        content: `[backend-dev] Получен shutdown request req_abc123
  Текущая задача: нет (idle)
  Решение: approve
  -> inbox lead: { type: "shutdown_response", request_id: "req_abc123", approve: true }`,
        annotation: `Teammate сам решает, можно ли подтвердить остановку, исходя из своего состояния`,
      },
      {
        content: `[Shutdown FSM] req_abc123: approved
  Поток backend-dev остановлен
  Статус: idle -> shutdown`,
        annotation: `Тот же паттерн с идентификатором запроса подходит и для согласования плана`,
      },
      {
        content: `backend-dev завершён корректно. Та же связка request_id + FSM подходит и для одобрения плана: напарник отправляет план, лидер подтверждает или отклоняет его по тому же request_id.`,
        annotation: `Один паттерн корреляции, два применения: shutdown и согласование плана`,
      },
    ],
  },
  s11: {
    title: `Автономные агенты`,
    description: `Напарники самоорганизуются через idle-циклы и автозахват задач`,
    steps: [
      {
        content: `Реализуй весь бэклог фич`,
        annotation: `Открытая задача для автономной командной работы`,
      },
      {
        content: `create_tasks([
  { title: "Аутентификация пользователя", status: "open" },
  { title: "Dashboard UI", status: "open" },
  { title: "Ограничение rate limit для API", status: "open" },
  { title: "Интеграционные тесты", status: "open" }
])`,
        annotation: `Задачи создаются без владельца и доступны для автозахвата`,
      },
      {
        content: `Создано 4 задачи на общей доске`,
        annotation: `Неназначенные задачи видны всем teammate`,
      },
      {
        content: `[frontend-dev] Сработал idle-цикл
  1. Проверить входящий ящик -> 0 сообщений
  2. Опросить доску задач -> найдена ничья задача #2 "Dashboard UI"
  3. Автоматически захватить задачу #2
  4. Статус: idle -> working`,
        annotation: `Idle-цикл: проверить входящий ящик, опросить задачи, автоматически захватить задачу и продолжить работу`,
      },
      {
        content: `[backend-dev] Сработал idle-цикл
  1. Проверить входящий ящик -> 0 сообщений
  2. Опросить доску задач -> найдена ничья задача #1 "Аутентификация пользователя"
  3. Автоматически захватить задачу #1
  4. Статус: idle -> working`,
        annotation: `Несколько напарников могут параллельно разобрать разные задачи`,
      },
      {
        content: `[tester] Сработал idle-цикл
  1. Проверить входящий ящик -> 0 сообщений
  2. Опросить доску задач -> задача #4 заблокирована #1, #2, #3
  3. Нет доступных для захвата задач
  4. Статус: idle (повторная попытка через 30 с)`,
        annotation: `Периодический polling по таймауту не даёт устроить busy-wait`,
      },
      {
        content: `Команда самоорганизуется: frontend-dev взял Dashboard UI, backend-dev взял аутентификацию. Tester ждёт, пока снимутся зависимости.`,
        annotation: `Опрос по таймауту делает напарников автономными без микроменеджмента`,
      },
    ],
  },
  s12: {
    title: `Изоляция задач и рабочих деревьев`,
    description: `Общая доска задач плюс опциональные полосы рабочих деревьев для чистого параллельного выполнения`,
    steps: [
      {
        content: `Параллельно выполни рефакторинг auth и обновления login UI`,
        annotation: `Две активные задачи в одном рабочем каталоге начнут конфликтовать`,
      },
      {
        content: `task_create(subject: "Рефакторинг auth")
task_create(subject: "Полировка login UI")`,
        annotation: `Общая доска остаётся единственным источником правды для координации`,
      },
      {
        content: `worktree_create(name: "auth-refactor", task_id: 1)
worktree_create(name: "ui-login")
task_bind_worktree(task_id: 2, worktree: "ui-login")`,
        annotation: `Выделение полосы и привязку задачи можно комбинировать: задача 2 привязывается уже после создания полосы`,
      },
      {
        content: `worktree.create.before/after emitted
.tasks/task_1.json -> { status: "in_progress", worktree: "auth-refactor" }
.tasks/task_2.json -> { status: "in_progress", worktree: "ui-login" }
.worktrees/index.json updated`,
        annotation: `Состояние контура управления остаётся каноничным, а hook-подобные потребители могут реагировать на события жизненного цикла, не становясь источником истины`,
      },
      {
        content: `worktree_run(name: "auth-refactor", command: "pytest tests/auth -q")
worktree_run(name: "ui-login", command: "npm test -- login")`,
        annotation: `В этой учебной среде команды маршрутизируются через cwd, привязанный к полосе; в других рантаймах это может быть переключение директории на уровне сессии. Инвариант один: контекст выполнения должен быть явным.`,
      },
      {
        content: `worktree_keep(name: "ui-login")
worktree_remove(name: "auth-refactor", complete_task: true)
worktree_events(limit: 10)`,
        annotation: `Закрытие работы оформляется явным переходом состояния через инструменты: можно смешать keep/remove и тут же запросить события жизненного цикла`,
      },
      {
        content: `worktree.keep emitted for ui-login
worktree.remove.before/after emitted for auth-refactor
task.completed emitted for #1
.worktrees/events.jsonl appended`,
        annotation: `Переходы жизненного цикла становятся явными записями, а файлы задач и рабочих деревьев по-прежнему остаются источником истины`,
      },
      {
        content: `Доска задач отвечает за координацию, рабочие деревья — за изоляцию. Параллельные дорожки остаются чистыми и проверяемыми.`,
        annotation: `Координируемся на одной доске, изолируемся по полосам только там, где это действительно нужно, а побочные механизмы политики и аудита вешаем на события жизненного цикла`,
      },
    ],
  },
};
