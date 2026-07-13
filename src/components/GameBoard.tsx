"use client";

import { GameState, AgentState, Resource } from "@/lib/game/types";

type Props = {
  gameState: GameState;
  selectedAgentId?: string;
  onSelectAgent?: (id: string | undefined) => void;
  showCoords?: boolean;
};

function getResourceStyle(type: Resource["type"]) {
  switch (type) {
    case "coin":
      return { emoji: "💰", bg: "bg-yellow-400/20 dark:bg-yellow-400/20", border: "border-yellow-400/40", text: "text-yellow-600 dark:text-yellow-300" };
    case "gem":
      return { emoji: "💎", bg: "bg-sky-400/20 dark:bg-sky-400/30", border: "border-sky-400/40", text: "text-sky-600 dark:text-sky-300" };
    case "power":
      return { emoji: "⚡", bg: "bg-violet-500/20 dark:bg-violet-400/30", border: "border-violet-500/40", text: "text-violet-600 dark:text-violet-300" };
  }
}

export default function GameBoard({ gameState, selectedAgentId, onSelectAgent, showCoords = false }: Props) {
  const { width, height } = gameState.config;

  // Build lookup maps for performance
  const agentMap = new Map<string, AgentState>();
  for (const a of gameState.agents) {
    agentMap.set(`${a.pos.x},${a.pos.y}`, a);
  }
  const resourceMap = new Map<string, Resource>();
  for (const r of gameState.resources) {
    resourceMap.set(`${r.pos.x},${r.pos.y}`, r);
  }

  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const agent = agentMap.get(key);
      const resource = resourceMap.get(key);
      const isSelected = agent && selectedAgentId === agent.id;

      cells.push(
        <div
          key={key}
          onClick={() => {
            if (agent) onSelectAgent?.(agent.id === selectedAgentId ? undefined : agent.id);
            else onSelectAgent?.(undefined);
          }}
          className={`
            relative flex items-center justify-center aspect-square
            border border-zinc-100 dark:border-zinc-800/80
            transition-all duration-150
            ${agent ? "cursor-pointer" : "cursor-default"}
            ${isSelected ? "z-10 ring-2 ring-offset-1 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900 scale-[1.05]" : "hover:z-10 hover:scale-[1.02]"}
            bg-white dark:bg-zinc-900
            hover:bg-zinc-50 dark:hover:bg-zinc-800
          `}
          style={{
            backgroundColor: agent && agent.alive
              ? `${agent.color}15`
              : undefined,
          }}
        >
          {/* coords */}
          {showCoords && (
            <span className="absolute top-0 left-0 text-[7px] leading-none opacity-20 p-0.5 font-mono">
              {x},{y}
            </span>
          )}

          {/* Agent */}
          {agent ? (
            <div className="relative flex flex-col items-center justify-center w-full h-full">
              <div
                className={`
                  w-[78%] h-[78%] rounded-[10px] flex items-center justify-center text-[15px] sm:text-[17px]
                  shadow-sm border transition-transform
                  ${agent.alive ? "" : "grayscale opacity-50"}
                  ${isSelected ? "shadow-md" : ""}
                `}
                style={{
                  backgroundColor: agent.alive ? agent.color : "#a1a1aa",
                  borderColor: agent.alive ? `${agent.color}aa` : "#a1a1aa",
                  color: "white",
                }}
              >
                <span className="drop-shadow-sm">{agent.emoji}</span>
              </div>
              {/* health bar */}
              <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${agent.health}%`,
                    backgroundColor: agent.health > 60 ? "#22c55e" : agent.health > 30 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
              {/* dead X */}
              {!agent.alive && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40 rounded-[2px]">
                  <span className="text-[10px]">💀</span>
                </div>
              )}
            </div>
          ) : resource ? (
            /* Resource */
            (() => {
              const style = getResourceStyle(resource.type);
              return (
                <div className={`relative w-[72%] h-[72%] rounded-full border flex flex-col items-center justify-center ${style.bg} ${style.border} ${style.text} shadow-inner`}>
                  <span className="text-[13px] leading-none">{style.emoji}</span>
                  <span className="text-[8px] font-bold leading-none mt-0.5 font-mono">{resource.value}</span>
                </div>
              );
            })()
          ) : (
            /* Empty */
            <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 opacity-80" />
          )}
        </div>
      );
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div
        className="relative w-full max-w-[520px] aspect-square rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 p-2"
      >
        <div
          className="grid w-full h-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
          style={{
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
          }}
        >
          {cells}
        </div>

        {/* glow for selected agent */}
        {selectedAgentId && (
          <div className="pointer-events-none absolute inset-2 rounded-xl ring-1 ring-zinc-900/5 dark:ring-white/5" />
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> agent</span>
        <span className="flex items-center gap-1"><span>💰</span> coin 10</span>
        <span className="flex items-center gap-1"><span>💎</span> gem 25</span>
        <span className="flex items-center gap-1"><span>⚡</span> power 50+heal</span>
        <span className="hidden sm:inline opacity-60">• click agent to highlight</span>
      </div>
    </div>
  );
}

export { GameBoard };
