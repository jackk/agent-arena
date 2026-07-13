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
    <div className="rounded-[8px] border-2 border-[#2a2a2a] bg-[#0a0a0a] p-2 flex flex-col gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_0_#000]">
      {/* PS2-style controller bar */}
      <div className="flex items-center gap-1.5">
        {/* Triangle - Play/Pause - Green */}
        <button
          onClick={onPlayPause}
          disabled={isOver}
          className={`flex-1 h-9 rounded-[6px] font-black tracking-widest text-[11px] border-2 flex items-center justify-center gap-1.5 transition-all
            ${isPlaying ? 'bg-[#8a1a1a] border-[#ff3a3a] text-[#ff9999]' : 'bg-[#1a5a2a] border-[#00ff88] text-[#88ffaa]'}
            ${isOver ? 'opacity-50' : 'active:translate-y-[1px] active:shadow-none shadow-[0_2px_0_#000]'}
          `}
        >
          <span className="w-5 h-5 rounded-[3px] bg-black/40 border border-white/20 flex items-center justify-center text-[10px]">△</span>
          {isOver ? 'GAME OVER' : isPlaying ? 'PAUSE' : 'PLAY'}
        </button>

        {/* X - Step - Blue */}
        <button onClick={onStep} className="h-9 w-16 rounded-[6px] bg-[#1a2a5a] border-2 border-[#3a7bff] text-[#88aaff] font-black text-[10px] flex flex-col items-center justify-center leading-none shadow-[0_2px_0_#000] active:translate-y-[1px] active:shadow-none">
          <span className="text-[12px]">×</span>
          <span className="text-[8px] tracking-widest">STEP</span>
        </button>

        {/* Square - Reset - Pink */}
        <button onClick={() => onReset()} className="h-9 w-16 rounded-[6px] bg-[#3a1a2a] border-2 border-[#ff4da6] text-[#ff88bb] font-black text-[10px] flex flex-col items-center justify-center leading-none shadow-[0_2px_0_#000] active:translate-y-[1px] active:shadow-none">
          <span className="text-[10px]">□</span>
          <span className="text-[8px] tracking-widest">RESET</span>
        </button>

        {/* Speed - PS2 analog */}
        <div className="hidden sm:flex items-center gap-2 ml-2 px-2 h-9 rounded-[6px] bg-[#111] border-2 border-[#222] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
          <span className="text-[8px] font-bold text-[#666] tracking-widest">SPEED</span>
          <input type="range" min={60} max={300} value={320 - speed} onChange={e => setSpeed(320 - Number(e.target.value))} className="w-16 accent-[#00ff88] h-1" />
          <span className="text-[9px] font-mono text-[#00ff88] w-9">{speed}ms</span>
        </div>
      </div>

      {isHuman && (
        <div className="rounded-[6px] bg-[#111] border-2 border-[#ffff00]/30 p-2 flex items-center gap-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-black tracking-widest text-[#ffff00] mr-1">D-PAD</span>
            {(['up','left','stay','right','down'] as Direction[]).map(d => (
              <button
                key={d}
                onMouseDown={() => onHumanDir?.(d)}
                onTouchStart={() => onHumanDir?.(d)}
                className={`w-7 h-7 rounded-[4px] border-2 text-[11px] font-black flex items-center justify-center shadow-[0_1px_0_#000] active:translate-y-[1px] active:shadow-none ${humanDir===d ? 'bg-[#ffff00] border-[#ffcc00] text-black' : 'bg-[#222] border-[#444] text-white'}`}
              >
                {d==='up'?'▲':d==='down'?'▼':d==='left'?'◀':d==='right'?'▶':'●'}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-zinc-500">WASD • <b className="text-[#ffff00]">{humanDir.toUpperCase()}</b> • First-person forest</span>
          {isLLMThinking && <span className="ml-auto text-[9px] font-mono text-[#00ff88] animate-pulse">✨ THINKING...</span>}
        </div>
      )}

      {/* PS2 memory card style hint */}
      <div className="hidden lg:flex h-5 rounded-[4px] bg-[#0f0f0f] border border-[#222] items-center px-2 gap-2 text-[8px] font-mono text-[#666]">
        <span>△ PLAY/PAUSE</span><span className="text-[#333]">•</span><span>× STEP 1 TURN</span><span className="text-[#333]">•</span><span>□ RESET</span><span className="text-[#333]">•</span><span className="text-[#00ff88]">PS2 • 480i • 60FPS • LOW-POLY FOREST</span>
      </div>
    </div>
  );
}
