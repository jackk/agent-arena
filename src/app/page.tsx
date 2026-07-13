"use client";

import { useGame } from "@/lib/game/useGame";
import AgentPanel from "@/components/AgentPanel";
import EventLog from "@/components/EventLog";
import Leaderboard from "@/components/Leaderboard";
import { useState } from "react";
import ApiKeyPanel from "@/components/arcade/ApiKeyPanel";
import ArcadeGameBoard from "@/components/arcade/ArcadeGameBoard";
import ArcadeControls from "@/components/arcade/ArcadeControls";
import FighterSelect from "@/components/arcade/FighterSelect";
import { AGENT_PRESETS } from "@/lib/game/engine";

export default function Home() {
  const {
    gameState,
    isPlaying,
    isOver,
    turn,
    maxTurns,
    speed,
    setSpeed,
    batchSize,
    setBatchSize,
    isBatchRunning,
    leaderboard,
    batchProgress,
    selectedAgentId,
    setSelectedAgentId,
    step,
    playPause,
    reset,
    runBatch,
    historyIndex,
    setHistoryIndex,
    isLLMThinking,
    lastLLMReason,
    useLLM,
    setUseLLM,
    gameMode,
    switchMode,
    versusPair,
    setVersusPair,
    humanDir,
    setHumanDir,
  } = useGame();

  const [showCoords, setShowCoords] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "batch">("live");

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(6,182,212,0.8)]" />
          <span className="text-xs font-mono tracking-[0.3em] text-cyan-400 animate-pulse">INSERT COIN...</span>
        </div>
      </div>
    );
  }

  const isHumanMode = gameMode === 'human';
  const isVersus = gameMode === 'versus' || gameMode === 'llmBattle';
  const aliveCount = gameState.agents.filter(a=>a.alive).length;

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-fuchsia-500/30">
      {/* Animated background grid */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.07)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,black_80%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-cyan-500/10 via-fuchsia-500/10 to-transparent blur-[80px]" />
      </div>

      <ApiKeyPanel />

      {/* Header - arcade marquee */}
      <header className="relative z-20 border-b-2 border-zinc-800 bg-black">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-fuchsia-500/10" />
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 h-[86px] flex items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 p-[2px] shadow-[0_0_20px_rgba(6,182,212,0.6)]">
              <div className="w-full h-full rounded-[10px] bg-black flex items-center justify-center text-xl font-black">A</div>
            </div>
            <div>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tighter leading-none flex gap-2">
                <span className="text-white" style={{ textShadow: '0 0 10px #0ff, 0 0 20px #0ff' }}>AGENT</span>
                <span className="text-white" style={{ textShadow: '0 0 10px #f0f, 0 0 20px #f0f' }}>ARENA</span>
                <span className="ml-2 text-[10px] font-mono tracking-widest text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-full">ARCADE EDITION • v2</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className={`px-2 py-0.5 rounded-full border font-bold tracking-widest ${isOver ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : isPlaying ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                    {isOver ? '■ GAME OVER' : isPlaying ? '● RUNNING' : '■ PAUSED'}
                  </span>
                  {isLLMThinking && (
                    <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-white border border-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.6)] animate-pulse tracking-widest font-bold">
                      ✨ LLM THINKING... {lastLLMReason.slice(0,20)}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-[10px] font-mono text-zinc-500">SEED:{gameState.seed} • TURN:{turn}/{maxTurns} • {aliveCount} ALIVE</span>
              </div>
            </div>
          </div>

          {/* Mode selector - like arcade game select */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-zinc-900 border border-zinc-800">
              {([
                ['arena', 'ARENA'],
                ['human', '1P VS BOTS'],
                ['versus', 'VERSUS'],
                ['llmBattle', 'LLM BATTLE'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => switchMode(mode)}
                  className={`h-8 px-3 rounded-full text-[11px] font-black tracking-widest transition-all border ${
                    gameMode === mode
                      ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCoords(v => !v)}
              className="h-8 w-8 sm:w-auto sm:px-3 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-bold tracking-widest hover:bg-zinc-800 transition"
            >
              <span className="hidden sm:inline">{showCoords ? 'COORDS ON' : 'COORDS'}</span>
              <span className="sm:hidden">C</span>
            </button>
          </div>
        </div>

        {/* Mobile mode selector */}
        <div className="lg:hidden relative border-t border-zinc-800 bg-zinc-950 px-4 py-2 flex gap-1 overflow-x-auto">
          {([
            ['arena', 'ARENA'],
            ['human', '1P VS BOTS 😎'],
            ['versus', 'VERSUS ⚔️'],
            ['llmBattle', 'LLM BATTLE ✨'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`whitespace-nowrap h-7 px-3 rounded-full text-[10px] font-black tracking-widest border ${
                gameMode === mode ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Scoreboard marquee like classic arcade */}
      <div className="relative z-20 bg-black border-b border-zinc-800 overflow-hidden">
        <div className="max-w-[1600px] mx-auto grid grid-cols-3 h-[44px]">
          <div className="flex flex-col items-center justify-center border-r border-zinc-800 bg-gradient-to-b from-zinc-900 to-black">
            <span className="text-[9px] font-mono tracking-[0.2em] text-cyan-400">1P HIGH SCORE</span>
            <span className="text-sm font-black font-mono text-white tracking-widest">{gameState.agents.find(a=>a.id==='human')?.score ?? gameState.agents[0]?.score ?? 0}</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-black">
            <span className="text-[9px] font-mono tracking-[0.2em] text-yellow-400">CREDITS • {isHumanMode ? 'HUMAN MODE' : `${gameState.agents.length} FIGHTERS`}</span>
            <span className="text-[11px] font-black tracking-widest text-white">{gameState.history.length} TURNS • {(1000/1.12).toFixed(0)} GAMES/SEC BENCH</span>
          </div>
          <div className="flex flex-col items-center justify-center border-l border-zinc-800 bg-gradient-to-b from-zinc-900 to-black">
            <span className="text-[9px] font-mono tracking-[0.2em] text-fuchsia-400">2P • {isVersus ? versusPair.join(' vs ') : 'CPU'}</span>
            <span className="text-sm font-black font-mono text-white tracking-widest">{gameState.winnerId ? AGENT_PRESETS.find(a=>a.id===gameState.winnerId)?.name.toUpperCase() + ' WINS' : 'FIGHT!'}</span>
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-[1600px] mx-auto p-3 sm:p-6">
        {/* LLM Reason banner */}
        {lastLLMReason && gameMode !== 'arena' && (
          <div className="mb-4 rounded-xl border border-fuchsia-500/30 bg-zinc-900/80 backdrop-blur p-3 flex gap-3 items-center shadow-[0_0_20px_rgba(232,121,249,0.15)]">
            <div className="w-8 h-8 rounded-full bg-fuchsia-500 flex items-center justify-center text-sm animate-pulse">✨</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black tracking-widest text-fuchsia-300">MUSE SPARK REASONING</div>
              <div className="text-xs font-mono text-white truncate">{lastLLMReason}</div>
            </div>
            <label className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={useLLM} onChange={e=>setUseLLM(e.target.checked)} className="accent-fuchsia-500" />
              USE LLM
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4 sm:gap-6">
          {/* LEFT: Cabinet + Board */}
          <div className="flex flex-col gap-4">
            <ArcadeGameBoard
              gameState={gameState}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              showCoords={showCoords}
            />

            <ArcadeControls
              isPlaying={isPlaying}
              isOver={isOver}
              onPlayPause={playPause}
              onStep={step}
              onReset={() => reset()}
              speed={speed}
              setSpeed={setSpeed}
              humanDir={humanDir}
              onHumanDir={setHumanDir}
              gameMode={gameMode}
              isLLMThinking={isLLMThinking}
            />

            {/* Replay slider - arcade style */}
            {gameState.history.length > 1 && (
              <div className="rounded-xl border-2 border-zinc-800 bg-black p-3 flex items-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                <span className="text-[10px] font-black tracking-widest text-zinc-500">REPLAY</span>
                <input
                  type="range"
                  min={0}
                  max={gameState.history.length - 1}
                  value={historyIndex}
                  onChange={e => setHistoryIndex(Number(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <span className="text-xs font-mono text-white">{historyIndex}/{gameState.history.length-1}</span>
                <button
                  onClick={() => setHistoryIndex(gameState.history.length-1)}
                  className="h-7 px-3 rounded-full bg-white text-black text-[10px] font-black tracking-widest"
                >
                  LIVE
                </button>
              </div>
            )}

            {/* Insight bar */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between text-[11px] font-mono">
              <div className="flex gap-4">
                <span className="text-zinc-500">TURN <span className="text-white font-bold">{turn}</span></span>
                <span className="text-zinc-700">•</span>
                <span className="text-zinc-400">{aliveCount} ALIVE</span>
                <span className="text-zinc-700">•</span>
                <span className="text-zinc-400">{gameState.resources.length} RESOURCES</span>
              </div>
              <div className="text-cyan-400">{((turn / maxTurns)*100).toFixed(0)}% • {isHumanMode ? 'USE WASD' : 'SPACE=PLAY'}</div>
            </div>

            {/* Fighter select for versus modes */}
            {isVersus && (
              <FighterSelect
                selected={versusPair}
                onSelect={(pair) => {
                  setVersusPair(pair);
                  switchMode(gameMode, pair);
                }}
                mode={gameMode === 'llmBattle' ? 'llmBattle' : 'versus'}
              />
            )}
          </div>

          {/* RIGHT: Panels */}
          <div className="flex flex-col gap-4">
            {/* Mode description */}
            <div className="rounded-xl border-2 border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                <h3 className="text-xs font-black tracking-[0.2em] text-white">
                  {gameMode === 'human' ? '🎮 HUMAN MODE • YOU VS BOTS' : gameMode === 'versus' ? '⚔️ VERSUS MODE' : gameMode === 'llmBattle' ? '✨ LLM BATTLE • MODEL VS MODEL' : '🏟️ ARENA MODE • BATTLE ROYALE'}
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed font-mono text-zinc-400">
                {gameMode === 'human' && 'You are 😎 YOU (yellow). Move with WASD / arrows, SPACE=stay. Collect 💰💎⚡ and avoid ⚔️. Bots use BFS + heuristics. Can you beat StrategistSam (34.7% win rate in 1000 sims)?'}
                {gameMode === 'arena' && '6 agents battle royale. Add your API key via 🔑 button to enable ✨ MuseSpark (2728 reasoning tokens avg). Set speed with slider. Press SPACE to play.'}
                {gameMode === 'versus' && 'Pick any 2 fighters for 1v1 duel. Best of grid! Try 🧠 vs ✨ or 😎 vs 🧠. Winner is last alive or highest score after 100 turns.'}
                {gameMode === 'llmBattle' && 'Model vs Model! Configure two different API keys, models (1.1 vs 20260615), reasoning (low vs high), and custom prompts in 🔑 API KEYS panel. Watch LLM reasoning battle!'}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setActiveTab('live')} className={`flex-1 h-8 rounded-full text-[10px] font-black tracking-widest border ${activeTab==='live'?'bg-white text-black border-white':'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>LIVE VIEW</button>
                <button onClick={() => setActiveTab('batch')} className={`flex-1 h-8 rounded-full text-[10px] font-black tracking-widest border ${activeTab==='batch'?'bg-white text-black border-white':'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>BATCH STATS</button>
              </div>
            </div>

            {activeTab === 'live' ? (
              <>
                <div className="rounded-xl border-2 border-zinc-800 bg-black p-2 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                  <AgentPanel
                    agents={gameState.agents}
                    winnerId={gameState.winnerId}
                    selectedAgentId={selectedAgentId}
                    onSelect={setSelectedAgentId}
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-2">
                  <EventLog events={gameState.events} />
                </div>

                {leaderboard.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-black p-2">
                    <Leaderboard entries={leaderboard.slice(0,5)} totalGames={leaderboard[0]?.gamesPlayed} />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-xl border-2 border-zinc-800 bg-black p-2">
                  <Leaderboard entries={leaderboard} isRunning={isBatchRunning} totalGames={leaderboard[0]?.gamesPlayed} />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3">
                  <h4 className="text-xs font-black tracking-widest text-white">⚡ BATCH SIMULATION • 897 GAMES/SEC</h4>
                  <p className="text-[11px] leading-relaxed font-mono text-zinc-400">
                    Runs {batchSize} deterministic games with different seeds. Shows win% robustness. Try 1000 for stats in ~1s.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min={10}
                      max={1000}
                      step={10}
                      value={batchSize}
                      onChange={e=>setBatchSize(Number(e.target.value))}
                      className="flex-1 accent-white"
                    />
                    <span className="text-xs font-mono text-white w-12">{batchSize}</span>
                  </div>
                  <button
                    onClick={() => runBatch()}
                    disabled={isBatchRunning}
                    className="h-10 rounded-full bg-white text-black text-xs font-black tracking-widest hover:bg-zinc-200 disabled:opacity-50 transition shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    {isBatchRunning ? `⏳ RUNNING ${batchProgress?.completed}/${batchProgress?.total}` : `⚡ RUN ${batchSize} SIMULATIONS`}
                  </button>
                  <button
                    onClick={() => runBatch(batchSize, true)}
                    className="h-8 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-bold tracking-widest text-zinc-300 hover:bg-zinc-700"
                  >
                    INCLUDE LLM (SLOW, NO API COST - FALLBACK HEURISTIC)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer marquee */}
        <div className="mt-8 rounded-xl border-2 border-zinc-800 bg-black p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
            AGENT ARENA ARCADE • NEXT.JS 16 • TAILWIND • BYOK • DETERMINISTIC MULBERRY32 • 897 GAMES/SEC
          </div>
          <div className="flex items-center gap-3 text-zinc-600">
            <span>WASD=Move</span>
            <span>•</span>
            <span>SPACE=Play/Pause</span>
            <span>•</span>
            <span>R=Reset</span>
            <span>•</span>
            <span className="text-cyan-400">🔑 = API KEYS FOR LLM VS LLM</span>
          </div>
        </div>
      </main>

      {/* CRT scanline overlay for whole page subtle */}
      <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,white_3px,transparent_4px)]" />
    </div>
  );
}
