"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "@/components/visualizations/shared/step-controls";
import { useLocale } from "@/lib/i18n";

// -- Task definitions --

type TaskStatus = "pending" | "in_progress" | "done";

interface Task {
  id: number;
  label: string;
  status: TaskStatus;
}

// Nag timer value at each step (out of 3)
const NAG_TIMER_PER_STEP = [0, 1, 2, 3, 0, 0, 0];
const NAG_THRESHOLD = 3;

// Whether the nag fires at this step
const NAG_FIRES_PER_STEP = [false, false, false, true, false, false, false];

interface TodoWriteCopy {
  title: string;
  tasks: string[];
  stepInfo: { title: string; desc: string }[];
  statuses: Record<TaskStatus, string>;
  nagTimer: string;
  nagMessage: string;
  columns: {
    pending: string;
    inProgress: string;
    done: string;
  };
  progress: string;
  complete: string;
}

const COPY: Record<string, TodoWriteCopy> = {
  en: {
    title: "TodoWrite Nag System",
    tasks: [
      "Write auth tests",
      "Fix mobile layout",
      "Add error handling",
      "Update config loader",
    ],
    stepInfo: [
      { title: "The Plan", desc: "TodoWrite gives the model a visible plan. All tasks start as pending." },
      { title: "Round 1 -- Idle", desc: "The model does work but doesn't touch its todos. The nag counter increments." },
      { title: "Round 2 -- Still Idle", desc: "Two rounds without progress. Pressure builds." },
      { title: "NAG!", desc: "Threshold reached! System message injected: 'You have pending tasks. Pick one up now!'" },
      { title: "Task Complete", desc: "The model completes the task. Timer stays at 0 -- working on todos resets the counter." },
      { title: "Self-Directed", desc: "Once the model learns the pattern, it picks up tasks voluntarily." },
      { title: "Mission Accomplished", desc: "Visible plan + nag pressure = reliable task completion." },
    ],
    statuses: {
      pending: "pending",
      in_progress: "in progress",
      done: "done",
    },
    nagTimer: "Nag Timer",
    nagMessage: 'SYSTEM: "You have pending tasks. Pick one up now!"',
    columns: {
      pending: "Pending",
      inProgress: "In Progress",
      done: "Done",
    },
    progress: "Progress",
    complete: "complete",
  },
  ru: {
    title: "Система напоминаний плана задач",
    tasks: [
      "Написать auth-тесты",
      "Исправить мобильную вёрстку",
      "Добавить обработку ошибок",
      "Обновить загрузчик конфига",
    ],
    stepInfo: [
      { title: "План", desc: "Инструмент плана задач даёт модели видимый план. Все задачи стартуют в статусе pending." },
      { title: "Раунд 1 -- без движения", desc: "Модель что-то делает, но не трогает todo. Счётчик напоминаний растёт." },
      { title: "Раунд 2 -- всё ещё без движения", desc: "Два раунда без прогресса. Давление усиливается." },
      { title: "НАПОМИНАНИЕ!", desc: "Порог достигнут. Вкалывается системное сообщение: 'У тебя есть незавершённые задачи. Возьми одну сейчас.'" },
      { title: "Задача завершена", desc: "Модель закрывает задачу. Таймер остаётся на 0: работа с todo сбрасывает счётчик." },
      { title: "Самонаведение", desc: "Когда модель понимает паттерн, она начинает подхватывать задачи сама." },
      { title: "Миссия выполнена", desc: "Видимый план + давление напоминаний = надёжное завершение задач." },
    ],
    statuses: {
      pending: "ожидает",
      in_progress: "в работе",
      done: "готово",
    },
    nagTimer: "Таймер напоминаний",
    nagMessage: 'СИСТЕМА: "У тебя есть незавершённые задачи. Возьми одну сейчас!"',
    columns: {
      pending: "Ожидают",
      inProgress: "В работе",
      done: "Готово",
    },
    progress: "Прогресс",
    complete: "завершено",
  },
};

function getTaskStates(labels: string[]): Task[][] {
  return [
    [
      { id: 1, label: labels[0], status: "pending" },
      { id: 2, label: labels[1], status: "pending" },
      { id: 3, label: labels[2], status: "pending" },
      { id: 4, label: labels[3], status: "pending" },
    ],
    [
      { id: 1, label: labels[0], status: "pending" },
      { id: 2, label: labels[1], status: "pending" },
      { id: 3, label: labels[2], status: "pending" },
      { id: 4, label: labels[3], status: "pending" },
    ],
    [
      { id: 1, label: labels[0], status: "pending" },
      { id: 2, label: labels[1], status: "pending" },
      { id: 3, label: labels[2], status: "pending" },
      { id: 4, label: labels[3], status: "pending" },
    ],
    [
      { id: 1, label: labels[0], status: "in_progress" },
      { id: 2, label: labels[1], status: "pending" },
      { id: 3, label: labels[2], status: "pending" },
      { id: 4, label: labels[3], status: "pending" },
    ],
    [
      { id: 1, label: labels[0], status: "done" },
      { id: 2, label: labels[1], status: "pending" },
      { id: 3, label: labels[2], status: "pending" },
      { id: 4, label: labels[3], status: "pending" },
    ],
    [
      { id: 1, label: labels[0], status: "done" },
      { id: 2, label: labels[1], status: "in_progress" },
      { id: 3, label: labels[2], status: "pending" },
      { id: 4, label: labels[3], status: "pending" },
    ],
    [
      { id: 1, label: labels[0], status: "done" },
      { id: 2, label: labels[1], status: "done" },
      { id: 3, label: labels[2], status: "done" },
      { id: 4, label: labels[3], status: "in_progress" },
    ],
  ];
}

// -- Column component --

function KanbanColumn({
  title,
  tasks,
  accentClass,
  headerBg,
}: {
  title: string;
  tasks: Task[];
  accentClass: string;
  headerBg: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-1 flex-col rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
      <div
        className={`rounded-t-lg px-3 py-2 text-center text-xs font-bold uppercase tracking-wider ${headerBg}`}
      >
        {title}
        <span className={`ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${accentClass}`}>
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-zinc-400 dark:text-zinc-600">
            --
          </div>
        )}
      </div>
    </div>
  );
}

// -- Task card --

function TaskCard({ task }: { task: Task }) {
  const locale = useLocale();
  const copy = COPY[locale] || COPY.en;
  const statusStyles: Record<TaskStatus, string> = {
    pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  const borderStyles: Record<TaskStatus, string> = {
    pending: "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800",
    in_progress: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30",
    done: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30",
  };

  return (
    <motion.div
      layout
      layoutId={`task-${task.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`rounded-md border p-2.5 ${borderStyles[task.status]}`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          #{task.id}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusStyles[task.status]}`}
        >
          {copy.statuses[task.status]}
        </span>
      </div>
      <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {task.label}
      </div>
    </motion.div>
  );
}

// -- Nag gauge --

function NagGauge({ value, max, firing }: { value: number; max: number; firing: boolean }) {
  const locale = useLocale();
  const copy = COPY[locale] || COPY.en;
  const pct = Math.min((value / max) * 100, 100);

  const barColor =
    value === 0
      ? "bg-zinc-300 dark:bg-zinc-600"
      : value === 1
        ? "bg-green-400 dark:bg-green-500"
        : value === 2
          ? "bg-yellow-400 dark:bg-yellow-500"
          : "bg-red-500 dark:bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {copy.nagTimer}
        </span>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {value}/{max}
        </span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
          initial={{ width: "0%" }}
          animate={{
            width: `${pct}%`,
            ...(firing ? { scale: [1, 1.05, 1] } : {}),
          }}
          transition={{
            width: { duration: 0.5, ease: "easeOut" },
            scale: { duration: 0.3, repeat: 2 },
          }}
        />
        {firing && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 1, 0] }}
            transition={{ duration: 1 }}
          />
        )}
      </div>
    </div>
  );
}

// -- Main component --

export default function TodoWrite({ title }: { title?: string }) {
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
  } = useSteppedVisualization({ totalSteps: 7, autoPlayInterval: 2500 });

  const tasks = getTaskStates(copy.tasks)[currentStep];
  const nagValue = NAG_TIMER_PER_STEP[currentStep];
  const nagFires = NAG_FIRES_PER_STEP[currentStep];
  const stepInfo = copy.stepInfo[currentStep];

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <section className="min-h-[500px] space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title || copy.title}
      </h2>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        {/* Nag gauge + nag message */}
        <div className="mb-4 space-y-2">
          <NagGauge value={nagValue} max={NAG_THRESHOLD} firing={nagFires} />

          <AnimatePresence>
            {nagFires && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
              >
                {copy.nagMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Kanban board */}
        <div className="flex gap-3">
          <KanbanColumn
            title={copy.columns.pending}
            tasks={pendingTasks}
            accentClass="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            headerBg="bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          />
          <KanbanColumn
            title={copy.columns.inProgress}
            tasks={inProgressTasks}
            accentClass="bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200"
            headerBg="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          />
          <KanbanColumn
            title={copy.columns.done}
            tasks={doneTasks}
            accentClass="bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200"
            headerBg="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          />
        </div>

        {/* Progress summary */}
        <div className="mt-3 flex items-center justify-between rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            {copy.progress}: {doneTasks.length}/{tasks.length} {copy.complete}
          </span>
          <div className="flex gap-0.5">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`h-2 w-6 rounded-sm ${
                  t.status === "done"
                    ? "bg-emerald-500"
                    : t.status === "in_progress"
                      ? "bg-amber-400"
                      : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <StepControls
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrev={prev}
        onNext={next}
        onReset={reset}
        isPlaying={isPlaying}
        onToggleAutoPlay={toggleAutoPlay}
        stepTitle={stepInfo.title}
        stepDescription={stepInfo.desc}
      />
    </section>
  );
}
