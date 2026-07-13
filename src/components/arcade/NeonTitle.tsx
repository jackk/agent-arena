"use client";

export default function NeonTitle() {
  return (
    <div className="relative select-none">
      <h1 className="text-4xl md:text-6xl font-black tracking-tighter flex items-center gap-3">
        <span className="relative inline-block">
          <span className="absolute inset-0 blur-[20px] bg-cyan-400/50">AGENT</span>
          <span className="relative text-white" style={{ textShadow: '0 0 10px #0ff, 0 0 20px #0ff, 0 0 40px #0ff' }}>
            AGENT
          </span>
        </span>
        <span className="relative inline-block">
          <span className="absolute inset-0 blur-[20px] bg-fuchsia-500/60">ARENA</span>
          <span className="relative text-white" style={{ textShadow: '0 0 10px #f0f, 0 0 20px #f0f, 0 0 40px #f0f' }}>
            ARENA
          </span>
        </span>
      </h1>
      <div className="mt-1 flex items-center gap-2">
        <span className="h-[2px] w-12 bg-gradient-to-r from-cyan-400 to-transparent" />
        <span className="text-[10px] tracking-[0.3em] text-cyan-300/70 font-mono">アーケード • 12x12 • BATTLE FOR SUPREMACY</span>
        <span className="h-[2px] w-12 bg-gradient-to-l from-fuchsia-500 to-transparent" />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');
      `}</style>
    </div>
  );
}
