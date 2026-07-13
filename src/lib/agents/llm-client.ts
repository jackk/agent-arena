"use client";

import { GameState, Direction, Position } from '../game/types';
import { GameEngine } from '../game/engine';

type LLMResponse = {
  direction: Direction;
  reason: string;
  confidence?: number;
  latencyMs?: number;
  usage?: any;
  error?: string;
};

function getNearbyResources(state: GameState, from: Position) {
  return state.resources
    .map(r => ({
      pos: r.pos,
      value: r.value,
      type: r.type,
      dist: GameEngine.distance(from, r.pos),
    }))
    .sort((a, b) => a.dist - b.dist);
}

function getNearbyEnemies(state: GameState, selfId: string, from: Position) {
  return state.agents
    .filter(a => a.alive && a.id !== selfId)
    .map(e => ({
      id: e.id,
      name: e.name,
      pos: e.pos,
      health: e.health,
      score: e.score,
      dist: GameEngine.distance(from, e.pos),
    }))
    .sort((a, b) => a.dist - b.dist);
}

export type LLMConfig = {
  apiKey?: string;
  model?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  customSystemPrompt?: string;
};

function loadUserConfig(): LLMConfig {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('agent-arena-llm-config');
    if (!raw) {
      // fallback legacy single key
      const legacyKey = localStorage.getItem('agent-arena-api-key');
      if (legacyKey) return { apiKey: legacyKey };
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function loadAgentSpecificConfig(agentId: string): LLMConfig {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`agent-arena-agent-${agentId}`);
    if (!raw) return loadUserConfig();
    return JSON.parse(raw);
  } catch {
    return loadUserConfig();
  }
}

export async function fetchLLMDirection(state: GameState, agentId: string, overrideConfig?: LLMConfig): Promise<LLMResponse> {
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent) return { direction: 'stay', reason: 'agent not found' };

  const userConfig = overrideConfig || loadAgentSpecificConfig(agentId);

  const payload = {
    turn: state.turn,
    width: state.config.width,
    height: state.config.height,
    self: {
      id: agent.id,
      pos: agent.pos,
      health: agent.health,
      score: agent.score,
    },
    resources: getNearbyResources(state, agent.pos).slice(0, 8),
    enemies: getNearbyEnemies(state, agentId, agent.pos).slice(0, 5),
    seed: state.seed,
    apiKey: userConfig.apiKey,
    model: userConfig.model,
    reasoningEffort: userConfig.reasoningEffort,
    customSystemPrompt: userConfig.customSystemPrompt,
  };

  try {
    const res = await fetch('/api/llm-decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.warn('LLM API error', res.status, txt);
      return { direction: 'stay', reason: 'api error', error: txt };
    }

    const data = await res.json();
    const dir = data.direction as Direction;
    const valid: Direction[] = ['up', 'down', 'left', 'right', 'stay'];
    return {
      direction: valid.includes(dir) ? dir : 'stay',
      reason: data.reason || 'llm',
      confidence: data.confidence,
      latencyMs: data.latencyMs,
      usage: data.usage,
    };
  } catch (e: any) {
    console.warn('LLM fetch failed', e);
    return { direction: 'stay', reason: 'fetch fail', error: String(e) };
  }
}

// Sync fallback for batch simulations - heuristic similar to StrategistSam but without LLM call
export function llmFallbackDirection(state: GameState, agentId: string): Direction {
  const agent = state.agents.find(a => a.id === agentId);
  if (!agent || !agent.alive) return 'stay';

  const enemies = state.agents.filter(a => a.alive && a.id !== agentId);
  const resources = state.resources;

  // Reuse simple heuristic: score each dir
  const dirs: Direction[] = ['up', 'down', 'left', 'right', 'stay'];
  let best: Direction = 'stay';
  let bestScore = -Infinity;

  for (const d of dirs) {
    const np = GameEngine.getNextPos(agent.pos, d);
    if (np.x < 0 || np.x >= state.config.width || np.y < 0 || np.y >= state.config.height) continue;

    let score = 0;
    // resource attraction
    for (const r of resources) {
      const dist = GameEngine.distance(np, r.pos);
      score += r.value / (dist + 1);
    }
    // enemy avoidance, but chase weak
    let minEnemy = Infinity;
    for (const e of enemies) {
      const dist = GameEngine.distance(np, e.pos);
      minEnemy = Math.min(minEnemy, dist);
      if (e.health < 30 && agent.health > 50 && dist < 3) score += 20 / (dist + 1);
    }
    if (agent.health < 50 && minEnemy <= 2) score -= 100;
    else if (minEnemy <= 1) score -= 20;

    if (d === 'stay' && resources.some(r => r.pos.x === agent.pos.x && r.pos.y === agent.pos.y)) score += 10;

    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}
