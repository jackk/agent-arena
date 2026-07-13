import {
  GameState,
  Direction,
  Position,
  AgentStrategy,
  AgentState,
  Resource,
} from '../game/types';
import { GameEngine } from '../game/engine';

/**
 * Agent Arena - Strategy Implementations
 * 5 distinct personalities: RandomRandy, GreedyGus, HunterHazel, StrategistSam, AvoiderAlex
 * Deterministic - no Math.random, uses hash(turn + pos + seed) for tie-breaking.
 */

const ALL_DIRS: Direction[] = ['up', 'down', 'left', 'right', 'stay'];
const MOVE_DIRS: Direction[] = ['up', 'down', 'left', 'right'];

// ---------- Deterministic helpers ----------

/** Simple integer hash - xorshift style, deterministic */
function hashInt(n: number): number {
  n = n | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = n ^ (n >>> 16);
  return n >>> 0; // unsigned 32-bit
}

/** Combine several numbers into one deterministic hash */
function combineHash(...vals: number[]): number {
  let h = 2166136261;
  for (const v of vals) {
    h ^= v | 0;
    h = Math.imul(h, 16777619);
  }
  return hashInt(h);
}

/** Pseudo-random float [0,1) deterministic from game state */
function deterministicFloat(
  turn: number,
  x: number,
  y: number,
  seed: number,
  salt = 0
): number {
  const h = combineHash(turn, x, y, seed, salt);
  return (h % 1000000) / 1000000;
}

function isValidPos(pos: Position, cfg: GameState['config']): boolean {
  return pos.x >= 0 && pos.x < cfg.width && pos.y >= 0 && pos.y < cfg.height;
}

function getValidDirections(state: GameState, agentPos: Position): Direction[] {
  return ALL_DIRS.filter((d) => {
    const np = GameEngine.getNextPos(agentPos, d);
    // stay is always valid
    if (d === 'stay') return true;
    return isValidPos(np, state.config);
  });
}

function getAliveEnemies(state: GameState, selfId: string): AgentState[] {
  return state.agents.filter((a) => a.alive && a.id !== selfId);
}

function getNearest<T extends { pos: Position }>(
  from: Position,
  items: T[]
): { item: T; dist: number } | null {
  if (items.length === 0) return null;
  let best: T | null = null;
  let bestDist = Infinity;
  for (const it of items) {
    const d = GameEngine.distance(from, it.pos);
    if (d < bestDist) {
      bestDist = d;
      best = it;
    }
  }
  return best ? { item: best, dist: bestDist } : null;
}

function getNearestResource(
  from: Position,
  resources: Resource[]
): { item: Resource; dist: number } | null {
  if (resources.length === 0) return null;
  let best: Resource | null = null;
  let bestDist = Infinity;
  let bestVal = -1;
  for (const r of resources) {
    const d = GameEngine.distance(from, r.pos);
    // tie-breaker: higher value wins
    if (d < bestDist || (d === bestDist && r.value > bestVal)) {
      bestDist = d;
      best = r;
      bestVal = r.value;
    }
  }
  return best ? { item: best, dist: bestDist } : null;
}

function getNearestEnemy(
  from: Position,
  enemies: AgentState[]
): { item: AgentState; dist: number } | null {
  if (enemies.length === 0) return null;
  let best: AgentState | null = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    const d = GameEngine.distance(from, e.pos);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best ? { item: best, dist: bestDist } : null;
}

// ---------- Pathfinding (BFS-ready, greedy fallback) ----------

/**
 * BFS to find first step direction towards target.
 * Supports future walls via isBlocked callback (currently only checks board edges).
 * Falls back to greedy best-direction if no path found.
 */
function bfsNextDirection(
  start: Position,
  target: Position,
  config: GameState['config'],
  turn: number,
  seed: number,
  isBlocked?: (p: Position) => boolean
): Direction {
  if (start.x === target.x && start.y === target.y) return 'stay';

  // BFS setup
  const blocked = isBlocked ?? (() => false);
  const visited = new Set<string>();
  const queue: Array<{ pos: Position; firstDir: Direction }> = [];

  visited.add(GameEngine.posKey(start));

  // deterministic dir order for BFS: shuffle based on hash of start->target
  const dirOrder = [...MOVE_DIRS];
  // stable deterministic shuffle using hash turn as salt
  const orderHash = combineHash(start.x, start.y, target.x, target.y, turn, seed);
  // simple insertion sort by hash per dir
  dirOrder.sort((a, b) => {
    const ha = combineHash(orderHash, a.charCodeAt(0));
    const hb = combineHash(orderHash, b.charCodeAt(0));
    return ha - hb;
  });

  for (const d of dirOrder) {
    const np = GameEngine.getNextPos(start, d);
    if (!isValidPos(np, config)) continue;
    if (blocked(np)) continue;
    const key = GameEngine.posKey(np);
    if (visited.has(key)) continue;
    visited.add(key);
    if (np.x === target.x && np.y === target.y) return d;
    queue.push({ pos: np, firstDir: d });
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const d of dirOrder) {
      const np = GameEngine.getNextPos(cur.pos, d);
      if (!isValidPos(np, config)) continue;
      if (blocked(np)) continue;
      const key = GameEngine.posKey(np);
      if (visited.has(key)) continue;
      visited.add(key);
      if (np.x === target.x && np.y === target.y) return cur.firstDir;
      queue.push({ pos: np, firstDir: cur.firstDir });
    }
  }

  // No BFS path found -> greedy best move minimizing Manhattan distance
  return greedyDirectionToward(start, target, config, turn, seed);
}

/**
 * Greedy - picks direction minimizing Manhattan distance to target,
 * avoids walls/edges, deterministic tie-break.
 */
function greedyDirectionToward(
  from: Position,
  target: Position,
  config: GameState['config'],
  turn: number,
  seed: number,
  allowedDirs: Direction[] = MOVE_DIRS
): Direction {
  let bestDir: Direction = 'stay';
  let bestDist = GameEngine.distance(from, target);
  let bestHash = -1;

  // Consider also staying? Greedy normally ignores stay unless at target
  // We'll evaluate MOVE_DIRS only, but fallback to stay if no improvement
  for (const d of allowedDirs) {
    if (d === 'stay') continue;
    const np = GameEngine.getNextPos(from, d);
    if (!isValidPos(np, config)) continue;
    const dist = GameEngine.distance(np, target);
    const h = combineHash(turn, from.x, from.y, seed, d.charCodeAt(0));
    // minimize distance, tie-break by hash for determinism
    if (dist < bestDist || (dist === bestDist && (int32(h) > bestHash))) {
      bestDist = dist;
      bestDir = d;
      bestHash = int32(h);
    }
  }

  return bestDir;
}

function int32(n: number): number {
  return n | 0;
}

// ---------- Strategy Implementations ----------

/**
 * a1 - RandomRandy
 * Pure random, but deterministic via hash(turn + pos + seed)
 */
export const RandomRandy: AgentStrategy = {
  id: 'a1',
  name: 'RandomRandy',
  description: 'Chaos incarnate. Moves completely at random, unpredictable but occasionally lucky.',
  color: '#ef4444',
  emoji: '🎲',
  decide: (state: GameState, agentId: string): Direction => {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent || !agent.alive) return 'stay';

    const valid = getValidDirections(state, agent.pos);
    if (valid.length === 0) return 'stay';

    // deterministic pseudo random index
    const r = deterministicFloat(state.turn, agent.pos.x, agent.pos.y, state.seed, 7);
    const idx = Math.floor(r * valid.length) % valid.length;
    return valid[idx];
  },
};

/**
 * a2 - GreedyGus
 * Always moves toward nearest resource using Manhattan distance,
 * BFS pathfinding ready for walls.
 */
export const GreedyGus: AgentStrategy = {
  id: 'a2',
  name: 'GreedyGus',
  description: 'Single-minded collector. Always rushes the nearest resource, efficient but blind to danger.',
  color: '#22c55e',
  emoji: '💰',
  decide: (state: GameState, agentId: string): Direction => {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent || !agent.alive) return 'stay';

    const nearest = getNearestResource(agent.pos, state.resources);
    if (!nearest) {
      // no resources - move toward center deterministically
      const center: Position = {
        x: Math.floor(state.config.width / 2),
        y: Math.floor(state.config.height / 2),
      };
      const valid = getValidDirections(state, agent.pos);
      if (agent.pos.x === center.x && agent.pos.y === center.y) {
        // at center, wander deterministic
        const dirs = valid.filter((d) => d !== 'stay');
        if (dirs.length === 0) return 'stay';
        const idx = combineHash(state.turn, agent.pos.x, agent.pos.y, state.seed) % dirs.length;
        return dirs[idx];
      }
      return bfsNextDirection(agent.pos, center, state.config, state.turn, state.seed);
    }

    // BFS towards nearest resource
    return bfsNextDirection(
      agent.pos,
      nearest.item.pos,
      state.config,
      state.turn,
      state.seed
    );
  },
};

/**
 * a3 - HunterHazel
 * Chases nearest alive enemy agent. If no enemies, falls back to resource hunting.
 */
export const HunterHazel: AgentStrategy = {
  id: 'a3',
  name: 'HunterHazel',
  description: 'Relentless predator. Hunts the nearest enemy, thrives in combat, restless when alone.',
  color: '#f97316',
  emoji: '⚔️',
  decide: (state: GameState, agentId: string): Direction => {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent || !agent.alive) return 'stay';

    const enemies = getAliveEnemies(state, agentId);
    if (enemies.length > 0) {
      const nearest = getNearestEnemy(agent.pos, enemies);
      if (nearest) {
        // chase enemy
        return bfsNextDirection(
          agent.pos,
          nearest.item.pos,
          state.config,
          state.turn,
          state.seed
        );
      }
    }

    // fallback: resource greedy
    const nearestRes = getNearestResource(agent.pos, state.resources);
    if (nearestRes) {
      return bfsNextDirection(
        agent.pos,
        nearestRes.item.pos,
        state.config,
        state.turn,
        state.seed
      );
    }

    // wander toward center
    const center: Position = {
      x: Math.floor(state.config.width / 2),
      y: Math.floor(state.config.height / 2),
    };
    return bfsNextDirection(agent.pos, center, state.config, state.turn, state.seed);
  },
};

/**
 * a4 - StrategistSam
 * Evaluates board with scoring: resource hunting + enemy avoidance + health awareness.
 * Strongest heuristic.
 */
export const StrategistSam: AgentStrategy = {
  id: 'a4',
  name: 'StrategistSam',
  description: 'Master tactician. Balances resource greed, enemy avoidance, and opportunistic hunting with health awareness.',
  color: '#3b82f6',
  emoji: '🧠',
  decide: (state: GameState, agentId: string): Direction => {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent || !agent.alive) return 'stay';

    const enemies = getAliveEnemies(state, agentId);
    const validDirs = getValidDirections(state, agent.pos);

    // Precompute old distances for comparison
    const oldNearestEnemy = getNearestEnemy(agent.pos, enemies);
    const oldMinEnemyDist = oldNearestEnemy?.dist ?? 999;

    let bestDir: Direction = 'stay';
    let bestScore = -Infinity;

    for (const dir of validDirs) {
      const newPos = GameEngine.getNextPos(agent.pos, dir);
      if (!isValidPos(newPos, state.config)) continue;

      let score = 0;

      // ---- Resource scoring ----
      let nearestResDist = Infinity;
      let resourceScore = 0;
      let powerGemBonus = 0;

      for (const res of state.resources) {
        const d = GameEngine.distance(newPos, res.pos);
        nearestResDist = Math.min(nearestResDist, d);
        // value weighted contribution from all resources
        resourceScore += res.value / (d + 1);
        // power gem special when low health
        if (res.type === 'power' && agent.health < 70) {
          powerGemBonus += 50 / (d + 1);
        }
      }

      if (state.resources.length > 0) {
        // primary: inverse distance to nearest
        score += 100 / (nearestResDist + 1);
        // secondary: density score
        score += resourceScore * 2;
        // power gem bonus
        score += powerGemBonus;

        // bonus for landing on resource
        if (nearestResDist === 0) score += 60;
      }

      // ---- Enemy awareness ----
      let minEnemyDist = Infinity;
      let avgEnemyDist = 0;
      let weakEnemyChaseBonus = 0;

      if (enemies.length > 0) {
        for (const e of enemies) {
          const d = GameEngine.distance(newPos, e.pos);
          minEnemyDist = Math.min(minEnemyDist, d);
          avgEnemyDist += d;

          // opportunistic: if enemy weak and we are healthier, reward moving closer
          if (e.health < 35 && agent.health > 60) {
            const oldD = GameEngine.distance(agent.pos, e.pos);
            if (d < oldD) {
              // closer to weak enemy = good
              weakEnemyChaseBonus += 35 / (d + 1);
            }
          }
        }
        avgEnemyDist /= enemies.length;

        // health-aware penalties
        if (agent.health < 40) {
          // very scared
          if (minEnemyDist <= 1) score -= 250;
          else if (minEnemyDist === 2) score -= 100;
          else if (minEnemyDist === 3) score -= 35;
          // reward increasing distance
          if (minEnemyDist > oldMinEnemyDist) score += 30;
          if (minEnemyDist > 4) score += 15;
        } else if (agent.health < 70) {
          // cautious
          if (minEnemyDist <= 1) score -= 90;
          else if (minEnemyDist === 2) score -= 25;
          // slight reward for kiting
          if (minEnemyDist >= 3 && minEnemyDist <= 5) score += 8;
        } else {
          // healthy - tolerant of proximity, but avoid instant adjacency unless hunting
          if (minEnemyDist <= 1) {
            // if hunting weak enemy, okay, else small penalty
            if (weakEnemyChaseBonus === 0) score -= 15;
          }
        }

        // general safety - more distance is safer
        score += Math.min(avgEnemyDist, 10) * 1.3;
        score += Math.min(minEnemyDist, 6) * 1.8;

        // add chase bonus
        score += weakEnemyChaseBonus;

        // crowding penalty: many enemies within 2?
        const crowding = enemies.filter(
          (e) => GameEngine.distance(newPos, e.pos) <= 2
        ).length;
        if (crowding >= 2) {
          const penalty = agent.health < 50 ? 40 * crowding : 15 * crowding;
          score -= penalty;
        }
      } else {
        // no enemies: small bonus for staying safe/center?
        score += 10;
      }

      // ---- Positional / strategic ----
      // Center control when resources low
      if (state.resources.length < 4) {
        const center: Position = {
          x: Math.floor(state.config.width / 2),
          y: Math.floor(state.config.height / 2),
        };
        const distCenterNew = GameEngine.distance(newPos, center);
        const distCenterOld = GameEngine.distance(agent.pos, center);
        if (distCenterNew < distCenterOld) score += 6;
      }

      // Avoid edges when healthy and safe
      const edgeDist = Math.min(
        newPos.x,
        newPos.y,
        state.config.width - 1 - newPos.x,
        state.config.height - 1 - newPos.y
      );
      if (edgeDist === 0) {
        if (agent.health > 50 && minEnemyDist > 3) score -= 10;
        if (state.resources.length === 0) score -= 5;
      }

      // Penalize staying still unless it's really good (safe + resource on spot)
      if (dir === 'stay') {
        if (minEnemyDist <= 2) score -= 20; // don't just sit when threatened
        else if (nearestResDist > 2) score -= 8; // don't idle far from resources
        else if (nearestResDist === 0) score += 25; // staying to collect? Actually collection is instant, but staying can be okay
        else score += 1;
      } else {
        // tiny movement bonus to avoid stagnation
        score += 0.5;
      }

      // ---- Deterministic tie breaker ----
      const tb = (combineHash(state.turn, newPos.x, newPos.y, state.seed, dir.length) % 1000) / 10000;
      score += tb;

      // ---- Choose best ----
      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      } else if (score === bestScore) {
        // deterministic tie break: higher hash wins
        const h1 = combineHash(state.turn, agent.pos.x, agent.pos.y, state.seed, bestDir.charCodeAt(0));
        const h2 = combineHash(state.turn, agent.pos.x, agent.pos.y, state.seed, dir.charCodeAt(0));
        if (h2 > h1) bestDir = dir;
      }
    }

    return bestDir;
  },
};

/**
 * a5 - AvoiderAlex
 * Tries to stay away from enemies, only collects resources when safe.
 * Flee radius 3, expands to 5 when low health.
 */
export const AvoiderAlex: AgentStrategy = {
  id: 'a5',
  name: 'AvoiderAlex',
  description: 'Elusive survivor. Keeps distance from enemies, gathers resources only when the coast is clear.',
  color: '#a855f7',
  emoji: '👻',
  decide: (state: GameState, agentId: string): Direction => {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent || !agent.alive) return 'stay';

    const enemies = getAliveEnemies(state, agentId);
    const validDirs = getValidDirections(state, agent.pos);

    // Determine flee threshold based on health
    const baseThreatRadius = agent.health < 50 ? 5 : 3;
    const nearestEnemy = getNearestEnemy(agent.pos, enemies);
    const isThreatened = nearestEnemy !== null && nearestEnemy.dist <= baseThreatRadius;

    if (isThreatened && enemies.length > 0) {
      // Flee: maximize distance from enemies
      let bestDir: Direction = 'stay';
      let bestScore = -Infinity;

      for (const dir of validDirs) {
        const np = GameEngine.getNextPos(agent.pos, dir);
        if (!isValidPos(np, state.config)) continue;

        let minDist = Infinity;
        let avgDist = 0;
        for (const e of enemies) {
          const d = GameEngine.distance(np, e.pos);
          minDist = Math.min(minDist, d);
          avgDist += d;
        }
        avgDist /= enemies.length;

        // Score: heavily weight min distance, then avg
        let score = minDist * 12 + avgDist * 2;

        // Extra bonus if increasing distance from nearest threat
        if (nearestEnemy) {
          const oldDist = nearestEnemy.dist;
          if (minDist > oldDist) score += 15;
          if (minDist === oldDist && dir !== 'stay') score += 2;
        }

        // Avoid moving into more crowded direction
        const nearbyCount = enemies.filter((e) => GameEngine.distance(np, e.pos) <= 2).length;
        score -= nearbyCount * 10;

        // Deterministic tie breaker
        score += (combineHash(state.turn, np.x, np.y, state.seed) % 100) / 1000;

        if (score > bestScore) {
          bestScore = score;
          bestDir = dir;
        }
      }

      return bestDir;
    }

    // Safe: greedy to resources
    const nearestRes = getNearestResource(agent.pos, state.resources);
    if (nearestRes) {
      // Check if path to resource is safe (no enemy within 2 of resource path?)
      // For simplicity: if nearest enemy to resource is further than us to resource, go for it
      // Otherwise still go but evaluation chooses safest approach via bfs which is fine
      const enemyNearResource = nearestRes
        ? getNearestEnemy(nearestRes.item.pos, enemies)
        : null;

      // If resource is heavily guarded, maybe wait or pick next safest?
      if (enemyNearResource && enemyNearResource.dist <= 1 && nearestEnemy && nearestEnemy.dist <= 4) {
        // resource contested, try to find alternative safe resource
        const safeResources = state.resources
          .map((r) => ({
            res: r,
            distSelf: GameEngine.distance(agent.pos, r.pos),
            distEnemy: enemies.length
              ? Math.min(...enemies.map((e) => GameEngine.distance(r.pos, e.pos)))
              : 999,
          }))
          .filter((x) => x.distEnemy > 2) // safe
          .sort((a, b) => a.distSelf - b.distSelf);

        if (safeResources.length > 0) {
          return bfsNextDirection(
            agent.pos,
            safeResources[0].res.pos,
            state.config,
            state.turn,
            state.seed
          );
        }
        // if no safe resource, still flee slightly towards safest direction that also approaches resource
        // combine flee + greedy
        let bestDir: Direction = 'stay';
        let bestCombined = -Infinity;
        for (const dir of validDirs) {
          const np = GameEngine.getNextPos(agent.pos, dir);
          if (!isValidPos(np, state.config)) continue;
          const dRes = GameEngine.distance(np, nearestRes.item.pos);
          let minEnemyDist = Infinity;
          for (const e of enemies) minEnemyDist = Math.min(minEnemyDist, GameEngine.distance(np, e.pos));
          const combined = -dRes * 2 + minEnemyDist * 3;
          if (combined > bestCombined) {
            bestCombined = combined;
            bestDir = dir;
          }
        }
        return bestDir;
      }

      return bfsNextDirection(
        agent.pos,
        nearestRes.item.pos,
        state.config,
        state.turn,
        state.seed
      );
    }

    // No resources: move to maximize safety (stay near center but away from enemies)
    const center: Position = {
      x: Math.floor(state.config.width / 2),
      y: Math.floor(state.config.height / 2),
    };
    // Choose safest direction among those moving towards center
    let bestDir: Direction = 'stay';
    let bestScore = -Infinity;
    for (const dir of validDirs) {
      const np = GameEngine.getNextPos(agent.pos, dir);
      if (!isValidPos(np, state.config)) continue;
      const dCenter = GameEngine.distance(np, center);
      let minEnemy = enemies.length ? Math.min(...enemies.map((e) => GameEngine.distance(np, e.pos))) : 999;
      const score = -dCenter * 0.5 + minEnemy * 2 + (combineHash(state.turn, np.x, np.y, state.seed) % 10) / 10;
      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }
    return bestDir;
  },
};

// ---------- LLM Agent (Muse Spark) ----------
/**
 * a6 - Muse Spark
 * Powered by real LLM reasoning via /api/llm-decide.
 * Sync fallback = heuristic (Strategist-like) for batch sims,
 * async path calls Meta API for live games.
 * This showcases recursive agentic loop: agent that reasons via LLM.
 */
export const MuseSparkAgent: AgentStrategy = {
  id: 'a6',
  name: 'MuseSpark',
  description: 'LLM brain. Uses Muse Spark 1.1 with high reasoning (2728 tokens avg) to decide moves via server API. Fallback heuristic for batches.',
  color: '#000000',
  emoji: '✨',
  decide: (state: GameState, agentId: string): Direction => {
    // Sync fallback - heuristic similar to StrategistSam but simpler for batch
    const agent = state.agents.find(a => a.id === agentId);
    if (!agent || !agent.alive) return 'stay';

    const enemies = state.agents.filter(a => a.alive && a.id !== agentId);
    const valid = getValidDirections(state, agent.pos);

    // Quick heuristic - same scoring as Strategist but minimal for speed in batch
    let best: Direction = 'stay';
    let bestScore = -Infinity;
    const nearestRes = getNearestResource(agent.pos, state.resources);
    const nearestEnemy = getNearestEnemy(agent.pos, enemies);

    for (const d of valid) {
      const np = GameEngine.getNextPos(agent.pos, d);
      if (!isValidPos(np, state.config)) continue;
      let score = 0;

      // Resource pull
      for (const r of state.resources) {
        const dist = GameEngine.distance(np, r.pos);
        score += r.value / (dist + 1) * 2;
        if (dist === 0) score += 50;
      }

      // Enemy logic - like Strategist but LLM-flavored
      if (nearestEnemy) {
        const dist = GameEngine.distance(np, nearestEnemy.item.pos);
        if (agent.health < 40 && dist <= 2) score -= 200;
        else if (agent.health < 70 && dist <= 1) score -= 60;
        if (nearestEnemy.item.health < 35 && agent.health > 60 && dist < nearestEnemy.dist) score += 40;
        score += dist * 1.5; // safety
      }

      if (d === 'stay' && nearestRes && nearestRes.dist > 2) score -= 5;

      const tb = (combineHash(state.turn, np.x, np.y, state.seed) % 1000) / 10000;
      score += tb;

      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  },
};

// ---------- Exports ----------

export const ALL_STRATEGIES: AgentStrategy[] = [
  RandomRandy,
  GreedyGus,
  HunterHazel,
  StrategistSam,
  AvoiderAlex,
  MuseSparkAgent,
];

export const STRATEGY_MAP: Record<string, AgentStrategy> = {
  [RandomRandy.id]: RandomRandy,
  [GreedyGus.id]: GreedyGus,
  [HunterHazel.id]: HunterHazel,
  [StrategistSam.id]: StrategistSam,
  [AvoiderAlex.id]: AvoiderAlex,
  [MuseSparkAgent.id]: MuseSparkAgent,
};

export function getStrategyById(id: string): AgentStrategy | undefined {
  return STRATEGY_MAP[id];
}

// AGENT_CONFIGS that match presets but with strategy refs
export const AGENT_CONFIGS = ALL_STRATEGIES.map((s) => ({
  id: s.id,
  name: s.name,
  color: s.color,
  emoji: s.emoji,
  strategy: s,
}));

export type AgentConfigWithStrategy = (typeof AGENT_CONFIGS)[number];
