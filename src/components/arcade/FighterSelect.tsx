"use client";
import { AgentConfig } from '@/lib/game/types';

const ALL_FIGHTERS: AgentConfig[] = [
  { id: 'a1', name: 'RandomRandy', color: '#ef4444', emoji: '🎲' },
  { id: 'a2', name: 'GreedyGus', color: '#22c55e', emoji: '💰' },
  { id: 'a3', name: 'HunterHazel', color: '#f97316', emoji: '⚔️' },
  { id: 'a4', name: 'StrategistSam', color: '#3b82f6', emoji: '🧠' },
  { id: 'a5', name: 'AvoiderAlex', color: '#a855f7', emoji: '👻' },
  { id: 'a6', name: 'MuseSpark', color: '#ffffff', emoji: '✨' },
  { id: 'human', name: 'YOU', color: '#ffff00', emoji: '😎' },
];

export default function FighterSelect({
  selected,
  onSelect,
  mode
}: {
  selected: [string, string];
  onSelect: (pair: [string, string]) => void;
  mode: 'versus' | 'llmBattle';
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-black tracking-[0.2em] text-white flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          {mode === 'llmBattle' ? 'LLM BATTLE' : 'VERSUS'} • PICK 2
        </h3>
        <div className="flex gap-1">
          <button onClick={() => onSelect(['a4','a6'])} className="h-6 px-2 rounded-full bg-zinc-800 border border-zinc-700 text-[9px] font-bold text-zinc-300">🧠vs✨</button>
          <button onClick={() => onSelect(['human','a4'])} className="h-6 px-2 rounded-full bg-yellow-400 border border-yellow-300 text-[9px] font-black text-black">YOU vs 🧠</button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_24px_1fr] gap-1.5 mb-2">
        {selected.map((id, idx) => {
          const f = ALL_FIGHTERS.find(x => x.id === id);
          return (
            <div key={idx} className="relative rounded-lg border px-2 py-1.5 flex items-center gap-2 bg-zinc-900" style={{ borderColor: f?.color || '#333' }}>
              <span className="text-[16px]">{f?.emoji}</span>
              <span className="text-[10px] font-black truncate text-white">{f?.name}</span>
              <span className="ml-auto text-[8px] font-mono text-zinc-500">P{idx+1}</span>
            </div>
          );
        })}
        <div className="flex items-center justify-center"><div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-black">VS</div></div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {ALL_FIGHTERS.map(fighter => {
          const isSelected = selected.includes(fighter.id);
          return (
            <button
              key={fighter.id}
              onClick={() => {
                if (selected.includes(fighter.id)) return;
                onSelect([selected[1], fighter.id] as [string,string]);
              }}
              className={`aspect-square rounded-md border flex items-center justify-center bg-zinc-900 hover:scale-105 transition text-[14px] ${isSelected ? 'border-white/20 opacity-30' : 'border-zinc-800'}`}
            >
              {fighter.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
