import { GameConfig, GameState, AgentConfig, Position, AgentState, Resource, Direction, GameEvent, GameStateSnapshot, AgentAction } from './types';

// Seeded RNG - mulberry32
function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export class GameEngine {
  private rng: () => number;
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.rng = mulberry32(seed);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  private randomPos(width: number, height: number, occupied: Set<string>): Position {
    let attempts = 0;
    while (attempts < 1000) {
      const pos = { x: this.randInt(0, width - 1), y: this.randInt(0, height - 1) };
      const key = `${pos.x},${pos.y}`;
      if (!occupied.has(key)) {
        occupied.add(key);
        return pos;
      }
      attempts++;
    }
    // fallback
    return { x: this.randInt(0, width - 1), y: this.randInt(0, height - 1) };
  }

  createInitialState(agentConfigs: AgentConfig[], config: GameConfig): GameState {
    const occupied = new Set<string>();
    const agents: AgentState[] = agentConfigs.map(ac => ({
      id: ac.id,
      name: ac.name,
      color: ac.color,
      emoji: ac.emoji,
      pos: this.randomPos(config.width, config.height, occupied),
      health: 100,
      score: 0,
      alive: true,
      kills: 0,
    }));

    const resources: Resource[] = [];
    for (let i = 0; i < config.resourceCount; i++) {
      const types: Array<Resource['type']> = ['coin', 'coin', 'coin', 'gem', 'power'];
      const type = types[this.randInt(0, types.length - 1)];
      const value = type === 'coin' ? 10 : type === 'gem' ? 25 : 50;
      resources.push({
        id: `res-${i}-${Date.now()}`,
        pos: this.randomPos(config.width, config.height, occupied),
        value,
        type,
      });
    }

    const state: GameState = {
      config,
      turn: 0,
      agents,
      resources,
      events: [{ turn: 0, type: 'spawn', message: `Game started with ${agents.length} agents!` }],
      history: [],
      isOver: false,
      seed: this.seed,
    };
    state.history.push(this.snapshot(state));
    return state;
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

  private isValidPos(pos: Position, config: GameConfig): boolean {
    return pos.x >= 0 && pos.x < config.width && pos.y >= 0 && pos.y < config.height;
  }

  applyTurn(state: GameState, actions: AgentAction[]): GameState {
    if (state.isOver) return state;

    const newState: GameState = {
      ...state,
      agents: state.agents.map(a => ({ ...a, pos: { ...a.pos } })),
      resources: state.resources.map(r => ({ ...r, pos: { ...r.pos } })),
      events: [],
    };

    const turn = state.turn + 1;
    newState.turn = turn;

    // Map actions
    const actionMap = new Map(actions.map(a => [a.agentId, a.dir]));

    // Compute proposed positions
    const proposed = new Map<string, Position>();
    const occupiedProposed = new Map<string, string[]>(); // posKey -> agentIds

    for (const agent of newState.agents) {
      if (!agent.alive) continue;
      const dir = actionMap.get(agent.id) || 'stay';
      let nextPos = GameEngine.getNextPos(agent.pos, dir);
      if (!this.isValidPos(nextPos, state.config)) {
        nextPos = agent.pos; // stay if invalid
      }
      proposed.set(agent.id, nextPos);
      const key = GameEngine.posKey(nextPos);
      if (!occupiedProposed.has(key)) occupiedProposed.set(key, []);
      occupiedProposed.get(key)!.push(agent.id);
    }

    // Resolve collisions: if multiple agents want same cell, none move (stay)
    for (const [key, agentIds] of occupiedProposed) {
      if (agentIds.length > 1) {
        // collision - revert to original pos
        for (const id of agentIds) {
          const agent = newState.agents.find(a => a.id === id)!;
          proposed.set(id, agent.pos);
        }
        newState.events.push({
          turn,
          type: 'move',
          message: `Collision at ${key}! ${agentIds.length} agents blocked.`
        });
      }
    }

    // Apply moves, check for position swap collisions (optional - keep simple)
    for (const agent of newState.agents) {
      if (!agent.alive) continue;
      const next = proposed.get(agent.id)!;
      if (next.x !== agent.pos.x || next.y !== agent.pos.y) {
        newState.events.push({
          turn,
          type: 'move',
          agentId: agent.id,
          pos: next,
          message: `${agent.name} moved ${actionMap.get(agent.id)} to (${next.x},${next.y})`
        });
      }
      agent.pos = next;
    }

    // Resource collection
    const remainingResources: Resource[] = [];
    for (const res of newState.resources) {
      const collector = newState.agents.find(a => a.alive && a.pos.x === res.pos.x && a.pos.y === res.pos.y);
      if (collector) {
        collector.score += res.value;
        if (res.type === 'power') collector.health = Math.min(100, collector.health + 30);
        newState.events.push({
          turn,
          type: 'collect',
          agentId: collector.id,
          pos: res.pos,
          value: res.value,
          message: `${collector.name} collected ${res.type} (+${res.value}) at (${res.pos.x},${res.pos.y})`
        });
      } else {
        remainingResources.push(res);
      }
    }
    newState.resources = remainingResources;

    // Combat: adjacent agents attack each other
    const aliveAgents = newState.agents.filter(a => a.alive);
    for (let i = 0; i < aliveAgents.length; i++) {
      for (let j = i + 1; j < aliveAgents.length; j++) {
        const a1 = aliveAgents[i];
        const a2 = aliveAgents[j];
        if (GameEngine.distance(a1.pos, a2.pos) === 1) {
          // mutual attack
          const dmg1 = 20 + this.randInt(0, 10);
          const dmg2 = 20 + this.randInt(0, 10);
          a1.health -= dmg2;
          a2.health -= dmg1;

          newState.events.push({
            turn,
            type: 'attack',
            agentId: a1.id,
            targetId: a2.id,
            message: `${a1.name} ⚔️ ${a2.name} (${dmg1} dmg)`
          });
          newState.events.push({
            turn,
            type: 'attack',
            agentId: a2.id,
            targetId: a1.id,
            message: `${a2.name} ⚔️ ${a1.name} (${dmg2} dmg)`
          });

          if (a1.health <= 0) {
            a1.alive = false;
            a1.health = 0;
            a2.kills += 1;
            a2.score += 50;
            newState.events.push({
              turn,
              type: 'death',
              agentId: a1.id,
              targetId: a2.id,
              message: `💀 ${a1.name} eliminated by ${a2.name}!`
            });
          }
          if (a2.health <= 0) {
            a2.alive = false;
            a2.health = 0;
            a1.kills += 1;
            a1.score += 50;
            newState.events.push({
              turn,
              type: 'death',
              agentId: a2.id,
              targetId: a1.id,
              message: `💀 ${a2.name} eliminated by ${a1.name}!`
            });
          }
        }
      }
    }

    // Spawn new resources occasionally
    if (turn % 5 === 0 && newState.resources.length < newState.config.resourceCount + 2) {
      const occupied = new Set(newState.agents.map(a => GameEngine.posKey(a.pos)).concat(newState.resources.map(r => GameEngine.posKey(r.pos))));
      const types: Array<Resource['type']> = ['coin', 'coin', 'gem'];
      const type = types[this.randInt(0, types.length - 1)];
      const value = type === 'coin' ? 10 : 25;
      const newRes: Resource = {
        id: `res-${turn}-${this.randInt(0, 9999)}`,
        pos: this.randomPos(newState.config.width, newState.config.height, occupied),
        value,
        type,
      };
      newState.resources.push(newRes);
      newState.events.push({
        turn,
        type: 'spawn',
        pos: newRes.pos,
        message: `New ${type} spawned at (${newRes.pos.x},${newRes.pos.y})`
      });
    }

    // Check win condition
    const survivors = newState.agents.filter(a => a.alive);
    if (turn >= newState.config.maxTurns || survivors.length <= 1) {
      newState.isOver = true;
      if (survivors.length === 1) {
        newState.winnerId = survivors[0].id;
        newState.events.push({
          turn,
          type: 'death',
          message: `🏆 ${survivors[0].name} wins! Score: ${survivors[0].score}`
        });
      } else if (survivors.length === 0) {
        newState.events.push({ turn, type: 'death', message: `Draw! No survivors.` });
      } else {
        // highest score wins
        const sorted = [...newState.agents].sort((a, b) => b.score - a.score);
        newState.winnerId = sorted[0].id;
        newState.events.push({
          turn,
          type: 'death',
          message: `⏰ Time's up! 🏆 ${sorted[0].name} wins by score (${sorted[0].score})`
        });
      }
    }

    newState.history.push(this.snapshot(newState));
    return newState;
  }

  private snapshot(state: GameState): GameStateSnapshot {
    return {
      turn: state.turn,
      agents: state.agents.map(a => ({ ...a, pos: { ...a.pos } })),
      resources: state.resources.map(r => ({ ...r, pos: { ...r.pos } })),
      events: [...state.events],
    };
  }

  simulate(state: GameState, strategyMap: Map<string, (s: GameState, id: string) => Direction>, maxTurnsOverride?: number): GameState {
    let cur = state;
    const maxTurns = maxTurnsOverride ?? state.config.maxTurns;
    while (!cur.isOver && cur.turn < maxTurns) {
      const actions: AgentAction[] = cur.agents.filter(a => a.alive).map(a => {
        const fn = strategyMap.get(a.id);
        let dir: Direction = 'stay';
        try {
          dir = fn ? fn(cur, a.id) : (['up', 'down', 'left', 'right', 'stay'] as Direction[])[this.randInt(0, 4)];
        } catch {
          dir = 'stay';
        }
        return { agentId: a.id, dir };
      });
      cur = this.applyTurn(cur, actions);
    }
    return cur;
  }
}

export const DEFAULT_CONFIG: GameConfig = {
  width: 12,
  height: 12,
  maxTurns: 100,
  resourceCount: 12,
};

export const AGENT_PRESETS: AgentConfig[] = [
  { id: 'a1', name: 'RandomRandy', color: '#ef4444', emoji: '🎲' },
  { id: 'a2', name: 'GreedyGus', color: '#22c55e', emoji: '💰' },
  { id: 'a3', name: 'HunterHazel', color: '#f97316', emoji: '⚔️' },
  { id: 'a4', name: 'StrategistSam', color: '#3b82f6', emoji: '🧠' },
  { id: 'a5', name: 'AvoiderAlex', color: '#a855f7', emoji: '👻' },
];
