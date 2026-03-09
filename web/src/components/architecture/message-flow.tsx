"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/i18n";

export function MessageFlow() {
  const locale = useLocale();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const labels =
    locale === "ru"
      ? {
          user: "пользователь",
          assistant: "ассистент",
          toolCall: "вызов_инструмента",
          toolResult: "результат_инструмента",
          final: "ассистент (финал)",
        }
      : {
          user: "user",
          assistant: "assistant",
          toolCall: "tool_call",
          toolResult: "tool_result",
          final: "assistant (final)",
        };
  const flowSteps = [
    { role: "user", label: labels.user, color: "bg-blue-500" },
    { role: "assistant", label: labels.assistant, color: "bg-zinc-600" },
    { role: "tool_call", label: labels.toolCall, color: "bg-amber-500" },
    { role: "tool_result", label: labels.toolResult, color: "bg-emerald-500" },
    { role: "assistant", label: labels.assistant, color: "bg-zinc-600" },
    { role: "tool_call", label: labels.toolCall, color: "bg-amber-500" },
    { role: "tool_result", label: labels.toolResult, color: "bg-emerald-500" },
    { role: "assistant", label: labels.final, color: "bg-zinc-600" },
  ];

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev >= flowSteps.length) {
          setTimeout(() => setCount(0), 1500);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [flowSteps.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
          messages[]
        </span>
        <span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs tabular-nums dark:bg-zinc-800">
          len={count}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <AnimatePresence>
          {flowSteps.slice(0, count).map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.7, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: "auto" }}
              transition={{ duration: 0.25 }}
              className={`flex shrink-0 items-center rounded-md px-2.5 py-1.5 ${step.color}`}
            >
              <span className="whitespace-nowrap font-mono text-[10px] font-medium text-white">
                {step.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {count === 0 && (
          <div className="flex h-7 items-center text-xs text-[var(--color-text-secondary)]">
            []
          </div>
        )}
      </div>
    </div>
  );
}
