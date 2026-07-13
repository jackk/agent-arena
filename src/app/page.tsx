"use client";

import { useGame } from "@/lib/game/useGame";
import { useState, useEffect } from "react";
import ApiKeyPanel from "@/components/arcade/ApiKeyPanel";
import ArcadeGameBoard from "@/components/arcade/ArcadeGameBoard";
import ArcadeControls from "@/components/arcade/ArcadeControls";
import FighterSelect from "@/components/arcade/FighterSelect";
import Tutorial, { useTutorial } from "@/components/arcade/Tutorial";
import Legend from "@/components/arcade/Legend";
import HowToPlayCard from "@/components/arcade/HowToPlayCard";

export default function Home() {
  const {
    gameState,
    isPlaying,
    isOver,
    turn,
    maxTurns,
    speed,
    setSpeed,
    isBatchRunning,
    leaderboard,
    selectedAgentId,
    setSelectedAgentId,
    step,
    playPause,
    reset,
    historyIndex,
    setHistoryIndex,
    isLLMThinking,
    lastLLMReason,
    useLLM,
    setUseLLM,
    gameMode,
    switchMode,
    versusPair,
    humanDir,
    setHumanDir,
  } = useGame();

  const [showCoords, setShowCoords] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const tutorial = useTutorial();

  useEffect(() => {
    const checkKey = () => {
      const k = localStorage.getItem('agent-arena-api-key') || localStorage.getItem('agent-arena-llm-config');
      setHasApiKey(!!k && k.length > 10);
    };
    checkKey();
    window.addEventListener('storage', checkKey);
    const interval = setInterval(checkKey, 1000);
    return () => { window.removeEventListener('storage', checkKey); clearInterval(interval); };
  }, []);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(6,182,212,0.8)]" />
          <span className="text-xs font-mono tracking-[0.3em] text-cyan-400 animate-pulse">LOADING ARENA...</span>
        </div>
      </div>
    );
  }

  const aliveCount = gameState.agents.filter(a=>a.alive).length;
  const humanAgent = gameState.agents.find(a=>a.id==='human');
  const winner = gameState.winnerId ? gameState.agents.find(a=>a.id===gameState.winnerId) : null;

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,black_80%)]" />
      </div>

      <ApiKeyPanel />
      {tutorial.show && <Tutorial onClose={() => tutorial.close()} />}

      {/* SUPER CLEAR HEADER */}
      <header className="relative z-20 border-b-2 border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          {/* Title row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tighter flex flex-wrap items-center gap-2">
                <span className="text-white" style={{ textShadow: '0 0 10px #0ff' }}>AGENT</span>
                <span className="text-white" style={{ textShadow: '0 0 10px #f0f' }}>ARENA</span>
                <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">ARCADE • IDIOT-PROOF EDITION</span>
              </h1>
              <p className="text-[13px] font-mono text-zinc-300 mt-1 leading-relaxed">
                <span className="text-white font-bold">6 AI gladiators fight for coins on a 12x12 grid.</span> Watch them, play as human, or pit two LLMs against each other with your own API key.
                Turn {turn}/{maxTurns} • {aliveCount} alive • Seed {gameState.seed}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => tutorial.open()} className="h-9 px-4 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold tracking-widest hover:bg-zinc-800">❓ HOW TO PLAY</button>
              <button onClick={() => setShowCoords(v=>!v)} className="h-9 px-4 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-bold tracking-widest hover:bg-zinc-800">{showCoords ? 'COORDS ON' : 'COORDS OFF'}</button>
              <div className={`h-9 px-4 rounded-full border-2 flex items-center gap-2 text-xs font-black tracking-widest ${isOver ? 'bg-red-500 border-red-400 text-white' : isPlaying ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-black animate-pulse' : 'bg-zinc-500'}`} />
                {isOver ? 'GAME OVER' : isPlaying ? 'PLAYING' : 'PAUSED'}
              </div>
            </div>
          </div>

          {/* Mode selector - BIG CARDS, super obvious */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { id: 'arena', icon: '🏟️', name: 'WATCH MODE', desc: '6 bots battle automatically, no controls needed' },
              { id: 'human', icon: '😎', name: 'PLAY AS HUMAN', desc: 'You are yellow YOU, move with WASD/arrows' },
              { id: 'versus', icon: '⚔️', name: '1V1 VERSUS', desc: 'Pick any 2 fighters for duel' },
              { id: 'llmBattle', icon: '✨', name: 'LLM VS LLM', desc: 'Pit 2 different AIs with your API key' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id as any)}
                className={`text-left rounded-xl border-2 p-3 transition-all ${gameMode===m.id ? 'bg-white border-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.02]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-xs font-black tracking-widest">{m.name}</span>
                  {gameMode===m.id && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-black text-white">ACTIVE</span>}
                </div>
                <div className="text-[11px] font-mono leading-tight mt-1 opacity-80">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* BIG OBVIOUS BYOK BANNER if no key */}
      {!hasApiKey && (
        <div className="relative z-20 bg-gradient-to-r from-fuchsia-600 to-cyan-600 p-[2px]">
          <div className="bg-black py-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔑</span>
              <span className="text-white font-bold">WANT LLM BATTLES? You need an API key!</span>
              <span className="text-zinc-400 hidden sm:inline">Click top-right 🔑 API KEYS → paste your Meta key (LLM|...). Stored locally only.</span>
            </div>
            <span className="text-[10px] text-zinc-500">Without key, ✨ MuseSpark uses heuristic (still fun, but not real LLM reasoning)</span>
          </div>
        </div>
      )}

      {/* LLM thinking banner - super obvious */}
      {(isLLMThinking || lastLLMReason) && (
        <div className="relative z-20 bg-zinc-900 border-b border-fuchsia-500/30 px-4 py-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isLLMThinking ? 'bg-fuchsia-500 animate-pulse' : 'bg-white text-black'}`}>✨</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black tracking-widest text-fuchsia-300 flex items-center gap-2">
              {isLLMThinking ? 'MUSE SPARK IS THINKING... (uses ~2728 reasoning tokens per move, 2-4 sec)' : 'MUSE SPARK DECIDED:'}
              <label className="ml-auto flex items-center gap-2 text-[10px] font-mono text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={useLLM} onChange={e=>setUseLLM(e.target.checked)} className="accent-fuchsia-500" />
                USE REAL LLM (slow)
              </label>
            </div>
            <div className="text-sm font-mono text-white truncate">{isLLMThinking ? 'Analyzing board, resources, enemies, health...' : lastLLMReason}</div>
          </div>
        </div>
      )}

      {/* HUMAN MODE BIG HINT */}
      {gameMode==='human' && (
        <div className="relative z-20 bg-yellow-400 text-black px-4 py-2 flex flex-wrap items-center justify-center gap-4 text-xs font-black tracking-widest">
          <span>🎮 YOU ARE 😎 YELLOW — USE WASD OR ARROWS TO MOVE • SPACE = STAY • COLLECT 💰💎⚡ • AVOID ⚔️</span>
          <span className="px-3 py-1 rounded-full bg-black text-yellow-400">CURRENT DIR: {humanDir.toUpperCase()} {humanDir==='up'?'↑':humanDir==='down'?'↓':humanDir==='left'?'←':humanDir==='right'?'→':'●'}</span>
        </div>
      )}

      {/* WINNER BANNER */}
      {isOver && winner && (
        <div className="relative z-20 bg-white text-black px-4 py-3 flex items-center justify-center gap-3 text-sm font-black tracking-widest">
          <span className="text-xl">{winner.emoji}</span>
          🏆 {winner.name.toUpperCase()} WINS! Score: {winner.score} • Kills: {winner.kills} • Press R or RESET to play again
          <button onClick={() => reset()} className="ml-4 h-8 px-4 rounded-full bg-black text-white text-xs font-black">PLAY AGAIN ↻</button>
        </div>
      )}

      <main className="relative z-10 max-w-[1600px] mx-auto p-3 sm:p-4 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">

        {/* LEFT: Board + Legend + Controls */}
        <div className="flex flex-col gap-4">
          <HowToPlayCard gameMode={gameMode} />
          <ArcadeGameBoard gameState={gameState} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} showCoords={showCoords} />
          <Legend />
          <ArcadeControls isPlaying={isPlaying} isOver={isOver} onPlayPause={playPause} onStep={step} onReset={()=>reset()} speed={speed} setSpeed={setSpeed} humanDir={humanDir} onHumanDir={setHumanDir} gameMode={gameMode} isLLMThinking={isLLMThinking} />

          {gameState.history.length > 1 && (
            <div className="rounded-xl border-2 border-zinc-800 bg-black p-3 flex items-center gap-3">
              <span className="text-[10px] font-black tracking-widest text-zinc-500">REPLAY</span>
              <input type="range" min={0} max={gameState.history.length-1} value={historyIndex} onChange={e=>setHistoryIndex(Number(e.target.value))} className="flex-1 accent-white" />
              <span className="text-xs font-mono text-white">{historyIndex}/{gameState.history.length-1}</span>
              <button onClick={()=>setHistoryIndex(gameState.history.length-1)} className="h-7 px-3 rounded-full bg-white text-black text-[10px] font-black">LIVE</button>
            </div>
          )}

          {(gameMode==='versus' || gameMode==='llmBattle') && (
            <FighterSelect selected={versusPair} onSelect={(pair)=>{ switchMode(gameMode, pair); }} mode={gameMode==='llmBattle' ? 'llmBattle' : 'versus'} />
          )}
        </div>

        {/* RIGHT: Agents explainer */}
        <div className="flex flex-col gap-4">
          {/* WHAT IS HAPPENING */}
          <div className="rounded-xl border-2 border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-xs font-black tracking-[0.2em] text-white mb-3">👀 WHAT'S HAPPENING RIGHT NOW?</h3>
            <div className="text-[12px] font-mono leading-relaxed text-zinc-300 space-y-2">
              <div>Turn <b className="text-white">{turn}</b>/{maxTurns} • <b className="text-white">{aliveCount}</b> agents alive • <b className="text-white">{gameState.resources.length}</b> coins on board</div>
              <div>Each turn, every alive agent picks a direction (up/down/left/right/stay) at same time. If two want same square, both blocked. After moving, if adjacent to enemy, they fight (20-30 dmg). Collect coin by stepping on it.</div>
              {humanAgent && <div className="text-yellow-400">🎯 You (😎) are at ({humanAgent.pos.x},{humanAgent.pos.y}) HP:{humanAgent.health} Score:{humanAgent.score} — move with <b>WASD</b>!</div>}
            </div>
          </div>

          {/* Agents with plain English */}
          <div className="rounded-xl border-2 border-zinc-800 bg-black p-3">
            <h3 className="text-xs font-black tracking-[0.2em] text-zinc-400 mb-3">🤖 FIGHTERS • CLICK TO HIGHLIGHT ON BOARD</h3>
            <div className="flex flex-col gap-2">
              {gameState.agents.map(agent => {
                const stratDesc: Record<string,string> = {
                  'a1': 'Moves randomly — dumb but unpredictable',
                  'a2': 'Always rushes nearest coin — greedy',
                  'a3': 'Chases nearest enemy — most kills but dies fast',
                  'a4': 'Smartest heuristic — balances coins + safety + hunting weak enemies',
                  'a5': 'Runs away from enemies — survives longest (89.9% in 1000 sims)',
                  'a6': hasApiKey && useLLM ? 'Real LLM: uses 2728 tokens to reason every move' : 'Heuristic fallback (add API key for real LLM reasoning)',
                  'human': 'YOU! Controlled by WASD. Can you beat the bots?',
                };
                const isSelected = selectedAgentId===agent.id;
                const isDead = !agent.alive;
                return (
                  <button
                    key={agent.id}
                    onClick={()=>setSelectedAgentId(agent.id)}
                    className={`text-left rounded-lg border p-3 flex gap-3 items-start transition-all ${isSelected ? 'bg-white border-white text-black scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.3)]' : isDead ? 'bg-zinc-900/50 border-zinc-800 opacity-50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-white'}`}
                  >
                    <div className="text-2xl">{agent.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black tracking-wide">{agent.name.toUpperCase()}</span>
                        {!isDead && (
                          <>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 border">HP:{agent.health}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 border">{agent.score} pts</span>
                            {agent.kills>0 && <span className="text-[10px] font-mono">⚔️{agent.kills}</span>}
                          </>
                        )}
                        {isDead && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">DEAD</span>}
                        {agent.id==='human' && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-400 text-black animate-pulse">YOU</span>}
                      </div>
                      <div className={`text-[11px] font-mono leading-tight mt-1 ${isSelected ? 'text-zinc-700' : 'text-zinc-400'}`}>{stratDesc[agent.id] || ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-zinc-800 bg-black p-3">
            <h4 className="text-[10px] font-black tracking-widest text-zinc-500 mb-2">📊 BENCHMARKED WIN RATES (1000 games)</h4>
            <div className="text-[11px] font-mono space-y-1 text-zinc-400">
              <div className="flex justify-between"><span>🧠 StrategistSam</span><span className="text-white">34.7% (best)</span></div>
              <div className="flex justify-between"><span>💰 GreedyGus</span><span>32.8%</span></div>
              <div className="flex justify-between"><span>👻 AvoiderAlex</span><span>29.8% + 89.9% survival</span></div>
              <div className="flex justify-between"><span>🎲 RandomRandy</span><span>2.0% (baseline)</span></div>
              <div className="flex justify-between"><span>⚔️ HunterHazel</span><span>0.3% but 0.71 kills avg</span></div>
              <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1"><span>✨ MuseSpark LLM</span><span className="text-fuchsia-400">{hasApiKey ? 'Real LLM when key added' : '23.8% heuristic fallback'}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] font-mono text-zinc-500">
            <div>🎮 Controls: <b className="text-white">SPACE</b>=Play/Pause • <b className="text-white">N</b>=Step 1 turn • <b className="text-white">R</b>=Reset • <b className="text-white">WASD/Arrows</b>=Move (human mode)</div>
            <div className="mt-2">💡 Tip: Add API key via 🔑 top-right, then try LLM BATTLE mode with different prompts: aggressive vs defensive!</div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-[1600px] mx-auto p-4 text-center text-[10px] font-mono text-zinc-600">
        Agent Arena Arcade • Built in one coding session with parallel sub-agents • Engine deterministic mulberry32 • 897 games/sec • Muse Spark 1.1 • github.com/jackk/agent-arena
      </footer>
    </div>
  );
}
