// @ts-nocheck
"use client";

export default function HowToPlayCard({ gameMode }: { gameMode: string }) {
  const isHuman = gameMode === 'human';
  const isVersus = gameMode === 'versus' || gameMode === 'llmBattle';

  return (
    <div className="rounded-xl border-2 border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-fuchsia-500/10 p-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
      <h3 className="text-xs font-black tracking-[0.2em] text-white flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-black text-[11px] font-black">?</span>
        HOW TO PLAY • 3 STEPS
      </h3>

      <div className="grid grid-cols-1 gap-3">
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-black text-xs shrink-0">1</div>
          <div>
            <div className="text-xs font-black text-white tracking-wide">PICK A MODE (top)</div>
            <div className="text-[11px] font-mono text-zinc-400 leading-relaxed">
              {isHuman ? 'You picked Human mode — you are 😎 YOU, you move with WASD/Arrows.' : isVersus ? 'You picked Versus — choose 2 fighters below, then press PLAY.' : 'Arena = 6 bots battle. No input needed, just watch.'}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-black text-xs shrink-0">2</div>
          <div>
            <div className="text-xs font-black text-white tracking-wide">UNDERSTAND THE BOARD</div>
            <div className="text-[11px] font-mono text-zinc-400 leading-relaxed">
              Grid is 12x12. 💰💎⚡ = points. Agents have colored glows + emoji + health bar. Yellow glow = YOU.
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-fuchsia-400 text-black flex items-center justify-center font-black text-xs shrink-0">3</div>
          <div>
            <div className="text-xs font-black text-white tracking-wide">PRESS PLAY & ADD API KEY FOR LLM BATTLES</div>
            <div className="text-[11px] font-mono text-zinc-400 leading-relaxed">
              Hit green PLAY. For LLM battles, click 🔑 top-right, paste your Meta key (LLM|...), save — now ✨ uses real reasoning, not heuristic. You can pit two different models/prompts vs each other.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-black border border-zinc-800 p-2 flex items-center gap-2 text-[11px] font-mono">
        <span className="text-yellow-400">💡 TIP:</span>
        <span className="text-zinc-300">
          {isHuman ? 'Your last WASD direction is used each turn. Keep tapping to change course!' : 'Green PLAY = auto-run, N = step 1 turn, R = reset, slider = speed.'}
        </span>
      </div>
    </div>
  );
}
