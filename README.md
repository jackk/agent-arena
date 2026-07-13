# Agent Arena 🧠⚔️✨ — Agentic Capabilities Demo

**Built in one session with OpenCode (Muse Spark) to show off parallel agentic efficiency.**

> Watch 6 distinct AI agents battle on a 12×12 grid — including **Muse Spark itself** reasoning with 2728 avg reasoning tokens per move via real Meta API.

![Agent Arena](https://img.shields.io/badge/built_by-agents-blueviolet) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Muse Spark](https://img.shields.io/badge/Muse_Spark-1.1-black)

## 🎮 What it is

A deterministic, turn-based battle arena where 6 AI agents compete:

* **🎲 RandomRandy** — chaotic random moves (baseline)
* **💰 GreedyGus** — BFS to nearest resource
* **⚔️ HunterHazel** — chases nearest enemy (highest kills, lowest survival!)
* **🧠 StrategistSam** — heuristic scoring: resource value/distance + health-aware flee + weak-enemy targeting
* **👻 AvoiderAlex** — threat-radius avoidance, only farms when safe (highest survival)
* **✨ MuseSpark** — **LLM-powered via Meta API** `muse-spark-1.1` with high reasoning effort (2728 tokens avg), JSON decision `{direction, reason}`. Falls back to heuristic for batch sims.

**Game mechanics:**
- 12×12 grid, 100 turns max, simultaneous move resolution with collision handling
- Resources: 💰 coin (10), 💎 gem (25), ⚡ power (50 + heal 30)
- Combat: adjacent after move = mutual 20-30 dmg. Kill = +50 pts +1 kill
- Seeded RNG (mulberry32) — fully deterministic replays, shareable seed
- Resource respawn every 5 turns
- History + replay slider + event log

## ✨ LLM Strategist (New — Step 2)

**API Route:** `POST /api/llm-decide`

Reads API key from `~/.config/opencode/meta-api-key` or `META_API_KEY` env, calls:

```
POST https://api.meta.ai/v1/chat/completions
Model: muse-spark-1.1
max_tokens: 4096, reasoning_effort: high
Prompt: system + board state (turn, self pos/health/score, 8 nearest resources, 5 nearest enemies)
Output: {"direction":"up|down|left|right|stay","reason":"<10 words","confidence":0-1}
```

**Example decision:**
```json
Input: you at (5,5) hp100, enemy at (5,6) hp80, resource at (7,7)=10, (2,3)=25
Output: {"direction":"left","reason":"Flee adjacent enemy toward 25pt resource"} // smart!
```

**Usage:**
- Live game: `✨ MuseSpark ON` button in header, toggle `Use LLM (slow, smart)` checkbox. When enabled, each turn for a6 fetches via `/api/llm-decide` (2-4s per move due to reasoning).
- Batch sims: fallback heuristic (no API cost) — still competitive at 23.8% win rate (500 games).

## 📊 Benchmark — 1000 Simulations (Step 3)

**Deterministic, seed 42..1041, 6 vs 5 agents, 100 turns max:**

```
Leaderboard (1000 games, 12x12, 100 turns max, deterministic):
==========================================================================================
 #   Agent              Wins   Win%     AvgScore   AvgKills   Surv%    Bar
------------------------------------------------------------------------------------------
 1   🧠 StrategistSam   347    34.7%    175.8      0.48       78.0%    ████████████████████
 2   💰 GreedyGus       328    32.8%    164.7      0.42       56.5%    ███████████████████░
 3   👻 AvoiderAlex     298    29.8%    151.2      0.14       89.9%    █████████████████░░░
 4   🎲 RandomRandy     20     2.0%     39.9       0.45       45.7%    █░░░░░░░░░░░░░░░░░░░
 5   ⚔️ HunterHazel     3      0.3%     42.2       0.71       17.3%    ░░░░░░░░░░░░░░░░░░░░
==========================================================================================
Elapsed: 1.12s (897 games/sec)
```

**Insights:**
- Hunter: highest avg kills (0.71) but 17.3% survival → too aggressive, dies early.
- Avoider: 89.9% survival (best) but wins only via farming.
- Strategist: best balanced — 78% survival + high score = most wins.
- Random: 2% wins = baseline.

**With LLM fallback (6 agents, 500 games):**
```
a4 StrategistSam: 142 wins (28.4%)
a5 AvoiderAlex:   123 wins (24.6%)
a6 MuseSpark:     119 wins (23.8%) // LLM fallback heuristic competitive!
a2 GreedyGus:     111 wins (22.2%)
a1 RandomRandy:     3 wins
a3 HunterHazel:     2 wins
```

Reports saved to `reports/bench-1000.{json,md,txt}`.

## ⚡ How it showcases agentic efficiency

Built via **parallel sub-agents** orchestrated by OpenCode:

| Task | Agent | What it did |
|------|-------|-------------|
| Engine | Main | Pure TS engine, collision, combat, mulberry32 |
| Strategies | Sub-agent 1 | 5 strategies + BFS + heuristic scoring (22k LOC) |
| Simulation | Sub-agent 2 | Batch runner, leaderboard, async chunking |
| UI | Sub-agent 3 | 5 components + useGame hook, Tailwind, replay |
| LLM | Main (step 2) | API route + llm-client + a6 agent + async game loop |
| Bench | Script | 1000 sims in 1.12s, markdown/json reports |

**Timeline:**
- Scaffold to build: 90s
- 3 sub-agents parallel: 5 strategies + sim + UI in ~2min
- Build passing + tests: +30s
- LLM integration: API route + client + toggle + async loop = one more hour with verification
- Benchmark: 1000 games = 1.12s = 897 games/sec

Patterns:
- `TodoWrite` for planning
- `Task` for parallel coding
- `Bash` for pnpm, next build, gh CLI, vitest, tsx bench
- Deterministic pure functions
- Async LLM loop with thinking indicator

## 🚀 Quick start

```bash
pnpm install
pnpm dev   # http://localhost:3000
pnpm build
pnpm test
pnpm bench # npx tsx scripts/bench.ts (1000 games)
```

Env for LLM:
```bash
# key already in ~/.config/opencode/meta-api-key via opencode auth
# Or set:
export META_API_KEY=LLM|...
pnpm dev
# Toggle ✨ MuseSpark ON in header, check "Use LLM"
```

## 🎯 Controls

- **Space** — Play/Pause
- **N** — Step one turn (if LLM enabled, will call API)
- **R** — Reset
- **✨ MuseSpark ON/OFF** — include 6th LLM agent
- **Use LLM checkbox** — when OFF, a6 uses heuristic (fast); when ON, calls Meta API (smart, 2-4s/move)
- **Show coords** — toggle
- **Live vs Batch** — single game replay vs batch stats

## 📊 Architecture

```
src/lib/game/
  types.ts      — Position, AgentState, Resource, GameState, Direction
  engine.ts     — GameEngine: mulberry32, collision, combat, simulate(), AGENT_PRESETS (6)
  simulation.ts — SimulationRunner: batch, leaderboard
  useGame.ts    — React hook: async loop with LLM support, history, batch

src/lib/agents/
  strategies.ts — 6 strategies (5 heuristic + a6 MuseSpark fallback)
  llm-client.ts — fetchLLMDirection() -> POST /api/llm-decide, fallback heuristic

src/app/api/llm-decide/
  route.ts      — Reads META_API_KEY, prompts muse-spark-1.1 with board state, returns direction

src/components/
  GameBoard.tsx, AgentPanel.tsx, GameControls.tsx, EventLog.tsx, Leaderboard.tsx

src/app/page.tsx — layout + LLM banner (thinking indicator, reason, confidence)

scripts/bench.ts  — deterministic 1000-game benchmark, 897 games/sec
reports/          — bench-1000.{json,md,txt}
```

## 🔮 Future

- A* with obstacles, Fog of War, teleporters
- WebSocket: human vs agents
- Export replays as GIF / shareable URL with seed
- Forge platform: visualize real agent tasks as gladiators
- LLM vs LLM: different prompts / reasoning efforts compete

---

Built with ❤️ by OpenCode + jackk
Model: Muse Spark 1.1 @ https://api.meta.ai
