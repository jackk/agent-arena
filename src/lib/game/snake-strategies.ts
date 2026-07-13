import { Direction, Position } from './types';
import { SnakeState, Snake, Food, SnakeEngine } from './snake-engine';

export type SnakeStrategy = {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  decide: (state: SnakeState, snakeId: string) => Direction;
};

const ALL_DIRS: Direction[] = ['up','down','left','right'];

function combineHash(...vals: number[]): number {
  let h = 2166136261;
  for (const v of vals) {
    h ^= v | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function deterministicFloat(turn: number, x: number, y: number, seed: number, salt=0): number {
  const h = combineHash(turn, x, y, seed, salt);
  return (h % 1000000) / 1000000;
}

function isOpposite(a: Direction, b: Direction): boolean {
  return (a==='up'&&b==='down')||(a==='down'&&b==='up')||(a==='left'&&b==='right')||(a==='right'&&b==='left');
}

function getValidDirs(state: SnakeState, snake: Snake): Direction[] {
  const engine = new SnakeEngine(state.seed);
  // reuse engine's valid logic but also avoid immediate body collision
  const valid: Direction[] = [];
  for (const d of ALL_DIRS) {
    if (snake.body.length>1 && isOpposite(d, snake.dir)) continue;
    const np = SnakeEngine.getNextPos(snake.body[0], d);
    if (np.x<0||np.x>=state.config.width||np.y<0||np.y>=state.config.height) continue;
    // check body collision (excluding tail that will move)
    const willGrow = state.foods.some(f=>SnakeEngine.posKey(f.pos)===SnakeEngine.posKey(np));
    const bodyCheck = willGrow ? snake.body : snake.body.slice(0,-1);
    if (bodyCheck.some(p=>p.x===np.x && p.y===np.y)) continue;
    // check other snakes bodies (including their heads? will be occupiedAfter excluding tails)
    // For quick check, avoid any occupied body
    let collision = false;
    for (const other of state.snakes) {
      if (!other.alive) continue;
      if (other.id===snake.id) continue;
      if (other.body.some(p=>p.x===np.x && p.y===np.y)) { collision = true; break; }
    }
    if (collision) continue;
    valid.push(d);
  }
  // if no valid, allow any non-opposite even if risky (to avoid stuck)
  if (valid.length===0) {
    for (const d of ALL_DIRS) {
      if (snake.body.length>1 && isOpposite(d, snake.dir)) continue;
      valid.push(d);
    }
  }
  if (valid.length===0) valid.push(snake.dir);
  return valid;
}

function nearestFood(from: Position, foods: Food[]) {
  if (foods.length===0) return null;
  let best: Food | null = null;
  let dist = Infinity;
  for (const f of foods) {
    const d = SnakeEngine.distance(from, f.pos);
    if (d<dist) { dist=d; best=f; }
  }
  return best ? { food: best, dist } : null;
}

function nearestEnemy(from: Position, snakes: Snake[], selfId: string) {
  const enemies = snakes.filter(s=>s.alive && s.id!==selfId);
  if (enemies.length===0) return null;
  let best: Snake | null = null;
  let dist = Infinity;
  for (const s of enemies) {
    const d = SnakeEngine.distance(from, s.body[0]);
    if (d<dist) { dist=d; best=s; }
  }
  return best ? { snake: best, dist } : null;
}

// BFS to food avoiding bodies
function bfsDirection(start: Position, target: Position, state: SnakeState, selfId: string): Direction | null {
  const visited = new Set<string>();
  const queue: { pos: Position; firstDir: Direction }[] = [];
  visited.add(SnakeEngine.posKey(start));

  // Build blocked set (all bodies except tails that will move and self tail)
  const blocked = new Set<string>();
  for (const s of state.snakes) {
    if (!s.alive) continue;
    const isSelf = s.id===selfId;
    // if self and we are checking BFS, exclude own tail if not growing (assume not growing for path)
    const body = isSelf ? s.body.slice(0,-1) : s.body;
    for (const p of body) blocked.add(SnakeEngine.posKey(p));
  }

  // initial dirs
  const order = [...ALL_DIRS].sort(()=>0.5 - deterministicFloat(state.turn, start.x, start.y, state.seed));
  for (const d of order) {
    if (isOpposite(d, state.snakes.find(s=>s.id===selfId)?.dir || 'up') && state.snakes.find(s=>s.id===selfId)!.body.length>1) continue;
    const np = SnakeEngine.getNextPos(start, d);
    const key = SnakeEngine.posKey(np);
    if (visited.has(key)) continue;
    if (blocked.has(key)) continue;
    if (np.x<0||np.x>=state.config.width||np.y<0||np.y>=state.config.height) continue;
    visited.add(key);
    if (np.x===target.x && np.y===target.y) return d;
    queue.push({ pos: np, firstDir: d });
  }

  while (queue.length>0) {
    const cur = queue.shift()!;
    for (const d of ALL_DIRS) {
      const np = SnakeEngine.getNextPos(cur.pos, d);
      const key = SnakeEngine.posKey(np);
      if (visited.has(key)) continue;
      if (blocked.has(key)) continue;
      if (np.x<0||np.x>=state.config.width||np.y<0||np.y>=state.config.height) continue;
      visited.add(key);
      if (np.x===target.x && np.y===target.y) return cur.firstDir;
      queue.push({ pos: np, firstDir: cur.firstDir });
    }
  }
  return null;
}

export const SnakeRandom: SnakeStrategy = {
  id: 'a1',
  name: 'RandomRandy',
  description: 'Random moves, chaotic but sometimes lucky',
  color: '#ef4444',
  emoji: '🎲',
  decide: (state, id) => {
    const snake = state.snakes.find(s=>s.id===id)!;
    const valid = getValidDirs(state, snake);
    const r = deterministicFloat(state.turn, snake.body[0].x, snake.body[0].y, state.seed, 7);
    return valid[Math.floor(r*valid.length)%valid.length];
  }
};

export const SnakeGreedy: SnakeStrategy = {
  id: 'a2',
  name: 'GreedyGus',
  description: 'BFS to nearest food',
  color: '#22c55e',
  emoji: '🐍',
  decide: (state, id) => {
    const snake = state.snakes.find(s=>s.id===id)!;
    const nf = nearestFood(snake.body[0], state.foods);
    if (!nf) {
      const valid = getValidDirs(state, snake);
      return valid[0] || snake.dir;
    }
    const bfs = bfsDirection(snake.body[0], nf.food.pos, state, id);
    if (bfs) return bfs;
    // fallback greedy
    const valid = getValidDirs(state, snake);
    let best = valid[0];
    let bestDist = Infinity;
    for (const d of valid) {
      const np = SnakeEngine.getNextPos(snake.body[0], d);
      const dist = SnakeEngine.distance(np, nf.food.pos);
      if (dist<bestDist) { bestDist=dist; best=d; }
    }
    return best;
  }
};

export const SnakeHunter: SnakeStrategy = {
  id: 'a3',
  name: 'HunterHazel',
  description: 'Tries to trap other snakes, aggressive',
  color: '#f97316',
  emoji: '👾',
  decide: (state, id) => {
    const snake = state.snakes.find(s=>s.id===id)!;
    const ne = nearestEnemy(snake.body[0], state.snakes, id);
    if (ne && ne.dist<5) {
      // try to move towards enemy head to block
      const bfs = bfsDirection(snake.body[0], ne.snake.body[0], state, id);
      if (bfs) {
        // 50% chase, 50% food
        if (deterministicFloat(state.turn, snake.body[0].x, snake.body[0].y, state.seed, 1) < 0.5) return bfs;
      }
    }
    return SnakeGreedy.decide(state,id);
  }
};

export const SnakeStrategist: SnakeStrategy = {
  id: 'a4',
  name: 'StrategistSam',
  description: 'Safest + food, best overall',
  color: '#3b82f6',
  emoji: '🧠',
  decide: (state, id) => {
    const snake = state.snakes.find(s=>s.id===id)!;
    const valid = getValidDirs(state, snake);
    if (valid.length===0) return snake.dir;
    let bestDir = valid[0];
    let bestScore = -Infinity;

    for (const d of valid) {
      const np = SnakeEngine.getNextPos(snake.body[0], d);
      let score = 0;
      // food attraction
      for (const f of state.foods) {
        const dist = SnakeEngine.distance(np, f.pos);
        score += f.value / (dist+1) * 2;
        if (dist===0) score+=50;
      }
      // avoid walls (distance to wall bonus)
      const wallDist = Math.min(np.x, np.y, state.config.width-1-np.x, state.config.height-1-np.y);
      score += wallDist*0.5;
      // avoid enemy heads
      for (const other of state.snakes) {
        if (!other.alive || other.id===id) continue;
        const dist = SnakeEngine.distance(np, other.body[0]);
        if (dist<=1) score-=30;
        else if (dist===2) score-=10;
      }
      // avoid crowded area (body density)
      let nearbyBodies = 0;
      for (const other of state.snakes) {
        if (!other.alive) continue;
        for (const b of other.body) {
          if (SnakeEngine.distance(np, b)<=2) nearbyBodies++;
        }
      }
      score -= nearbyBodies*2;

      if (score>bestScore) { bestScore=score; bestDir=d; }
    }
    return bestDir;
  }
};

export const SnakeAvoider: SnakeStrategy = {
  id: 'a5',
  name: 'AvoiderAlex',
  description: 'Maximizes space, survives longest',
  color: '#a855f7',
  emoji: '👻',
  decide: (state, id) => {
    const snake = state.snakes.find(s=>s.id===id)!;
    const valid = getValidDirs(state, snake);
    let best = valid[0];
    let bestScore = -Infinity;
    for (const d of valid) {
      const np = SnakeEngine.getNextPos(snake.body[0], d);
      // flood fill to count reachable space
      const visited = new Set<string>();
      const queue: Position[] = [np];
      visited.add(SnakeEngine.posKey(np));
      let count = 0;
      const blocked = new Set<string>();
      for (const s of state.snakes) {
        if (!s.alive) continue;
        for (const b of s.body) blocked.add(SnakeEngine.posKey(b));
      }
      // remove tail that will move for all snakes not growing? Simplify: keep blocked as is but allow np
      blocked.delete(SnakeEngine.posKey(np));
      while (queue.length>0 && count<50) {
        const cur = queue.shift()!;
        count++;
        for (const nd of ALL_DIRS) {
          const npp = SnakeEngine.getNextPos(cur, nd);
          const key = SnakeEngine.posKey(npp);
          if (visited.has(key)) continue;
          if (blocked.has(key)) continue;
          if (npp.x<0||npp.x>=state.config.width||npp.y<0||npp.y>=state.config.height) continue;
          visited.add(key);
          queue.push(npp);
        }
      }
      let score = count;
      // add food bonus
      for (const f of state.foods) {
        const dist = SnakeEngine.distance(np, f.pos);
        score += f.value/(dist+1);
      }
      if (score>bestScore) { bestScore=score; best=d; }
    }
    return best;
  }
};

export const SnakeMuseSpark: SnakeStrategy = {
  id: 'a6',
  name: 'MuseSpark',
  description: 'LLM reasoning or heuristic fallback',
  color: '#ffffff',
  emoji: '✨',
  decide: (state, id) => SnakeStrategist.decide(state,id),
};

export const SNAKE_ALL_STRATEGIES = [
  SnakeRandom,
  SnakeGreedy,
  SnakeHunter,
  SnakeStrategist,
  SnakeAvoider,
  SnakeMuseSpark,
];

export const SNAKE_STRATEGY_MAP: Record<string, SnakeStrategy> = {
  a1: SnakeRandom,
  a2: SnakeGreedy,
  a3: SnakeHunter,
  a4: SnakeStrategist,
  a5: SnakeAvoider,
  a6: SnakeMuseSpark,
  human: SnakeStrategist, // fallback
};

export function getSnakeStrategy(id: string) { return SNAKE_STRATEGY_MAP[id]; }
