"use client";
import { SnakeState, Snake } from "./snake-engine";
import { Direction, Position } from "./types";
import { SnakeEngine } from "./snake-engine";

export type LLMConfig = {
  apiKey?: string;
  model?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  customSystemPrompt?: string;
};

type LLMResponse = {
  direction: Direction;
  reason: string;
  confidence?: number;
  latencyMs?: number;
  usage?: any;
};

function loadAgentConfig(agentId: string): LLMConfig {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`agent-arena-agent-${agentId}`);
    if (raw) return JSON.parse(raw);
    const raw2 = localStorage.getItem('agent-arena-llm-config');
    if (raw2) return JSON.parse(raw2);
    const legacy = localStorage.getItem('agent-arena-api-key');
    if (legacy) return { apiKey: legacy };
    return {};
  } catch {
    return {};
  }
}

function getNearbyFoods(state: SnakeState, from: Position) {
  return state.foods
    .map(f => ({
      pos: f.pos,
      value: f.value,
      type: f.type,
      dist: SnakeEngine.distance(from, f.pos),
    }))
    .sort((a,b)=>a.dist-b.dist);
}

function getNearbyEnemies(state: SnakeState, selfId: string, from: Position) {
  return state.snakes
    .filter(s=>s.alive && s.id!==selfId)
    .map(s=>({
      id: s.id,
      name: s.name,
      pos: s.body[0],
      head: s.body[0],
      length: s.body.length,
      score: s.score,
      dist: SnakeEngine.distance(from, s.body[0]),
    }))
    .sort((a,b)=>a.dist-b.dist);
}

export async function fetchSnakeLLMDirection(state: SnakeState, agentId: string, override?: LLMConfig): Promise<LLMResponse> {
  const snake = state.snakes.find(s=>s.id===agentId);
  if (!snake) return { direction: 'right', reason: 'not found' };

  const cfg = override || loadAgentConfig(agentId);

  // Build richer prompt for snake
  const payload = {
    turn: state.turn,
    width: state.config.width,
    height: state.config.height,
    self: {
      id: snake.id,
      pos: snake.body[0],
      dir: snake.dir,
      length: snake.body.length,
      score: snake.score,
      body: snake.body.slice(0, 5), // only send head+some body for context
    },
    resources: getNearbyFoods(state, snake.body[0]).slice(0,6).map(f=>({ ...f, pos: f.pos })),
    enemies: getNearbyEnemies(state, agentId, snake.body[0]).slice(0,4),
    seed: state.seed,
    // LLM overrides
    apiKey: cfg.apiKey,
    model: cfg.model,
    reasoningEffort: cfg.reasoningEffort,
    customSystemPrompt: cfg.customSystemPrompt ? `SNAKE GAME STRATEGY: ${cfg.customSystemPrompt}. Remember: you are a snake, cannot reverse direction (no 180), avoid walls and bodies, eat food to grow. Head collision with any body = death.` : undefined,
  };

  try {
    const res = await fetch('/api/llm-decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const valid: Direction[] = ['up','down','left','right'];
    let dir = data.direction as Direction;
    if (!valid.includes(dir)) {
      // Try to parse opposite check
      const match = (data.reason || '').match(/\b(up|down|left|right)\b/i);
      if (match) dir = match[1].toLowerCase() as Direction;
      else dir = snake.dir;
    }
    // Prevent reverse
    const opposite: Record<string,string> = { up:'down', down:'up', left:'right', right:'left' };
    if (dir===opposite[snake.dir] && snake.body.length>1) dir = snake.dir;

    return {
      direction: dir,
      reason: data.reason || 'LLM move',
      confidence: data.confidence,
      latencyMs: data.latencyMs,
      usage: data.usage,
    };
  } catch (e:any) {
    return { direction: snake.dir, reason: 'fallback', };
  }
}
