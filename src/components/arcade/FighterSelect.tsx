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
    <div className="rounded-xl border-2 border-zinc-800 bg-black p-3 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black tracking-[0.2em] text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {mode === 'llmBattle' ? 'LLM BATTLE SELECT' : 'VERSUS SELECT'}
        </h3>
        <span className="text-[10px] font-mono text-zinc-500">PICK 2 FIGHTERS</span>
      </div>

      {/* Selected display like Street Fighter */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-4">
        {selected.map((id, idx) => {
          const f = ALL_FIGHTERS.find(x => x.id === id);
          return (
            <div
              key={idx}
              className="relative rounded-lg border-2 p-3 flex flex-col items-center gap-2 bg-zinc-900 overflow-hidden"
              style={{ borderColor: f?.color || '#333', boxShadow: `0 0 20px ${f?.color}40` }}
            >
              <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${f?.color}, transparent 70%)` }} />
              <div className="relative text-3xl">{f?.emoji}</div>
              <div className="relative text-[11px] font-black tracking-widest text-white">{f?.name.toUpperCase()}</div>
              <div className="relative text-[10px] font-mono text-zinc-400">P{idx+1}</div>
            </div>
          );
        })}
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-xs font-black text-white">VS</div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {ALL_FIGHTERS.map(fighter => {
          const isSelected = selected.includes(fighter.id);
          const isP1 = selected[0] === fighter.id;
          const isP2 = selected[1] === fighter.id;
          return (
            <button
              key={fighter.id}
              onClick={() => {
                // Toggle logic: if clicked first slot available, else second
                if (selected[0] === fighter.id || selected[1] === fighter.id) return;
                // Replace least recently? Simple: replace second then first rotating
                const newPair: [string, string] = [selected[1], fighter.id];
                onSelect(newPair);
              }}
              className={`group relative aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center gap-1 transition-all bg-zinc-900
                ${isSelected ? 'scale-105 z-10' : 'hover:scale-105 hover:z-10'}
              `}
              style={{
                borderColor: isSelected ? fighter.color : '#27272a',
                backgroundColor: isSelected ? `${fighter.color}15` : undefined,
                boxShadow: isSelected ? `0 0 20px ${fighter.color}60, inset 0 0 20px ${fighter.color}20` : undefined,
              }}
            >
              <div className="text-xl">{fighter.emoji}</div>
              <div className="text-[8px] font-black tracking-widest text-white truncate w-full text-center">{fighter.name.slice(0,8).toUpperCase()}</div>
              {isP1 && <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 border border-black flex items-center justify-center text-[8px] font-black text-white">1</div>}
              {isP2 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border border-black flex items-center justify-center text-[8px] font-black text-white">2</div>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onSelect(['a4','a6'])}
          className="flex-1 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-bold tracking-widest text-zinc-300 hover:bg-zinc-700"
        >
          RESET: 🧠 vs ✨
        </button>
        <button
          onClick={() => onSelect(['human','a4'])}
          className="flex-1 h-8 rounded-full bg-yellow-400 border border-yellow-300 text-[10px] font-black tracking-widest text-black hover:bg-yellow-300"
        >
          YOU vs 🧠
        </button>
      </div>
    </div>
  );
}
