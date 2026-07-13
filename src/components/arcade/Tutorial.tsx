// @ts-nocheck
"use client";
import { useEffect, useState } from "react";

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to SNAKE ARENA 3D 🐍",
      desc: "Classic Snake you know - now with 6 AIs battling, 3D vector wireframe graphics, and LLM vs LLM mode. Eat food, grow longer, don't crash!",
      visual: "🐍💰💎",
      cta: "HOW TO PLAY →"
    },
    {
      title: "1. PICK YOUR MODE",
      desc: "ARENA = watch 6 snakes battle. PLAY = you are 😎 yellow snake with WASD. VERSUS = pick 2 for 1v1. LLM BATTLE = 2 different AIs with your own API keys battle — configure in 🔑 panel.",
      visual: "🎮",
      cta: "GOT IT →"
    },
    {
      title: "2. CLASSIC SNAKE RULES",
      desc: "💰=10pts, 💎=25pts. Eat to grow +1 length. Hit wall or any snake body = death. Head-on = both die. Last alive or longest snake wins! 3D view = drag to rotate, scroll to zoom.",
      visual: "🐍💥🏆",
      cta: "CLEAR →"
    },
    {
      title: "3. 3D VECTOR + LLM BATTLES",
      desc: "Toggle 2D Classic / 3D Vector top-right. 3D = wireframe Tron style with emissive snakes and rotating food gems. Click 🔑 API KEYS, paste Meta key LLM|... to enable real LLM reasoning (2728 tokens/move) — set different models/prompts for epic LLM vs LLM battles!",
      visual: "🔑✨🎮",
      cta: "LET'S PLAY!"
    },
  ];

  const s = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-[480px] rounded-[20px] border-2 border-cyan-400 bg-zinc-900 shadow-[0_0_60px_rgba(6,182,212,0.4)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/10" />
        <div className="relative p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-cyan-400">TUTORIAL {step+1}/{steps.length}</span>
            <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
          </div>

          <div className="text-5xl text-center py-2">{s.visual}</div>

          <h2 className="text-xl font-black tracking-tight text-white text-center">{s.title}</h2>
          <p className="text-sm leading-relaxed text-zinc-300 text-center">{s.desc}</p>

          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <button onClick={() => setStep(step-1)} className="h-10 flex-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold tracking-widest text-white">
                ← BACK
              </button>
            )}
            <button
              onClick={() => {
                if (step === steps.length-1) {
                  localStorage.setItem('agent-arena-tutorial-seen', '1');
                  onClose();
                } else {
                  setStep(step+1);
                }
              }}
              className="h-10 flex-1 rounded-full bg-white text-black text-xs font-black tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:bg-zinc-100"
            >
              {s.cta}
            </button>
          </div>

          <div className="flex justify-center gap-1 pt-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i===step ? 'w-6 bg-cyan-400' : 'w-2 bg-zinc-700'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useTutorial() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem('agent-arena-tutorial-seen');
    if (!seen) setShow(true);
  }, []);
  return { show, setShow, close: () => { localStorage.setItem('agent-arena-tutorial-seen','1'); setShow(false); }, open: () => setShow(true) };
}
