// @ts-nocheck
"use client";
import { SnakeState } from '@/lib/game/snake-engine';

type Props = {
  state: SnakeState;
  selectedId?: string;
  onSelect?: (id: string) => void;
  showCoords?: boolean;
};

export default function SnakeBoard2D({ state, selectedId, onSelect, showCoords }: Props) {
  const { config, snakes, foods } = state;

  const snakeByPos = new Map<string, { snake: typeof snakes[0]; idx: number }>();
  const foodByPos = new Map<string, typeof foods[0]>();

  for (const s of snakes) {
    if (!s.alive) continue;
    s.body.forEach((p, idx) => {
      // only keep first occurrence (head wins)
      const key = `${p.x},${p.y}`;
      if (!snakeByPos.has(key)) snakeByPos.set(key, { snake: s, idx });
    });
  }
  for (const f of foods) {
    foodByPos.set(`${f.pos.x},${f.pos.y}`, f);
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black border-2 border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col">
      <div className="shrink-0 h-7 flex items-center justify-between px-2.5 bg-zinc-950 border-b border-zinc-800 text-[10px] font-mono">
        <span className="text-cyan-400 font-bold">CLASSIC SNAKE • TURN {state.turn}/{config.maxTurns}</span>
        <span className="text-zinc-500">{foods.length} FOODS • {snakes.filter(s=>s.alive).length} ALIVE</span>
      </div>

      <div className="flex-1 min-h-0 p-1 bg-[#050505] grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${config.width}, minmax(0,1fr))` }}>
        {Array.from({ length: config.height }).map((_, y) =>
          Array.from({ length: config.width }).map((_, x) => {
            const key = `${x},${y}`;
            const cellSnake = snakeByPos.get(key);
            const food = foodByPos.get(key);
            const isHead = cellSnake && cellSnake.idx === 0;
            const snake = cellSnake?.snake;
            const isSelected = snake && selectedId === snake.id;

            let bg = 'bg-zinc-950';
            let content: any = null;

            if (snake) {
              if (isHead) {
                bg = '';
              } else {
                bg = '';
              }
              content = (
                <div
                  className={`w-full h-full rounded-[3px] flex items-center justify-center text-[10px] font-black border transition-all ${isSelected ? 'ring-1 ring-white' : ''}`}
                  style={{
                    background: isHead
                      ? `radial-gradient(circle at 30% 30%, ${snake.color}, ${snake.color}aa)`
                      : `linear-gradient(180deg, ${snake.color}dd, ${snake.color}88)`,
                    borderColor: snake.color,
                    boxShadow: isHead ? `0 0 8px ${snake.color}` : undefined,
                    opacity: snake.id === 'human' ? 1 : 0.9,
                  }}
                >
                  {isHead ? <span className="text-[12px] leading-none">{snake.emoji}</span> : null}
                </div>
              );
            } else if (food) {
              content = (
                <div className="w-full h-full rounded-[3px] flex items-center justify-center animate-pulse" style={{ background: `radial-gradient(circle, ${food.type==='coin'?'#facc15':'#60a5fa'} 0%, #000 70%)` }}>
                  <span className="text-[10px]">{food.type==='coin'?'💰':'💎'}</span>
                </div>
              );
            } else {
              content = <div className="w-full h-full bg-zinc-950/50 rounded-[2px]" />;
            }

            return (
              <div key={key} onClick={() => snake && onSelect?.(snake.id)} className="aspect-square relative cursor-pointer">
                {content}
                {showCoords && <span className="absolute top-0 left-0 text-[5px] font-mono text-white/20">{x},{y}</span>}
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 h-6 flex items-center justify-center gap-2 px-2 bg-zinc-950 border-t border-zinc-800 text-[9px] font-mono text-zinc-500">
        <span>💰10</span><span className="text-zinc-700">•</span><span>💎25</span><span className="text-zinc-700">•</span><span>WALL=DEATH</span><span className="text-zinc-700">•</span><span>BODY=DEATH</span><span className="text-zinc-700">•</span><span>EAT=GROW</span>
      </div>
    </div>
  );
}
