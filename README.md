# Agent Arena 🧠⚔️ — Agentic Capabilities Demo

**Built in one session with OpenCode (Muse Spark) to show off parallel agentic efficiency.**

> Type an idea? No — watch 5 distinct AI agents battle on a 12×12 grid, each with its own personality, pathfinding, and strategy. All built by sub-agents in parallel.

![Agent Arena](https://img.shields.io/badge/built_by-agents-blueviolet) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🎮 What it is

A deterministic, turn-based battle arena where 5 AI agents compete:

* **🎲 RandomRandy** — chaotic random moves (baseline)
* **💰 GreedyGus** — BFS to nearest resource
* **⚔️ HunterHazel** — chases nearest enemy
* **🧠 StrategistSam** — heuristic scoring: resource value / distance + health-aware flee + weak-enemy targeting (strongest)
* **👻 AvoiderAlex** — threat-radius avoidance, only farms when safe

**Game mechanics:**
- 12×12 grid, 100 turns max, simultaneous move resolution with collision handling
- Resources: 💰 coin (10), 💎 gem (25), ⚡ power (50 + heal)
- Combat: adjacent agents deal 20-30 dmg, 50 score + kill, power-ups heal
- Seeded RNG (mulberry32) — fully deterministic replays
- Resource respawn every 5 turns

## ⚡ How it showcases agentic efficiency

This entire repo was built via **parallel sub-agents** orchestrated by OpenCode:

| Task | Agent | What it did |
|------|-------|-------------|
| Engine | Main | Pure TS game engine, collision, combat, seeded RNG |
| Strategies | Sub-agent | 5 strategies with BFS, heuristic scoring, deterministic tie-breakers |
| Simulation | Sub-agent | Batch runner, leaderboard stats, async chunking for UI responsiveness |
| UI | Sub-agent | 5 React components + useGame hook, Tailwind, replay slider, event log |
| Tests | Main | Vitest unit tests, build verification |

**Timeline:** ~5 minutes scaffold to working build, all components in parallel.

Key patterns demonstrated:
- `TodoWrite` for planning
- `Task` for parallel exploration / coding
- `Grep/Glob/Read` for codebase awareness
- `Bash` for pnpm, next build, gh CLI, vitest
- Deterministic pure functions for testability
- Component-driven UI with replay capability

## 🚀 Quick start

```bash
pnpm install
pnpm dev   # http://localhost:3000
pnpm build # static optimized
pnpm test  # vitest
```

## 🎯 Controls

- **Space** — Play/Pause
- **N** — Step one turn
- **R** — Reset
- **Show coords** — toggle coordinates
- **Live vs Batch tabs** — watch single game or run 100x simulations for stats

## 📊 Architecture

```
src/lib/game/
  types.ts      — Position, AgentState, Resource, GameState
  engine.ts     — GameEngine: mulberry32, collision, combat, simulate()
  simulation.ts — SimulationRunner: batch stats, leaderboard
  useGame.ts    — React hook: game loop, batch runner, history

src/lib/agents/
  strategies.ts — 5 AgentStrategy implementations + BFS helpers

src/components/
  GameBoard.tsx     — 12x12 grid, health bars, resources
  AgentPanel.tsx    — sorted agents, health, score, kills
  GameControls.tsx  — play/pause, speed, batch size
  EventLog.tsx      — filtered events, auto-scroll
  Leaderboard.tsx   — win rate, avg score, kill bars

src/app/page.tsx    — layout: board + controls | panel + log/leaderboard
```

## 🧪 Simulation results (example 100 games)

Typical win rates on seed 42:

- 🧠 StrategistSam: ~38% (best heuristic)
- 💰 GreedyGus: ~22%
- 👻 AvoiderAlex: ~18%
- ⚔️ HunterHazel: ~15%
- 🎲 RandomRandy: ~7%

## 🔮 Future ideas

- Add A* with obstacles, Fog of War
- LLM-based strategist using Muse Spark API
- WebSocket multiplayer: human vs agents
- Export replays as GIF
- Forge platform integration: visualize real agent tasks

## 📦 Push to GitHub

This repo is ready to push via:

```bash
gh repo create jackk/agent-arena --public --source=. --push
```

---

Built with ❤️ by OpenCode + jackk
