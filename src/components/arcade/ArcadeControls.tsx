"use client";
import { Direction } from '@/lib/game/types';

type Props = {
  isPlaying: boolean;
  isOver: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
  speed: number;
  setSpeed: (n: number) => void;
  humanDir?: Direction;
  onHumanDir?: (d: Direction) => void;
  gameMode: string;
  isLLMThinking?: boolean;
};

export default function ArcadeControls({ isPlaying, isOver, onPlayPause, onStep, onReset, speed, setSpeed, humanDir, onHumanDir, gameMode, isLLMThinking }: Props) {
  const isHuman = gameMode === 'human';

  return (
    <div className="rounded-xl border-2 border-zinc-800 bg-black p-3 flex flex-col gap-3 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
      {/* Top row - arcade buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPlayPause}
          disabled={isOver}
          className={`flex-1 h-12 rounded-full font-black tracking-widest text-xs border-2 transition-all
            ${isPlaying ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.6)]'}
            ${isOver ? 'opacity-50' : 'hover:brightness-110 active:scale-95'}
          `}
        >
          {isOver ? 'GAME OVER' : isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
        </button>

        <button
          onClick={onStep}
          className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-yellow-300 text-black font-black text-xs shadow-[0_0_15px_rgba(250,204,21,0.5)] hover:brightness-110 active:scale-95 transition"
        >
          STEP
        </button>

        <button
          onClick={() => onReset()}
          className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-700 text-white font-bold text-[10px] tracking-widest hover:bg-zinc-700 active:scale-95 transition"
        >
          RESET
        </button>
      </div>

      {/* Human D-pad */}
      {isHuman && (
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black tracking-widest text-yellow-400">PLAYER 1 • YOU • CONTROLS</span>
            <span className="text-[10px] font-mono text-zinc-500">WASD / ARROWS / SPACE=STAY</span>
          </div>

          <div className="flex items-center gap-4">
            {/* D-pad visual */}
            <div className="relative w-28 h-28">
              <div className="absolute inset-0 bg-zinc-800 rounded-xl" />
              {/* up */}
              <button
                onMouseDown={() => onHumanDir?.('up')}
                className={`absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-black transition ${humanDir === 'up' ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_15px_#facc15]' : 'bg-zinc-700 border-zinc-600 text-white'}`}
              >
                ↑
              </button>
              <button
                onMouseDown={() => onHumanDir?.('down')}
                className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-black transition ${humanDir === 'down' ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_15px_#facc15]' : 'bg-zinc-700 border-zinc-600 text-white'}`}
              >
                ↓
              </button>
              <button
                onMouseDown={() => onHumanDir?.('left')}
                className={`absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-black transition ${humanDir === 'left' ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_15px_#facc15]' : 'bg-zinc-700 border-zinc-600 text-white'}`}
              >
                ←
              </button>
              <button
                onMouseDown={() => onHumanDir?.('right')}
                className={`absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-black transition ${humanDir === 'right' ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_15px_#facc15]' : 'bg-zinc-700 border-zinc-600 text-white'}`}
              >
                →
              </button>
              <button
                onMouseDown={() => onHumanDir?.('stay')}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition ${humanDir === 'stay' ? 'bg-white border-white text-black' : 'bg-zinc-600 border-zinc-500 text-white'}`}
              >
                ●
              </button>
            </div>

            <div className="flex-1">
              <div className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                Current: <span className="text-yellow-400 font-bold">{humanDir?.toUpperCase()}</span><br />
                Press keys to move — game reads your last direction each turn.<br />
                Collect <span className="text-yellow-300">💰</span> and avoid <span className="text-red-400">⚔️</span>!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 whitespace-nowrap">SPEED</span>
        <input
          type="range"
          min={50}
          max={800}
          value={800 - speed + 50}
          onChange={e => setSpeed(850 - Number(e.target.value))}
          className="flex-1 accent-cyan-400"
        />
        <span className="text-[10px] font-mono text-cyan-400 w-12 text-right">{speed}ms</span>
        {isLLMThinking && <span className="text-[10px] font-mono text-fuchsia-400 animate-pulse">✨ LLM THINKING...</span>}
      </div>
    </div>
  );
}
