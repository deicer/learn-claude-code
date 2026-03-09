"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useLocale } from "@/lib/i18n";

interface SkillEntry {
  name: string;
  fullTokens: number;
}

const SKILLS: SkillEntry[] = [
  {
    name: "/commit",
    fullTokens: 320,
  },
  {
    name: "/review-pr",
    fullTokens: 480,
  },
  {
    name: "/test",
    fullTokens: 290,
  },
  {
    name: "/deploy",
    fullTokens: 350,
  },
];

const TOKEN_STATES = [120, 120, 440, 440, 780, 780];
const MAX_TOKEN_DISPLAY = 1000;

interface SkillLoadingCopy {
  title: string;
  systemPrompt: string;
  alwaysPresent: string;
  availableSkills: string;
  skillSummaries: string[];
  skillContent: string[][];
  userTypes: string;
  toolResult: string;
  mechanism: string;
  layer1: string;
  layer2: string;
  layer1Desc: string;
  layer2Desc: string;
  tokens: string;
  steps: { title: string; description: string }[];
}

const COPY: Record<string, SkillLoadingCopy> = {
  en: {
    title: "On-Demand Skill Loading",
    systemPrompt: "System Prompt",
    alwaysPresent: "always present",
    availableSkills: "# Available Skills",
    skillSummaries: [
      "Create git commits following repo conventions",
      "Review pull requests for bugs and style",
      "Run and analyze test suites",
      "Deploy application to target environment",
    ],
    skillContent: [
      [
        "1. Run git status + git diff to see changes",
        "2. Analyze all staged changes and draft message",
        "3. Create commit with Co-Authored-By trailer",
        "4. Run git status after commit to verify",
      ],
      [
        "1. Fetch PR diff via gh pr view",
        "2. Analyze changes file by file for issues",
        "3. Check for bugs, security, and style problems",
        "4. Post review comments with gh pr review",
      ],
      [
        "1. Detect test framework from package.json",
        "2. Run test suite and capture output",
        "3. Analyze failures and suggest fixes",
        "4. Re-run after applying fixes",
      ],
      [
        "1. Verify all tests pass before deploy",
        "2. Build production bundle",
        "3. Push to deployment target via CI",
        "4. Verify health check on deployed URL",
      ],
    ],
    userTypes: "User types:",
    toolResult: "tool_result",
    mechanism:
      "The Skill tool returns content as a tool_result message. The model sees it in context and follows the instructions. No system prompt bloat.",
    layer1: "LAYER 1",
    layer2: "LAYER 2",
    layer1Desc: "Always present, ~120 tokens",
    layer2Desc: "On demand, ~300-500 tokens each",
    tokens: "Tokens",
    steps: [
      { title: "Layer 1: Compact Summaries", description: "All skills are summarized in the system prompt. Compact, always present." },
      { title: "Skill Invocation", description: "The model recognizes a skill invocation and triggers the Skill tool." },
      { title: "Layer 2: Full Injection", description: "The full skill instructions are injected as a tool_result, not into the system prompt." },
      { title: "In Context Now", description: "The detailed instructions appear as if a tool returned them. The model follows them precisely." },
      { title: "Stack Skills", description: "Multiple skills can be loaded. Only summaries are permanent; full content comes and goes." },
      { title: "Two-Layer Architecture", description: "Layer 1: always present, tiny. Layer 2: loaded on demand, detailed. Elegant separation." },
    ],
  },
  ru: {
    title: "Загрузка навыков по требованию",
    systemPrompt: "Системный промпт",
    alwaysPresent: "всегда присутствует",
    availableSkills: "# Доступные навыки",
    skillSummaries: [
      "Создаёт git-коммиты по правилам репозитория",
      "Проверяет pull request на баги и стиль",
      "Запускает и анализирует тестовые наборы",
      "Деплоит приложение в целевое окружение",
    ],
    skillContent: [
      [
        "1. Запустить git status + git diff и посмотреть изменения",
        "2. Проанализировать staged-правки и набросать сообщение",
        "3. Создать коммит с trailer Co-Authored-By",
        "4. После коммита снова проверить git status",
      ],
      [
        "1. Получить diff PR через gh pr view",
        "2. Разобрать изменения по файлам и найти проблемы",
        "3. Проверить баги, безопасность и стиль",
        "4. Отправить комментарии через gh pr review",
      ],
      [
        "1. Определить тестовый фреймворк по package.json",
        "2. Запустить тесты и собрать вывод",
        "3. Разобрать падения и предложить исправления",
        "4. Повторно прогнать после правок",
      ],
      [
        "1. Убедиться, что перед деплоем все тесты проходят",
        "2. Собрать production-бандл",
        "3. Отправить в целевое окружение через CI",
        "4. Проверить health-check на задеплоенном URL",
      ],
    ],
    userTypes: "Пользователь вводит:",
    toolResult: "tool_result",
    mechanism:
      "Инструмент Skill возвращает содержимое как сообщение tool_result. Модель видит его в контексте и следует инструкциям. Системный промпт не раздувается.",
    layer1: "СЛОЙ 1",
    layer2: "СЛОЙ 2",
    layer1Desc: "Всегда в контексте, около 120 токенов",
    layer2Desc: "Подгружается по запросу, по 300-500 токенов",
    tokens: "Токены",
    steps: [
      { title: "Слой 1: компактные сводки", description: "Все навыки кратко перечислены в системном промпте. Коротко и постоянно." },
      { title: "Вызов навыка", description: "Модель распознаёт вызов навыка и активирует инструмент Skill." },
      { title: "Слой 2: полная подгрузка", description: "Полные инструкции навыка приходят как tool_result, а не живут в системном промпте." },
      { title: "Теперь это в контексте", description: "Подробные инструкции выглядят так, будто их вернул инструмент. Модель следует им буквально." },
      { title: "Стек навыков", description: "Можно подгружать несколько навыков. Постоянны только сводки, полный контент приходит и уходит." },
      { title: "Двухслойная архитектура", description: "Слой 1: всегда присутствует и мал. Слой 2: загружается по требованию и содержит детали." },
    ],
  },
};

export default function SkillLoading({ title }: { title?: string }) {
  const locale = useLocale();
  const copy = COPY[locale] || COPY.en;
  const {
    currentStep,
    totalSteps,
    next,
    prev,
    reset,
    isPlaying,
    toggleAutoPlay,
  } = useSteppedVisualization({ totalSteps: copy.steps.length, autoPlayInterval: 2500 });

  const tokenCount = TOKEN_STATES[currentStep];
  const highlightedSkill = currentStep >= 1 && currentStep <= 3 ? 0 : currentStep >= 4 ? 1 : -1;
  const showFirstContent = currentStep >= 2;
  const showSecondContent = currentStep >= 4;
  const firstContentFaded = currentStep >= 5;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || copy.title}
      </h2>

      <div
        className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
        style={{ minHeight: 500 }}
      >
        <div className="flex gap-6">
          {/* Main content area */}
          <div className="flex-1 space-y-4">
            {/* System Prompt Block */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-zinc-400" />
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {copy.systemPrompt}
                </span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:bg-zinc-800">
                  {copy.alwaysPresent}
                </span>
              </div>
              <div className="rounded-lg border border-zinc-300 bg-zinc-900 p-4 dark:border-zinc-600">
                <div className="mb-2 font-mono text-[10px] text-zinc-500">
                  {copy.availableSkills}
                </div>
                <div className="space-y-1.5">
                  {SKILLS.map((skill, i) => {
                    const isHighlighted = i === highlightedSkill;
                    return (
                      <motion.div
                        key={skill.name}
                        animate={{
                          boxShadow: isHighlighted
                            ? "0 0 12px 2px rgba(59, 130, 246, 0.5)"
                            : "0 0 0 0px rgba(59, 130, 246, 0)",
                        }}
                        transition={{ duration: 0.4 }}
                        className={`rounded px-3 py-1.5 font-mono text-xs transition-colors ${
                          isHighlighted
                            ? "bg-blue-900/60 text-blue-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        <span className="font-semibold text-zinc-200">
                          {skill.name}
                        </span>
                        {" - "}
                        {copy.skillSummaries[i]}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* User invocation indicator */}
            <AnimatePresence>
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30"
                >
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {copy.userTypes}
                  </span>
                  <code className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    /commit
                  </code>
                </motion.div>
              )}
              {currentStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30"
                >
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {copy.userTypes}
                  </span>
                  <code className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    /review-pr
                  </code>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connecting arrow */}
            <AnimatePresence>
              {(showFirstContent || showSecondContent) && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center"
                >
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-px bg-blue-400 dark:bg-blue-500" />
                    <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-400 dark:border-t-blue-500" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanded Skill Content Blocks */}
            <div className="space-y-3">
              <AnimatePresence>
                {showFirstContent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{
                      opacity: firstContentFaded ? 0.4 : 1,
                      height: "auto",
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg border-2 border-blue-300 bg-white p-4 dark:border-blue-700 dark:bg-zinc-800">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                            SKILL.md: /commit
                          </span>
                        </div>
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                          {copy.toolResult}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {copy.skillContent[0].map((line, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{
                              opacity: firstContentFaded ? 0.5 : 1,
                              x: 0,
                            }}
                            transition={{ delay: i * 0.08 }}
                            className="font-mono text-xs text-zinc-600 dark:text-zinc-300"
                          >
                            {line}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showSecondContent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg border-2 border-purple-300 bg-white p-4 dark:border-purple-700 dark:bg-zinc-800">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-purple-500" />
                          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                            SKILL.md: /review-pr
                          </span>
                        </div>
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[10px] text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">
                          {copy.toolResult}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {copy.skillContent[1].map((line, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="font-mono text-xs text-zinc-600 dark:text-zinc-300"
                          >
                            {line}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mechanism annotation on step 3 */}
            <AnimatePresence>
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                >
                  {copy.mechanism}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final overview label on step 5 */}
            <AnimatePresence>
              {currentStep === 5 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3"
                >
                  <div className="flex-1 rounded border border-zinc-200 bg-zinc-50 p-2 text-center dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                      {copy.layer1}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">
                      {copy.layer1Desc}
                    </div>
                  </div>
                  <div className="flex-1 rounded border border-blue-200 bg-blue-50 p-2 text-center dark:border-blue-700 dark:bg-blue-900/20">
                    <div className="text-[10px] font-semibold text-blue-500 dark:text-blue-400">
                      {copy.layer2}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">
                      {copy.layer2Desc}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Token Gauge (vertical bar on the right) */}
          <div className="flex w-16 flex-col items-center">
            <div className="mb-1 text-center font-mono text-[10px] text-zinc-400">
              {copy.tokens}
            </div>
            <div
              className="relative w-8 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
              style={{ height: 300 }}
            >
              <motion.div
                animate={{
                  height: `${(tokenCount / MAX_TOKEN_DISPLAY) * 100}%`,
                }}
                transition={{ duration: 0.5 }}
                className={`absolute bottom-0 w-full rounded-full ${
                  tokenCount > 600
                    ? "bg-amber-500"
                    : tokenCount > 300
                      ? "bg-blue-500"
                      : "bg-emerald-500"
                }`}
              />
            </div>
            <motion.div
              key={tokenCount}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="mt-2 text-center font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-300"
            >
              {tokenCount}
            </motion.div>
          </div>
        </div>

        {/* Step Controls */}
        <div className="mt-6">
          <StepControls
            currentStep={currentStep}
            totalSteps={totalSteps}
            onPrev={prev}
            onNext={next}
            onReset={reset}
            isPlaying={isPlaying}
            onToggleAutoPlay={toggleAutoPlay}
            stepTitle={copy.steps[currentStep].title}
            stepDescription={copy.steps[currentStep].description}
          />
        </div>
      </div>
    </section>
  );
}
