import { Position, Direction, AgentConfig, GameEvent } from './types';

export type Snake = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  body: Position[]; // head first
  dir: Direction;
  alive: boolean;
  score: number;
  kills: number;
  grew: boolean;
};

export type Food = {
  id: string;
  pos: Position;
  value: number;
  type: 'coin' | 'gem' | 'power';
};

export type SnakeConfig = {
  width: number;
  height: number;
  maxTurns: number;
  foodCount: number;
  seed?: number;
  initialLength: number;
};

export type SnakeStateSnapshot = {
  turn: number;
  snakes: Snake[];
  foods: Food[];
  events: GameEvent[];
};

export type SnakeState = {
  config: SnakeConfig;
  turn: number;
  snakes: Snake[];
  foods: Food[];
  events: GameEvent[];
  history: SnakeStateSnapshot[];
  winnerId?: string;
  isOver: boolean;
  seed: number;
};

export type SnakeAction = {
  snakeId: string;
  dir: Direction;
};

// Seeded RNG mulberry32
function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  stay: 'stay',
};

export class SnakeEngine {
  private rng: () => number;
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.rng = mulberry32(seed);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  static posKey(p: Position) { return `${p.x},${p.y}`; }

  static distance(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  static getNextPos(pos: Position, dir: Direction): Position {
    switch (dir) {
      case 'up': return { x: pos.x, y: pos.y - 1 };
      case 'down': return { x: pos.x, y: pos.y + 1 };
      case 'left': return { x: pos.x - 1, y: pos.y };
      case 'right': return { x: pos.x + 1, y: pos.y };
      case 'stay': return { ...pos };
    }
  }

  private isValidPos(pos: Position, config: SnakeConfig): boolean {
    return pos.x >= 0 && pos.x < config.width && pos.y >= 0 && pos.y < config.height;
  }

  private randomEmptyPos(occupied: Set<string>, config: SnakeConfig): Position {
    let attempts = 0;
    while (attempts < 1000) {
      const pos = { x: this.randInt(0, config.width - 1), y: this.randInt(0, config.height - 1) };
      const key = SnakeEngine.posKey(pos);
      if (!occupied.has(key)) {
        occupied.add(key);
        return pos;
      }
      attempts++;
    }
    return { x: this.randInt(0, config.width - 1), y: this.randInt(0, config.height - 1) };
  }

  createInitialState(agentConfigs: AgentConfig[], config: SnakeConfig): SnakeState {
    const occupied = new Set<string>();
    const snakes: Snake[] = [];

    for (const ac of agentConfigs) {
      // Find space for snake of initialLength
      let head: Position | null = null;
      let body: Position[] = [];
      let dir: Direction = 'right';
      let tries = 0;
      const dirs: Direction[] = ['up','down','left','right'];

      while (tries < 500) {
        const h = { x: this.randInt(2, config.width - 3), y: this.randInt(2, config.height - 3) };
        const d = dirs[this.randInt(0, dirs.length - 1)];
        // Build body opposite of dir
        let ok = true;
        const b: Position[] = [h];
        let cur = h;
        for (let i = 1; i < config.initialLength; i++) {
          const opp = OPPOSITE[d];
          cur = SnakeEngine.getNextPos(cur, opp);
          if (!this.isValidPos(cur, config)) { ok = false; break; }
          const key = SnakeEngine.posKey(cur);
          if (occupied.has(key)) { ok = false; break; }
          // check overlap with other snakes already placed
          if (b.some(p => p.x===cur.x && p.y===cur.y)) { ok = false; break; }
          b.push({ ...cur });
        }
        if (ok && !occupied.has(SnakeEngine.posKey(h))) {
          head = h;
          body = b;
          dir = d;
          // mark occupied
          for (const p of b) occupied.add(SnakeEngine.posKey(p));
          break;
        }
        tries++;
      }

      if (!head) {
        // fallback
        head = this.randomEmptyPos(occupied, config);
        body = [head];
        dir = 'right';
      }

      snakes.push({
        id: ac.id,
        name: ac.name,
        color: ac.color,
        emoji: ac.emoji,
        body,
        dir,
        alive: true,
        score: 0,
        kills: 0,
        grew: false,
      });
    }

    const foods: Food[] = [];
    for (let i = 0; i < config.foodCount; i++) {
      const types: Array<Food['type']> = ['coin','coin','coin','gem','power'];
      const type = types[this.randInt(0, types.length - 1)];
      const value = type==='coin'?10:type==='gem'?25:50;
      foods.push({
        id: `food-${i}-${this.randInt(0,99999)}`,
        pos: this.randomEmptyPos(occupied, config),
        value,
        type,
      });
    }

    const state: SnakeState = {
      config,
      turn: 0,
      snakes,
      foods,
      events: [{ turn: 0, type: 'spawn', message: `🐍 SNAKE ARENA started with ${snakes.length} snakes!` }],
      history: [],
      isOver: false,
      seed: this.seed,
    };
    state.history.push(this.snapshot(state));
    return state;
  }

  private snapshot(state: SnakeState): SnakeStateSnapshot {
    return {
      turn: state.turn,
      snakes: state.snakes.map(s => ({ ...s, body: s.body.map(p=>({ ...p })), dir: s.dir })),
      foods: state.foods.map(f => ({ ...f, pos: { ...f.pos } })),
      events: [...state.events],
    };
  }

  getValidDirs(snake: Snake, config: SnakeConfig): Direction[] {
    const all: Direction[] = ['up','down','left','right'];
    const opp = OPPOSITE[snake.dir];
    // can't reverse unless length 1
    return all.filter(d => {
      if (snake.body.length > 1 && d === opp) return false;
      const np = SnakeEngine.getNextPos(snake.body[0], d);
      if (!this.isValidPos(np, config)) return false;
      return true;
    });
  }

  applyTurn(state: SnakeState, actions: SnakeAction[]): SnakeState {
    if (state.isOver) return state;

    const turn = state.turn + 1;
    const newState: SnakeState = {
      ...state,
      snakes: state.snakes.map(s => ({
        ...s,
        body: s.body.map(p=>({ ...p })),
      })),
      foods: state.foods.map(f=>({ ...f, pos: { ...f.pos } })),
      events: [],
      turn,
    };

    const actionMap = new Map(actions.map(a => [a.snakeId, a.dir]));

    // Determine intended dirs
    const intendedDirs = new Map<string, Direction>();
    for (const snake of newState.snakes) {
      if (!snake.alive) continue;
      let dir = actionMap.get(snake.id) || snake.dir;
      // prevent reverse
      if (snake.body.length > 1 && dir === OPPOSITE[snake.dir]) {
        dir = snake.dir;
      }
      intendedDirs.set(snake.id, dir);
      snake.dir = dir;
    }

    // Compute proposed heads
    const proposedHeads = new Map<string, Position>();
    const headKeys = new Map<string, string[]>(); // posKey -> snakeIds going there

    for (const snake of newState.snakes) {
      if (!snake.alive) continue;
      const dir = intendedDirs.get(snake.id)!;
      const newHead = SnakeEngine.getNextPos(snake.body[0], dir);
      proposedHeads.set(snake.id, newHead);
      const key = SnakeEngine.posKey(newHead);
      if (!headKeys.has(key)) headKeys.set(key, []);
      headKeys.get(key)!.push(snake.id);
    }

    // Build occupied set for collision (after move, excluding tails of non-growing snakes)
    // First check which snakes will grow
    const willGrow = new Set<string>();
    const foodByPos = new Map<string, Food>();
    for (const f of newState.foods) foodByPos.set(SnakeEngine.posKey(f.pos), f);

    for (const [snakeId, head] of proposedHeads) {
      const key = SnakeEngine.posKey(head);
      if (foodByPos.has(key)) willGrow.add(snakeId);
    }

    // Build body occupied for collision detection
    const occupiedAfter = new Set<string>();
    // For collision we need to consider:
    // - All current bodies, but tails of snakes that won't grow and are moving will be freed
    // So we add all body positions except tails of non-growing snakes
    for (const snake of newState.snakes) {
      if (!snake.alive) continue;
      const grows = willGrow.has(snake.id);
      const bodyToKeep = grows ? snake.body : snake.body.slice(0, -1); // exclude tail if not growing
      for (const p of bodyToKeep) {
        occupiedAfter.add(SnakeEngine.posKey(p));
      }
    }

    const toKill = new Set<string>();

    // Check wall collision and self/body collision
    for (const [snakeId, head] of proposedHeads) {
      if (!this.isValidPos(head, state.config)) {
        toKill.add(snakeId);
        newState.events.push({
          turn,
          type: 'death',
          agentId: snakeId,
          message: `💥 ${newState.snakes.find(s=>s.id===snakeId)!.name} hit wall at (${head.x},${head.y})!`,
        });
        continue;
      }
      const key = SnakeEngine.posKey(head);
      if (occupiedAfter.has(key)) {
        // If it's own body (excluding tail) or other snake body
        toKill.add(snakeId);
        const snake = newState.snakes.find(s=>s.id===snakeId)!;
        newState.events.push({
          turn,
          type: 'death',
          agentId: snakeId,
          message: `💥 ${snake.name} crashed into body at (${head.x},${head.y})!`,
        });
      }
    }

    // Head-head collision: same cell
    for (const [key, ids] of headKeys) {
      if (ids.length > 1) {
        // all die in head-on
        for (const id of ids) {
          if (!toKill.has(id)) {
            newState.events.push({
              turn,
              type: 'attack',
              agentId: id,
              message: `💥 HEAD-ON COLLISION at ${key}! ${ids.length} snakes!`,
            });
          }
          toKill.add(id);
        }
      }
    }

    // Apply deaths
    for (const snake of newState.snakes) {
      if (toKill.has(snake.id)) {
        snake.alive = false;
        // killer gets points? For head-on, no. For body crash, maybe killer (owner of body) gets kill.
        // Find who owned the body at that pos
        const head = proposedHeads.get(snake.id)!;
        const headKey = SnakeEngine.posKey(head);
        // check other snakes bodies
        for (const other of newState.snakes) {
          if (other.id === snake.id) continue;
          if (!other.alive && !toKill.has(other.id)) continue; // already dead before?
          if (other.body.some(p => SnakeEngine.posKey(p) === headKey)) {
            other.kills++;
            other.score += 20;
          }
        }
      }
    }

    // Move survivors
    const remainingFoods: Food[] = [];
    const eatenFoods: Food[] = [];

    for (const food of newState.foods) {
      const key = SnakeEngine.posKey(food.pos);
      let eaten = false;
      for (const [snakeId, head] of proposedHeads) {
        if (toKill.has(snakeId)) continue;
        if (SnakeEngine.posKey(head) === key) {
          eaten = true;
          eatenFoods.push(food);
          const snake = newState.snakes.find(s=>s.id===snakeId)!;
          snake.score += food.value;
          snake.grew = true;
          if (food.type === 'power') {
            // power could give extra growth?
            snake.score += 10;
          }
          newState.events.push({
            turn,
            type: 'collect',
            agentId: snakeId,
            pos: food.pos,
            value: food.value,
            message: `${snake.name} ate ${food.type} (+${food.value}) at (${food.pos.x},${food.pos.y}) — length ${snake.body.length+1}`,
          });
          break;
        }
      }
      if (!eaten) remainingFoods.push(food);
    }

    newState.foods = remainingFoods;

    for (const snake of newState.snakes) {
      if (!snake.alive || toKill.has(snake.id)) continue;
      const head = proposedHeads.get(snake.id)!;
      snake.body.unshift(head);
      if (!willGrow.has(snake.id)) {
        snake.body.pop();
      } else {
        snake.grew = true;
      }
    }

    // Spawn new foods
    const occupiedForFood = new Set<string>();
    for (const s of newState.snakes) {
      if (!s.alive) continue;
      for (const p of s.body) occupiedForFood.add(SnakeEngine.posKey(p));
    }
    for (const f of newState.foods) occupiedForFood.add(SnakeEngine.posKey(f.pos));

    while (newState.foods.length < newState.config.foodCount + 1) {
      const pos = this.randomEmptyPos(occupiedForFood, newState.config);
      const types: Array<Food['type']> = ['coin','coin','coin','gem'];
      const type = types[this.randInt(0, types.length-1)];
      const value = type==='coin'?10:25;
      newState.foods.push({
        id: `food-${turn}-${this.randInt(0,9999)}`,
        pos,
        value,
        type,
      });
      newState.events.push({
        turn,
        type: 'spawn',
        pos,
        message: `New ${type} spawned at (${pos.x},${pos.y})`,
      });
      if (newState.foods.length >= newState.config.foodCount + 3) break;
    }

    // Check win condition
    const survivors = newState.snakes.filter(s=>s.alive);
    if (turn >= newState.config.maxTurns || survivors.length <= 1) {
      newState.isOver = true;
      if (survivors.length === 1) {
        newState.winnerId = survivors[0].id;
        newState.events.push({
          turn,
          type: 'death',
          message: `🏆 ${survivors[0].name} WINS! Length: ${survivors[0].body.length} Score: ${survivors[0].score}`,
        });
      } else if (survivors.length === 0) {
        newState.events.push({ turn, type: 'death', message: `Draw! No survivors.` });
      } else {
        const sorted = [...newState.snakes].sort((a,b)=>b.score - a.score || b.body.length - a.body.length);
        newState.winnerId = sorted[0].id;
        newState.events.push({
          turn,
          type: 'death',
          message: `⏰ Time's up! 🏆 ${sorted[0].name} wins by score (${sorted[0].score}) length ${sorted[0].body.length}`,
        });
      }
    }

    newState.history.push(this.snapshot(newState));
    return newState;
  }

  simulate(state: SnakeState, strategyMap: Map<string, (s: SnakeState, id: string) => Direction>, maxTurnsOverride?: number): SnakeState {
    let cur = state;
    const maxTurns = maxTurnsOverride ?? state.config.maxTurns;
    while (!cur.isOver && cur.turn < maxTurns) {
      const actions: SnakeAction[] = cur.snakes.filter(s=>s.alive).map(s=>{
        const fn = strategyMap.get(s.id);
        let dir: Direction = s.dir;
        try {
          dir = fn ? fn(cur, s.id) : s.dir;
        } catch {
          dir = s.dir;
        }
        return { snakeId: s.id, dir };
      });
      cur = this.applyTurn(cur, actions);
    }
    return cur;
  }
}

export const SNAKE_DEFAULT_CONFIG: SnakeConfig = {
  width: 20,
  height: 20,
  maxTurns: 300,
  foodCount: 3,
  initialLength: 4,
};

export const SNAKE_AGENT_PRESETS: AgentConfig[] = [
  { id: 'a1', name: 'RandomRandy', color: '#ef4444', emoji: '🎲' },
  { id: 'a2', name: 'GreedyGus', color: '#22c55e', emoji: '🐍' },
  { id: 'a3', name: 'HunterHazel', color: '#f97316', emoji: '👾' },
  { id: 'a4', name: 'StrategistSam', color: '#3b82f6', emoji: '🧠' },
  { id: 'a5', name: 'AvoiderAlex', color: '#a855f7', emoji: '👻' },
  { id: 'a6', name: 'MuseSpark', color: '#e5e7eb', emoji: '✨' },
];

export const SNAKE_HUMAN_PRESET: AgentConfig = { id: 'human', name: 'YOU', color: '#ffff00', emoji: '😎' };

export const SNAKE_AGENT_PRESETS_NO_LLM = SNAKE_AGENT_PRESETS.slice(0,5);

export const SNAKE_HUMAN_VS_BOTS = [
  SNAKE_HUMAN_PRESET,
  SNAKE_AGENT_PRESETS[0],
  SNAKE_AGENT_PRESETS[1],
  SNAKE_AGENT_PRESETS[3],
];
