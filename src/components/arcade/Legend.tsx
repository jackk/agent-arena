"use client";

export default function Legend() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <div className="text-[10px] font-black tracking-widest text-zinc-500 mb-2">💰 RESOURCES • COLLECT TO SCORE</div>
        <div className="flex flex-col gap-1.5 text-[11px] font-mono">
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">💰</span><span><b className="text-white">Coin</b> = 10 pts (common)</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">💎</span><span><b className="text-white">Gem</b> = 25 pts (rare)</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center">⚡</span><span><b className="text-white">Power</b> = 50 pts + heals 30HP (epic)</span></div>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-black tracking-widest text-zinc-500 mb-2">⚔️ COMBAT & HEALTH</div>
        <div className="flex flex-col gap-1.5 text-[11px] font-mono">
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">❤️</span><span>Green bar = HP, starts 100</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">⚔️</span><span>Adjacent = both take 20-30 dmg</span></div>
          <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-red-500/20 border border-red-500/30 flex items-center justify-center">💀</span><span>Kill = +50 pts, enemy gone</span></div>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-black tracking-widest text-zinc-500 mb-2">🎯 HOW TO WIN</div>
        <div className="flex flex-col gap-1.5 text-[11px] font-mono text-zinc-300 leading-relaxed">
          <span>• Last alive wins instantly</span>
          <span>• Or highest score after 100 turns</span>
          <span>• Collision = blocked move if 2 agents want same square</span>
          <span className="text-cyan-400">• TIP: Resources respawn every 5 turns!</span>
        </div>
      </div>
    </div>
  );
}
