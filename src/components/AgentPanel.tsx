// @ts-nocheck
"use client";

import { AgentState } from "@/lib/game/types";

type Props = {
  agents: AgentState[];
  winnerId?: string;
  selectedAgentId?: string;
  onSelect?: (id: string | undefined) => void;
};

export default function AgentPanel({ agents, winnerId, selectedAgentId, onSelect }: Props) {
  // sort by alive then score
  const sorted = [...agents].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return b.score - a.score;
  });

  const totalAlive = agents.filter(a => a.alive).length;

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Agents
          <span className="text-xs font-normal text-zinc-500">({totalAlive} alive)</span>
        </h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
          {agents.length} total
        </span>
      </div>

      <div className="p-2 flex flex-col gap-2 max-h-[380px] overflow-y-auto custom-scrollbar">
        {sorted.map((agent) => {
          const isWinner = winnerId === agent.id;
          const isSelected = selectedAgentId === agent.id;
          const isDead = !agent.alive;

          return (
            <div
              key={agent.id}
              onClick={() => onSelect?.(agent.id === selectedAgentId ? undefined : agent.id)}
              className={`
                group relative rounded-xl border px-3 py-2.5 flex flex-col gap-2 cursor-pointer
                transition-all
                ${isWinner ? "border-amber-300 dark:border-amber-600 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm ring-1 ring-amber-200 dark:ring-amber-800" : ""}
                ${isSelected ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 shadow-md scale-[1.01]" : ""}
                ${!isWinner && !isSelected ? "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60" : ""}
                ${isDead ? "opacity-60 grayscale-[0.3]" : ""}
              `}
            >
              {/* left color accent */}
              <div
                className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                style={{ backgroundColor: agent.alive ? agent.color : "#71717a" }}
              />

              <div className="flex items-start justify-between gap-2 ml-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border shadow-sm"
                    style={{
                      backgroundColor: agent.alive ? `${agent.color}20` : "#f4f4f5",
                      borderColor: agent.alive ? `${agent.color}40` : "#e4e4e7",
                    }}
                  >
                    {agent.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold truncate tracking-tight text-zinc-900 dark:text-zinc-100">
                        {agent.name}
                      </span>
                      {isWinner && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-bold leading-none">👑 WIN</span>
                      )}
                      {isDead && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">DEAD</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span>({agent.pos.x},{agent.pos.y})</span>
                      {agent.kills > 0 && <span className="flex items-center gap-0.5">⚔️ {agent.kills}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{agent.score}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">score</div>
                </div>
              </div>

              {/* health + score bars */}
              <div className="ml-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] w-8 text-zinc-500">HP</span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${agent.health}%`,
                        backgroundColor: isDead ? "#a1a1aa" : agent.health > 60 ? "#22c55e" : agent.health > 30 ? "#eab308" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono w-6 text-right tabular-nums">{agent.health}</span>
                </div>

                {/* kill + status */}
                <div className="flex items-center gap-2 text-[11px]">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${agent.alive ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.alive ? "bg-emerald-500" : "bg-zinc-400"}`} />
                    {agent.alive ? "Alive" : "Eliminated"}
                  </div>
                  {agent.score > 0 && (
                    <div className="text-zinc-500 dark:text-zinc-400">
                      <span className="opacity-60">score</span> <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{agent.score}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* footer mini stats */}
      <div className="mt-auto px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/50 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[11px] text-zinc-500">Total Score</div>
          <div className="text-sm font-semibold font-mono">{agents.reduce((s,a)=>s+a.score,0)}</div>
        </div>
        <div className="text-center border-x border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500">Kills</div>
          <div className="text-sm font-semibold font-mono">{agents.reduce((s,a)=>s+a.kills,0)}</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] text-zinc-500">Alive</div>
          <div className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">{totalAlive}/{agents.length}</div>
        </div>
      </div>
    </div>
  );
}

export { AgentPanel };
