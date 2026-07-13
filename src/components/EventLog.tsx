"use client";

import { GameEvent } from "@/lib/game/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  events: GameEvent[];
  maxVisible?: number;
};

function iconFor(type: GameEvent["type"]) {
  switch (type) {
    case "move": return "➡️";
    case "collect": return "📦";
    case "attack": return "⚔️";
    case "death": return "💀";
    case "spawn": return "✨";
    default: return "•";
  }
}

function colorFor(type: GameEvent["type"]) {
  switch (type) {
    case "move": return "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700";
    case "collect": return "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    case "attack": return "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    case "death": return "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border-zinc-900/20 dark:border-zinc-700 font-semibold";
    case "spawn": return "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800";
    default: return "text-zinc-500 bg-zinc-50 border-zinc-200";
  }
}

export default function EventLog({ events, maxVisible = 100 }: Props) {
  const [filter, setFilter] = useState<GameEvent["type"] | "all">("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);
  const visible = filtered.slice(-maxVisible);

  // auto scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, autoScroll]);

  const filterOptions: Array<GameEvent["type"] | "all"> = ["all", "collect", "attack", "death", "move", "spawn"];

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <span className="text-base">📜</span> Event Log
          <span className="text-xs font-normal text-zinc-500">({events.length})</span>
        </h3>

        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 text-[11px] text-zinc-500 cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={e=>setAutoScroll(e.target.checked)} className="rounded" />
            auto
          </label>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <div className="flex gap-1">
            {filterOptions.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-2 py-0.5 rounded-full text-[11px] font-medium border transition capitalize
                  ${filter === f ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"}
                `}
              >
                {f === "all" ? `All` : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="h-[220px] overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-500 gap-2">
              <div className="text-2xl opacity-50">📭</div>
              <div className="text-xs">No events yet</div>
            </div>
          ) : (
            visible.map((ev, i) => (
              <div
                key={`${ev.turn}-${i}-${ev.message}`}
                className={`
                  group flex gap-2.5 items-start rounded-xl border px-2.5 py-1.5 text-[12px] leading-snug transition-all
                  ${colorFor(ev.type)}
                  hover:shadow-sm
                `}
              >
                <span className="shrink-0 mt-0.5 text-[11px] w-4 text-center">{iconFor(ev.type)}</span>
                <div className="min-w-0 flex-1 flex flex-col">
                  <span className="truncate">{ev.message}</span>
                  <div className="flex items-center gap-2 text-[10px] opacity-70 font-mono">
                    <span>T{ev.turn}</span>
                    {ev.value !== undefined && <span>+{ev.value}</span>}
                    {ev.pos && <span>@{ev.pos.x},{ev.pos.y}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* fade top/bottom */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-white to-transparent dark:from-zinc-900" />
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
      </div>

      {/* footer quick stats */}
      <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>{filtered.length} shown / {events.length} total</span>
        <span className="font-mono text-[10px]">last {maxVisible}</span>
      </div>
    </div>
  );
}

export { EventLog };
