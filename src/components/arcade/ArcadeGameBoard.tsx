"use client";
import { GameState } from '@/lib/game/types';
import { GameEngine } from '@/lib/game/engine';
import Scanlines from './Scanlines';

type Props = {
  gameState: GameState;
  selectedAgentId?: string;
  onSelectAgent?: (id: string) => void;
  showCoords?: boolean;
};

export default function ArcadeGameBoard({ gameState, selectedAgentId, onSelectAgent, showCoords }: Props) {
  const { config, agents, resources } = gameState;

  // Build lookup
  const agentByPos = new Map<string, typeof agents[0]>();
  const resourceByPos = new Map<string, typeof resources[0]>();
  for (const a of agents) if (a.alive) agentByPos.set(GameEngine.posKey(a.pos), a);
  for (const r of resources) resourceByPos.set(GameEngine.posKey(r.pos), r);

  return (
    <div className="relative w-full h-full">
      {/* Screen - compact, no outer frame to save space */}
      <div className="relative h-full rounded-xl overflow-hidden bg-black border-2 border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(0,0,0,0.9)] flex flex-col">
        <Scanlines opacity={0.08} />

        {/* Top HUD - tiny */}
        <div className="relative z-20 shrink-0 flex items-center justify-between px-2.5 h-7 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-cyan-400 font-bold">TURN</span>
            <span className="text-white font-black">{gameState.turn}</span>
            <span className="text-zinc-600">/{gameState.config.maxTurns}</span>
            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-[9px] font-mono text-zinc-500">SEED {gameState.seed} • {gameState.resources.length} COINS</div>
        </div>

        {/* Grid - flex-1 fills */}
        <div
          className="relative flex-1 grid gap-[1px] p-1.5 bg-[#050505] z-20 min-h-0"
          style={{ gridTemplateColumns: `repeat(${config.width}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: config.height }).map((_, y) =>
            Array.from({ length: config.width }).map((_, x) => {
              const key = `${x},${y}`;
              const agent = agentByPos.get(key);
              const resource = resourceByPos.get(key);
              const isSelected = agent && selectedAgentId === agent.id;

              return (
                <div
                  key={key}
                  onClick={() => agent && onSelectAgent?.(agent.id)}
                  className={`
                    relative aspect-square rounded-[4px] flex items-center justify-center 
                    border transition-all cursor-pointer select-none
                    ${agent ? 'z-10 scale-[1.02]' : ''}
                    ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''}
                  `}
                  style={{
                    background: agent
                      ? `radial-gradient(circle at 30% 30%, ${agent.color}ff, ${agent.color}66)`
                      : resource
                        ? resource.type === 'coin'
                          ? 'radial-gradient(circle, #facc15 0%, #a16207 100%)'
                          : resource.type === 'gem'
                            ? 'radial-gradient(circle, #60a5fa 0%, #1e40af 100%)'
                            : 'radial-gradient(circle, #e879f9 0%, #86198f 100%)'
                        : 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
                    borderColor: agent ? agent.color : resource ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    boxShadow: agent
                      ? `0 0 15px ${agent.color}99, inset 0 0 10px rgba(255,255,255,0.3)`
                      : resource
                        ? `0 0 10px ${resource.type === 'coin' ? '#facc15' : resource.type === 'gem' ? '#60a5fa' : '#e879f9'}66`
                        : 'none',
                  }}
                >
                  {/* coords */}
                  {showCoords && (
                    <span className="absolute top-0 left-0 text-[6px] font-mono text-white/20 leading-none p-[1px]">
                      {x},{y}
                    </span>
                  )}

                  {/* content */}
                  {agent ? (
                    <div className="relative flex flex-col items-center">
                      <span className="text-[14px] sm:text-[18px] leading-none drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
                        {agent.emoji}
                      </span>
                      {/* health mini bar */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[18px] h-[3px] rounded-full bg-black border border-white/20 overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${agent.health}%` }} />
                      </div>
                      {agent.id === 'human' && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                      )}
                    </div>
                  ) : resource ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[12px] sm:text-[14px] leading-none animate-[pulse_1.5s_infinite]">
                        {resource.type === 'coin' ? '💰' : resource.type === 'gem' ? '💎' : '⚡'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-[2px] h-[2px] rounded-full bg-white/5" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Scanline shimmer */}
        <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-transparent via-cyan-400/[0.03] to-transparent h-[20%] animate-[scan_3s_linear_infinite]" />
        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(600%); }
          }
        `}</style>
      </div>
    </div>
  );
}
