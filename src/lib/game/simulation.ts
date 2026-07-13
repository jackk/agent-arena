// @ts-nocheck
import {
  GameState,
  GameStateSnapshot,
  GameConfig,
  AgentConfig,
  Direction,
  AgentStrategy,
} from "./types";
import { GameEngine, DEFAULT_CONFIG, AGENT_PRESETS } from "./engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StrategyFn = (state: GameState, agentId: string) => Direction;
export type StrategyMapInput =
  | Map<string, StrategyFn | AgentStrategy>
  | Record<string, StrategyFn | AgentStrategy>;

export type SimulationProgressCallback = (completed: number, total: number) => void;

export type SimulationBatchResult = {
  games: GameState[];
  avgTurns: number;
  winCounts: Map<string, number>;
  avgScores: Map<string, number>;
  totalKills: Map<string, number>;
  // Extra helpful aggregates (not required but useful)
  totalScores: Map<string, number>;
  survivalCounts: Map<string, number>;
  avgSurvival: Map<string, number>;
};

export type LeaderboardEntry = {
  agentId: string;
  name: string;
  wins: number;
  winRate: number;
  avgScore: number;
  avgKills: number;
  avgSurvival: number;
  color: string;
  emoji: string;
};

export type SimulationRunnerOptions = {
  gameConfig?: GameConfig;
  agentConfigs?: AgentConfig[];
  baseSeed?: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeStrategyMap(
  input: StrategyMapInput | undefined
): Map<string, StrategyFn> {
  const out = new Map<string, StrategyFn>();

  if (!input) return out;

  const entries: Array<[string, StrategyFn | AgentStrategy]> =
    input instanceof Map ? Array.from(input.entries()) as any : Object.entries(input as any) as any;

  for (const [agentId, strat] of entries) {
    if (!strat) continue;
    if (typeof strat === "function") {
      out.set(agentId, strat as StrategyFn);
    } else if (typeof (strat as AgentStrategy).decide === "function") {
      const s = strat as AgentStrategy;
      out.set(agentId, (state, id) => {
        try {
          return s.decide(state, id);
        } catch {
          return "stay";
        }
      });
    }
  }

  return out;
}

function computeBatchStats(games: GameState[]): {
  avgTurns: number;
  winCounts: Map<string, number>;
  totalScores: Map<string, number>;
  avgScores: Map<string, number>;
  totalKills: Map<string, number>;
  survivalCounts: Map<string, number>;
  avgSurvival: Map<string, number>;
} {
  const totalGames = games.length;
  let sumTurns = 0;

  const winCounts = new Map<string, number>();
  const totalScores = new Map<string, number>();
  const totalKills = new Map<string, number>();
  const survivalCounts = new Map<string, number>();
  const gameCounts = new Map<string, number>(); // times agent participated

  for (const game of games) {
    sumTurns += game.turn;

    // Count winner
    if (game.winnerId) {
      winCounts.set(game.winnerId, (winCounts.get(game.winnerId) ?? 0) + 1);
    }

    for (const agent of game.agents) {
      const id = agent.id;
      // participation count
      gameCounts.set(id, (gameCounts.get(id) ?? 0) + 1);

      totalScores.set(id, (totalScores.get(id) ?? 0) + agent.score);
      totalKills.set(id, (totalKills.get(id) ?? 0) + agent.kills);
      if (agent.alive) {
        survivalCounts.set(id, (survivalCounts.get(id) ?? 0) + 1);
      }
    }
  }

  const avgTurns = totalGames > 0 ? sumTurns / totalGames : 0;

  const avgScores = new Map<string, number>();
  const avgSurvival = new Map<string, number>();

  for (const [id, total] of totalScores.entries()) {
    const cnt = gameCounts.get(id) ?? totalGames;
    avgScores.set(id, cnt > 0 ? total / cnt : 0);
  }

  for (const [id, count] of gameCounts.entries()) {
    const surv = survivalCounts.get(id) ?? 0;
    avgSurvival.set(id, count > 0 ? surv / count : 0);
    // Ensure maps have entries for all known agents
    if (!avgScores.has(id)) avgScores.set(id, 0);
    if (!totalScores.has(id)) totalScores.set(id, 0);
    if (!totalKills.has(id)) totalKills.set(id, 0);
    if (!winCounts.has(id)) winCounts.set(id, 0);
    if (!survivalCounts.has(id)) survivalCounts.set(id, 0);
  }

  // Ensure winCounts has default 0 for any agent seen only via survival etc.
  for (const id of gameCounts.keys()) {
    if (!winCounts.has(id)) winCounts.set(id, 0);
  }

  return {
    avgTurns,
    winCounts,
    totalScores,
    avgScores,
    totalKills,
    survivalCounts,
    avgSurvival,
  };
}

// ---------------------------------------------------------------------------
// Standalone helpers
// ---------------------------------------------------------------------------

/**
 * Returns the replay history for a given GameState.
 * This is just the `history` snapshots stored in the game state.
 */
export function getReplayStates(gameState: GameState): GameStateSnapshot[] {
  return gameState.history;
}

// ---------------------------------------------------------------------------
// SimulationRunner class
// ---------------------------------------------------------------------------

export class SimulationRunner {
  private gameConfig: GameConfig;
  private agentConfigs: AgentConfig[];
  private baseSeed: number;

  constructor(options: SimulationRunnerOptions = {}) {
    this.gameConfig = options.gameConfig ?? { ...DEFAULT_CONFIG };
    this.agentConfigs = options.agentConfigs ?? [...AGENT_PRESETS];
    this.baseSeed = options.baseSeed ?? Math.floor(Math.random() * 1_000_000);
  }

  /**
   * Normalize provided strategy map into Map<agentId, StrategyFn>
   */
  private toStrategyMap(input: StrategyMapInput): Map<string, StrategyFn> {
    return normalizeStrategyMap(input);
  }

  /**
   * Run a single game with given strategies, seed and optionally custom agents.
   */
  runSingleGame(
    strategyMap: StrategyMapInput,
    seed: number,
    customAgents?: AgentConfig[]
  ): GameState {
    const engine = new GameEngine(seed);
    const agents = customAgents ?? this.agentConfigs;
    const config: GameConfig = { ...this.gameConfig, seed };
    const initial = engine.createInitialState(agents, config);
    const normalized = this.toStrategyMap(strategyMap);
    const final = engine.simulate(initial, normalized);
    return final;
  }

  /**
   * Run a batch of N games synchronously.
   * Each game uses seed = baseSeed + index to ensure determinism & variety.
   */
  runBatch(
    strategies: StrategyMapInput,
    count: number,
    onProgress?: SimulationProgressCallback
  ): SimulationBatchResult {
    const games: GameState[] = [];
    games.length = 0;

    const normalizedStrategies = strategies; // keep original, normalization per game inside runSingleGame

    for (let i = 0; i < count; i++) {
      const seed = this.baseSeed + i;
      const game = this.runSingleGame(normalizedStrategies, seed);
      games.push(game);
      if (onProgress) {
        try {
          onProgress(i + 1, count);
        } catch {
          // swallow progress callback errors
        }
      }
    }

    const stats = computeBatchStats(games);

    return {
      games,
      avgTurns: stats.avgTurns,
      winCounts: stats.winCounts,
      avgScores: stats.avgScores,
      totalKills: stats.totalKills,
      totalScores: stats.totalScores,
      survivalCounts: stats.survivalCounts,
      avgSurvival: stats.avgSurvival,
    };
  }

  /**
   * Async variant that yields to the event loop every game (or every few games)
   * to avoid blocking the main thread. Uses setTimeout(0).
   */
  async runBatchAsync(
    strategies: StrategyMapInput,
    count: number,
    onProgress?: SimulationProgressCallback
  ): Promise<SimulationBatchResult> {
    const games: GameState[] = [];

    for (let i = 0; i < count; i++) {
      const seed = this.baseSeed + i;
      const game = this.runSingleGame(strategies, seed);
      games.push(game);

      if (onProgress) {
        try {
          onProgress(i + 1, count);
        } catch {
          // ignore
        }
      }

      // Yield to event loop - make it non-blocking
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    const stats = computeBatchStats(games);

    return {
      games,
      avgTurns: stats.avgTurns,
      winCounts: stats.winCounts,
      avgScores: stats.avgScores,
      totalKills: stats.totalKills,
      totalScores: stats.totalScores,
      survivalCounts: stats.survivalCounts,
      avgSurvival: stats.avgSurvival,
    };
  }

  /**
   * Build a leaderboard sorted by wins DESC then avgScore DESC.
   */
  getLeaderboard(results: SimulationBatchResult): LeaderboardEntry[] {
    const totalGames = results.games.length;

    // Gather metadata for each agentId from all games (first occurrence wins)
    const meta = new Map<string, { name: string; color: string; emoji: string }>();
    for (const game of results.games) {
      for (const ag of game.agents) {
        if (!meta.has(ag.id)) {
          meta.set(ag.id, {
            name: ag.name,
            color: ag.color,
            emoji: ag.emoji,
          });
        }
      }
    }

    // Also include agents from runner presets that may not have appeared (edge)
    for (const preset of this.agentConfigs) {
      if (!meta.has(preset.id)) {
        meta.set(preset.id, {
          name: preset.name,
          color: preset.color,
          emoji: preset.emoji,
        });
      }
    }

    const leaderboard: LeaderboardEntry[] = [];

    for (const agentId of meta.keys()) {
      const m = meta.get(agentId)!;
      const wins = results.winCounts.get(agentId) ?? 0;
      const winRate = totalGames > 0 ? wins / totalGames : 0;
      const avgScore = results.avgScores.get(agentId) ?? 0;
      const totalKill = results.totalKills.get(agentId) ?? 0;
      const avgKills = totalGames > 0 ? totalKill / totalGames : 0;
      const avgSurvival =
        results.avgSurvival.get(agentId) ??
        (totalGames > 0
          ? (results.survivalCounts.get(agentId) ?? 0) / totalGames
          : 0);

      leaderboard.push({
        agentId,
        name: m.name,
        wins,
        winRate,
        avgScore,
        avgKills,
        avgSurvival,
        color: m.color,
        emoji: m.emoji,
      });
    }

    // Sort by wins desc, then avgScore desc, then avgKills desc
    leaderboard.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      return b.avgKills - a.avgKills;
    });

    return leaderboard;
  }

  /**
   * Update base seed - useful for varied batches.
   */
  setBaseSeed(seed: number): void {
    this.baseSeed = seed;
  }

  /**
   * Get current base seed.
   */
  getBaseSeed(): number {
    return this.baseSeed;
  }
}

// ---------------------------------------------------------------------------
// quickSim helper for testing 10 games fast
// ---------------------------------------------------------------------------

/**
 * Simple mulberry32 for strategies that need randomness inside quickSim.
 * Duplicated to avoid coupling, but effectively same as engine's RNG.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a set of simple default strategies for quickSim:
 * - random movement
 * These strategies are pure and deterministic given a seed, but for quick testing
 * we just use Math.random or seeded RNG.
 */
function makeDefaultQuickStrategies(agentIds: string[]): Map<string, StrategyFn> {
  const map = new Map<string, StrategyFn>();

  // Each agent gets a random mover; we add a tiny bit of personality based on id hash
  for (const id of agentIds) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    const rng = mulberry32(hash + 12345);
    map.set(id, (_state, _agentId) => {
      const dirs: Direction[] = ["up", "down", "left", "right", "stay"];
      // 10% chance to try to move toward nearest resource if state available
      if (_state && rng() < 0.4) {
        const agent = _state.agents.find((a) => a.id === _agentId);
        if (agent && _state.resources.length > 0) {
          let closest = _state.resources[0];
          let bestDist = Math.abs(closest.pos.x - agent.pos.x) + Math.abs(closest.pos.y - agent.pos.y);
          for (const r of _state.resources) {
            const d = Math.abs(r.pos.x - agent.pos.x) + Math.abs(r.pos.y - agent.pos.y);
            if (d < bestDist) {
              bestDist = d;
              closest = r;
            }
          }
          const dx = closest.pos.x - agent.pos.x;
          const dy = closest.pos.y - agent.pos.y;
          // Prefer horizontal then vertical
          if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? "right" : "left";
          } else if (dy !== 0) {
            return dy > 0 ? "down" : "up";
          }
        }
      }
      const idx = Math.floor(rng() * dirs.length);
      return dirs[idx];
    });
  }

  return map;
}

/**
 * Run 10 games quickly for smoke-testing / dev.
 * Uses default presets, default config, random-ish strategies.
 * Returns a SimulationBatchResult.
 */
export function quickSim(
  strategies?: StrategyMapInput,
  count: number = 10,
  baseSeed: number = 42,
  gameConfig?: GameConfig,
  agentConfigs?: AgentConfig[]
): SimulationBatchResult {
  const runner = new SimulationRunner({
    gameConfig: gameConfig ?? { ...DEFAULT_CONFIG, maxTurns: 50 },
    agentConfigs: agentConfigs ?? AGENT_PRESETS,
    baseSeed,
  });

  let stratMap: Map<string, StrategyFn>;
  if (strategies) {
    stratMap = normalizeStrategyMap(strategies);
    // If caller provided partial map, fill missing with defaults
    const ids = (agentConfigs ?? AGENT_PRESETS).map((a) => a.id);
    const defaults = makeDefaultQuickStrategies(ids);
    for (const [id, fn] of defaults.entries()) {
      if (!stratMap.has(id)) stratMap.set(id, fn);
    }
  } else {
    const ids = (agentConfigs ?? AGENT_PRESETS).map((a) => a.id);
    stratMap = makeDefaultQuickStrategies(ids);
  }

  return runner.runBatch(stratMap, count);
}
