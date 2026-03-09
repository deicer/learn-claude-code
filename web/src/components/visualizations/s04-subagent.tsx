"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useLocale } from "@/lib/i18n";

interface MessageBlock {
  id: string;
  label: string;
  color: string;
}

interface SubagentCopy {
  title: string;
  parentBaseMessages: MessageBlock[];
  taskPrompt: MessageBlock;
  childWorkMessages: MessageBlock[];
  summaryBlock: MessageBlock;
  steps: { title: string; description: string }[];
  parentProcess: string;
  childProcess: string;
  messagesFresh: string;
  notSpawned: string;
  cleanContext: string;
  isolation: string;
  compressing: string;
  discarded: string;
  taskPromptChip: string;
  summaryChip: string;
}

const COPY: Record<string, SubagentCopy> = {
  en: {
    title: "Subagent Context Isolation",
    parentBaseMessages: [
      { id: "p1", label: "user: Build login + tests", color: "bg-blue-500" },
      { id: "p2", label: "assistant: Planning approach...", color: "bg-zinc-600" },
      { id: "p3", label: "tool_result: project structure", color: "bg-emerald-500" },
    ],
    taskPrompt: { id: "task", label: "task: Write unit tests for auth", color: "bg-purple-500" },
    childWorkMessages: [
      { id: "c1", label: "tool_use: read auth.ts", color: "bg-amber-500" },
      { id: "c2", label: "tool_use: write test.ts", color: "bg-amber-500" },
    ],
    summaryBlock: { id: "summary", label: "summary: 3 tests written, all passing", color: "bg-teal-500" },
    steps: [
      { title: "Parent Context", description: "The parent agent has accumulated messages from the conversation." },
      { title: "Spawn Subagent", description: "Task tool creates a child with fresh messages[]. Only the task description is passed." },
      { title: "Independent Work", description: "The child has its own context. It doesn't see the parent's history." },
      { title: "Compress Result", description: "The child's full conversation compresses into one summary." },
      { title: "Return Summary", description: "Only the summary returns. The child's full context is discarded." },
      { title: "Clean Context", description: "The parent gets a clean summary without context bloat. This is fresh-context isolation via messages[]." },
    ],
    parentProcess: "Parent Process",
    childProcess: "Child Process",
    messagesFresh: "messages[] (fresh)",
    notSpawned: "not yet spawned",
    cleanContext: "3 original + 1 summary = clean context",
    isolation: "ISOLATION",
    compressing: "Compressing full context into summary...",
    discarded: "context discarded",
    taskPromptChip: "task prompt",
    summaryChip: "summary",
  },
  ru: {
    title: "Изоляция контекста сабагента",
    parentBaseMessages: [
      { id: "p1", label: "user: Собрать логин + тесты", color: "bg-blue-500" },
      { id: "p2", label: "assistant: Планирую подход...", color: "bg-zinc-600" },
      { id: "p3", label: "tool_result: структура проекта", color: "bg-emerald-500" },
    ],
    taskPrompt: { id: "task", label: "task: Написать unit-тесты для auth", color: "bg-purple-500" },
    childWorkMessages: [
      { id: "c1", label: "tool_use: read auth.ts", color: "bg-amber-500" },
      { id: "c2", label: "tool_use: write test.ts", color: "bg-amber-500" },
    ],
    summaryBlock: { id: "summary", label: "summary: написаны 3 теста, всё проходит", color: "bg-teal-500" },
    steps: [
      { title: "Контекст родителя", description: "Родительский агент уже накопил сообщения из разговора." },
      { title: "Запуск сабагента", description: "Инструмент Task создаёт дочернего агента со свежим messages[]. Передаётся только описание задачи." },
      { title: "Независимая работа", description: "У дочернего агента свой собственный контекст. Историю родителя он не видит." },
      { title: "Сжать результат", description: "Весь диалог дочернего агента сжимается в одну сводку." },
      { title: "Вернуть сводку", description: "Назад возвращается только сводка. Полный контекст дочернего агента выбрасывается." },
      { title: "Чистый контекст", description: "Родитель получает чистую сводку без раздувания контекста. Это и есть изоляция через свежий messages[]." },
    ],
    parentProcess: "Родительский процесс",
    childProcess: "Дочерний процесс",
    messagesFresh: "messages[] (свежий)",
    notSpawned: "ещё не запущен",
    cleanContext: "3 исходных + 1 сводка = чистый контекст",
    isolation: "ИЗОЛЯЦИЯ",
    compressing: "Сжимаем полный контекст в сводку...",
    discarded: "контекст отброшен",
    taskPromptChip: "описание задачи",
    summaryChip: "сводка",
  },
};

export default function SubagentIsolation({ title }: { title?: string }) {
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

  // Derive what to show in each container based on step
  const parentMessages: MessageBlock[] = (() => {
    const base = [...copy.parentBaseMessages];
    if (currentStep >= 5) {
      base.push(copy.summaryBlock);
    }
    return base;
  })();

  const childMessages: MessageBlock[] = (() => {
    if (currentStep < 1) return [];
    if (currentStep === 1) return [copy.taskPrompt];
    if (currentStep === 2) return [copy.taskPrompt, ...copy.childWorkMessages];
    if (currentStep === 3) return [copy.summaryBlock];
    return currentStep >= 4 ? [copy.taskPrompt, ...copy.childWorkMessages] : [];
  })();

  const showChildEmpty = currentStep === 0;
  const showArcToChild = currentStep === 1;
  const showCompression = currentStep === 3;
  const showArcToParent = currentStep === 4;
  const childDiscarded = currentStep >= 4;
  const childFaded = currentStep >= 4;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || copy.title}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
        style={{ minHeight: 500 }}
      >
        {/* Main layout: two containers side by side */}
        <div className="relative flex gap-4" style={{ minHeight: 340 }}>
          {/* Parent Process Container */}
          <div className="flex-1 rounded-xl border-2 border-blue-300 bg-blue-50/50 p-4 dark:border-blue-700 dark:bg-blue-950/20">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {copy.parentProcess}
              </span>
            </div>
            <div className="mb-2 font-mono text-xs text-zinc-400">
              messages[]
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {parentMessages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.4, delay: msg.id === "summary" ? 0.3 : 0 }}
                    className={`rounded-lg px-3 py-2 text-xs font-medium text-white shadow-sm ${msg.color}`}
                  >
                    {msg.label}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {currentStep >= 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-3 rounded border border-blue-200 bg-white/60 px-2 py-1 text-center text-xs text-blue-600 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
              >
                {copy.cleanContext}
              </motion.div>
            )}
          </div>

          {/* Isolation Wall */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-full w-px border-l-2 border-dashed border-zinc-300 dark:border-zinc-600" />
            <motion.div
              animate={{
                opacity: currentStep >= 1 && currentStep <= 4 ? 1 : 0.4,
              }}
              className="rounded bg-zinc-200 px-2 py-1 text-center font-mono text-[10px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {copy.isolation}
            </motion.div>
            <div className="h-full w-px border-l-2 border-dashed border-zinc-300 dark:border-zinc-600" />
          </div>

          {/* Child Process Container */}
          <div
            className={`flex-1 rounded-xl border-2 p-4 transition-colors duration-300 ${
              showChildEmpty
                ? "border-dashed border-zinc-300 bg-zinc-50/50 dark:border-zinc-600 dark:bg-zinc-800/30"
                : childDiscarded
                  ? "border-zinc-300 bg-zinc-100/50 dark:border-zinc-600 dark:bg-zinc-800/40"
                  : "border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/20"
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  showChildEmpty
                    ? "bg-zinc-300 dark:bg-zinc-600"
                    : childDiscarded
                      ? "bg-zinc-400 dark:bg-zinc-500"
                      : "bg-purple-500"
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  showChildEmpty
                    ? "text-zinc-400 dark:text-zinc-500"
                    : childDiscarded
                      ? "text-zinc-400 dark:text-zinc-500"
                      : "text-purple-700 dark:text-purple-300"
                }`}
              >
                {copy.childProcess}
              </span>
            </div>
            <div className="mb-2 font-mono text-xs text-zinc-400">
              {copy.messagesFresh}
            </div>

            {showChildEmpty && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700"
              >
                <span className="text-xs text-zinc-400">
                  {copy.notSpawned}
                </span>
              </motion.div>
            )}

            <div className="space-y-2">
              <AnimatePresence>
                {childMessages.map((msg) => (
                  <motion.div
                    key={msg.id + "-child"}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: childFaded ? 0.3 : 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.4 }}
                    className={`rounded-lg px-3 py-2 text-xs font-medium text-white shadow-sm ${msg.color}`}
                  >
                    {msg.label}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {showCompression && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-center text-xs text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300"
              >
                {copy.compressing}
              </motion.div>
            )}

            {childDiscarded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 rounded border border-red-200 bg-red-50 px-2 py-1 text-center text-xs text-red-500 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              >
                {copy.discarded}
              </motion.div>
            )}
          </div>

          {/* Animated arcs: task prompt going from parent to child */}
          <AnimatePresence>
            {showArcToChild && (
              <motion.div
                initial={{ opacity: 0, x: "20%", y: "-10%" }}
                animate={{ opacity: 1, x: "55%", y: "-10%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="pointer-events-none absolute left-0 top-0"
                style={{ zIndex: 10 }}
              >
                <div className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                  {copy.taskPromptChip}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showArcToParent && (
              <motion.div
                initial={{ opacity: 0, x: "75%", y: "60%" }}
                animate={{ opacity: 1, x: "15%", y: "60%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="pointer-events-none absolute left-0 top-0"
                style={{ zIndex: 10 }}
              >
                <div className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
                  {copy.summaryChip}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
