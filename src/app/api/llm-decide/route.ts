import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';

type Position = { x: number; y: number };
type LLMRequest = {
  turn: number;
  width: number;
  height: number;
  self: { id: string; pos: Position; health: number; score: number };
  resources: Array<{ pos: Position; value: number; type: string; dist: number }>;
  enemies: Array<{ id: string; name: string; pos: Position; health: number; score: number; dist: number }>;
  seed?: number;
  // User-provided overrides for arcade BYOK
  apiKey?: string;
  model?: string; // e.g. muse-spark-1.1, muse-spark-20260615
  reasoningEffort?: 'low' | 'medium' | 'high';
  customSystemPrompt?: string;
};

function getApiKey(): string | null {
  // Try env var first
  if (process.env.META_API_KEY) return process.env.META_API_KEY.trim();
  if (process.env.META_APIKEY) return process.env.META_APIKEY.trim();
  // Try opencode config file
  const candidates = [
    path.join(os.homedir(), '.config', 'opencode', 'meta-api-key'),
    path.join(os.homedir(), '.opencode', 'meta-api-key'),
    '/Users/iamjackk/.config/opencode/meta-api-key',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const k = fs.readFileSync(p, 'utf8').trim();
        if (k) return k;
      }
    } catch {}
  }
  return null;
}

function buildPrompt(req: LLMRequest): { system: string; user: string } {
  const { turn, width, height, self, resources, enemies, customSystemPrompt } = req;

  const baseSystem = `You are an elite AI strategist for Agent Arena, a 12x12 turn-based battle arena.

Rules:
- Grid ${width}x${height}, turn ${turn}/100. Simultaneous moves, collisions block movement.
- Collect resources: coin=10pts, gem=25pts, power=50pts+heal 30.
- Combat: Adjacent after move = mutual 20-30 dmg. Kill = +50 pts.
- Goal: Maximize score + survival. Health 0 = death.
- Output MUST be valid JSON only, no markdown.

You must reason about positioning, resource value/distance, enemy threat, health.

Directions: up (y-1), down (y+1), left (x-1), right (x+1), stay.

Return JSON: {"direction":"up|down|left|right|stay","reason":"<10 words","confidence":0-1}`;

  const system = customSystemPrompt ? `${baseSystem}\n\nUser custom strategy: ${customSystemPrompt}` : baseSystem;

  const resLines = resources
    .slice(0, 8)
    .map(r => `- (${r.pos.x},${r.pos.y}) ${r.type}=${r.value} dist=${r.dist}`)
    .join('\n');

  const enemyLines = enemies
    .slice(0, 5)
    .map(e => `- ${e.name} at (${e.pos.x},${e.pos.y}) hp=${e.health} score=${e.score} dist=${e.dist}`)
    .join('\n');

  const user = `Turn ${turn}. You are at (${self.pos.x},${self.pos.y}) health=${self.health} score=${self.score}.

Nearby resources (sorted by dist):
${resLines || 'None'}

Enemies (sorted by dist):
${enemyLines || 'None'}

Closest threat distance: ${enemies[0]?.dist ?? 'none'}.

Choose best direction now. JSON only.`;

  return { system, user };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LLMRequest;

    // Allow user BYOK via body.apiKey, else fallback to server key
    const apiKey = (body.apiKey?.trim() || getApiKey()) as string | null;
    const model = body.model || 'muse-spark-1.1';
    const reasoningEffort = body.reasoningEffort || 'high';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'META_API_KEY not found - add your key in arcade panel', fallback: 'stay', needKey: true },
        { status: 200 } // return 200 with needKey flag so client can prompt
      );
    }

    const { system, user } = buildPrompt(body);

    const start = Date.now();
    const apiRes = await fetch('https://api.meta.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 4096,
        reasoning_effort: reasoningEffort,
      }),
    });

    const raw = await apiRes.text();
    if (!apiRes.ok) {
      console.error('Meta API error', apiRes.status, raw);
      return NextResponse.json(
        { direction: 'stay', reason: 'api error fallback', error: raw },
        { status: 200 }
      );
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { direction: 'stay', reason: 'parse error', raw },
        { status: 200 }
      );
    }

    const content: string | null = data?.choices?.[0]?.message?.content ?? null;
    const usage = data?.usage;

    if (!content) {
      console.error('No content', data);
      return NextResponse.json({
        direction: 'stay',
        reason: 'no content',
        usage,
      });
    }

    // Parse direction from JSON content
    let direction: string = 'stay';
    let reason = '';
    let confidence = 0.5;

    try {
      // Try direct JSON parse
      const parsed = JSON.parse(content);
      direction = parsed.direction || parsed.dir || 'stay';
      reason = parsed.reason || '';
      confidence = parsed.confidence ?? 0.8;
    } catch {
      // Try extract JSON via regex
      const match = content.match(/\{[^}]+\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          direction = parsed.direction || parsed.dir || 'stay';
          reason = parsed.reason || content.slice(0, 100);
        } catch {}
      }
      // Fallback regex for direction word
      if (!['up','down','left','right','stay'].includes(direction)) {
        const dirMatch = content.match(/\b(up|down|left|right|stay)\b/i);
        if (dirMatch) direction = dirMatch[1].toLowerCase();
      }
    }

    const valid = ['up','down','left','right','stay'];
    if (!valid.includes(direction)) direction = 'stay';

    return NextResponse.json({
      direction,
      reason: reason || content.slice(0, 200),
      confidence,
      usage,
      latencyMs: Date.now() - start,
      model: data.model,
    });
  } catch (e: any) {
    console.error('llm-decide error', e);
    return NextResponse.json(
      { direction: 'stay', reason: 'exception fallback', error: String(e) },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    info: 'POST with {turn,width,height,self,resources,enemies} to get LLM direction',
    model: 'muse-spark-1.1',
    hasKey: !!getApiKey(),
  });
}
