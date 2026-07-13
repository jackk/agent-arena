// @ts-nocheck
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
    <div className="rounded-xl border border-zinc-800 bg-black p-2 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPlayPause}
          disabled={isOver}
          className={`flex-1 h-8 rounded-full font-black tracking-widest text-[11px] border transition-all
            ${isPlaying ? 'bg-red-500 border-red-400 text-white' : 'bg-emerald-500 border-emerald-400 text-black'}
            ${isOver ? 'opacity-50' : 'hover:brightness-110 active:scale-95'}
          `}
        >
          {isOver ? 'GAME OVER' : isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button onClick={onStep} className="h-8 w-14 rounded-full bg-yellow-400 border border-yellow-300 text-black font-black text-[10px] hover:brightness-110 active:scale-95">STEP</button>
        <button onClick={() => onReset()} className="h-8 w-14 rounded-full bg-zinc-800 border border-zinc-700 text-white font-bold text-[10px] hover:bg-zinc-700">RESET</button>
        <div className="hidden sm:flex items-center gap-1.5 ml-1">
          <span className="text-[9px] font-bold text-zinc-500">SPD</span>
          <input type="range" min={50} max={800} value={800 - speed + 50} onChange={e => setSpeed(850 - Number(e.target.value))} className="w-16 accent-cyan-400 h-1" />
        </div>
      </div>

      {isHuman && (
        <div className="rounded-lg bg-zinc-900 border border-yellow-500/30 p-2 flex items-center gap-3">
          <div className="flex gap-1">
            {(['up','left','stay','right','down'] as Direction[]).map(d => (
              <button
                key={d}
                onMouseDown={() => onHumanDir?.(d)}
                onTouchStart={() => onHumanDir?.(d)}
                className={`w-7 h-7 rounded-md border text-[11px] font-black flex items-center justify-center ${humanDir===d ? 'bg-yellow-400 border-yellow-300 text-black' : 'bg-zinc-800 border-zinc-700 text-white'}`}
              >
                {d==='up'?'↑':d==='down'?'↓':d==='left'?'←':d==='right'?'→':'●'}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-zinc-400">WASD / Arrows • Current: <b className="text-yellow-400">{humanDir?.toUpperCase()}</b></span>
        </div>
      )}
    </div>
  );
}
