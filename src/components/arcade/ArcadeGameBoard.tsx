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
    <div className="relative">
      {/* Cabinet frame */}
      <div className="absolute -inset-4 rounded-[24px] bg-gradient-to-b from-zinc-800 to-black border-2 border-zinc-700 shadow-[0_0_0_4px_black,0_0_40px_rgba(0,255,255,0.2),inset_0_0_20px_rgba(0,0,0,0.8)] -z-10" />
      <div className="absolute -inset-3 rounded-[20px] bg-gradient-to-b from-cyan-500/20 via-transparent to-fuchsia-500/20 blur-[1px] -z-10" />

      {/* Screen */}
      <div className="relative rounded-[16px] overflow-hidden bg-black border-[3px] border-zinc-900 shadow-[inset_0_0_40px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.1)]">
        <Scanlines opacity={0.12} />

        {/* Top HUD inside screen */}
        <div className="relative z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-black via-zinc-900 to-black border-b border-cyan-500/20">
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-cyan-400">TURN</span>
            <span className="text-white font-bold text-xs">{gameState.turn}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{gameState.config.maxTurns}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
            <span className="text-emerald-400 tracking-widest">ARCADE • LIVE</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">
            SEED:{gameState.seed}
          </div>
        </div>

        {/* Grid */}
        <div
          className="relative grid gap-[2px] p-2 bg-[#050505] z-20"
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
        <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent h-[20%] animate-[scan_3s_linear_infinite]" />
        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(600%); }
          }
        `}</style>
      </div>

      {/* Bottom speaker grilles */}
      <div className="mt-3 flex justify-center gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-1 h-8 rounded-full bg-zinc-800 border border-zinc-700" />
        ))}
      </div>
    </div>
  );
}
