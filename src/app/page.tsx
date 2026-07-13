"use client";

import { useGame } from "@/lib/game/useGame";
import GameBoard from "@/components/GameBoard";
import AgentPanel from "@/components/AgentPanel";
import GameControls from "@/components/GameControls";
import EventLog from "@/components/EventLog";
import Leaderboard from "@/components/Leaderboard";
import { useState } from "react";

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
  } = useGame();

  const [showCoords, setShowCoords] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "batch">("live");

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Loading arena...</span>
        </div>
      </div>
    );
  }

  const isReplayMode = historyIndex > 0 && historyIndex < gameState.history.length - 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm">
              A
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight leading-none">Agent Arena</h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-none mt-0.5">AI battle sandbox • 12×12</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className={`px-2.5 py-1 rounded-full border font-medium ${isOver ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white" : isPlaying ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"}`}>
                {isOver ? "🏁 Game Over" : isPlaying ? "● Live" : "⏸ Paused"}
              </span>
              {gameState.seed !== undefined && (
                <span className="px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">
                  seed {gameState.seed}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowCoords(v => !v)}
              className="h-8 px-3 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              {showCoords ? "Hide coords" : "Show coords"}
            </button>

            <div className="flex rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-0.5">
              <button
                onClick={() => setActiveTab("live")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${activeTab === "live" ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}
              >
                Live
              </button>
              <button
                onClick={() => setActiveTab("batch")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${activeTab === "batch" ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400"}`}
              >
                Batch
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Top bar for turn slider if history */}
        {gameState.history.length > 1 && (
          <div className="mb-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-zinc-500">Replay</span>
              <input
                type="range"
                min={0}
                max={gameState.history.length - 1}
                value={isReplayMode ? historyIndex : gameState.history.length - 1}
                onChange={e => setHistoryIndex(Number(e.target.value))}
                className="w-48 accent-zinc-900 dark:accent-white"
              />
              <span className="text-xs font-mono">
                {isReplayMode ? historyIndex : gameState.history.length - 1} / {gameState.history.length - 1}
              </span>
              {isReplayMode && (
                <button
                  onClick={() => setHistoryIndex(gameState.history.length - 1)}
                  className="text-xs px-2 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black"
                >
                  Back to live
                </button>
              )}
            </div>

            {batchProgress && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Batch {batchProgress.completed}/{batchProgress.total}</span>
                <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-600" style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 sm:gap-6">
          {/* Left Column: Board + Controls */}
          <div className="flex flex-col gap-4">
            <GameBoard
              gameState={gameState}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              showCoords={showCoords}
            />

            <GameControls
              isPlaying={isPlaying}
              isOver={isOver}
              turn={gameState.turn}
              maxTurns={maxTurns}
              batchSize={batchSize}
              setBatchSize={setBatchSize}
              speed={speed}
              setSpeed={setSpeed}
              onStep={step}
              onPlayPause={playPause}
              onReset={reset}
              onRunBatch={() => runBatch()}
              isBatchRunning={isBatchRunning}
              isRunning={isPlaying}
            />

            {/* turn events summary strip */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex items-center justify-between text-xs">
              <div className="flex gap-3">
                <span className="text-zinc-500">Turn {turn}</span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>{gameState.agents.filter(a=>a.alive).length} alive</span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>{gameState.resources.length} resources</span>
              </div>
              <div className="font-mono text-[11px] text-zinc-500">
                {((turn / maxTurns) * 100).toFixed(0)}% complete
              </div>
            </div>
          </div>

          {/* Right Column: Panels */}
          <div className="flex flex-col gap-4">
            {activeTab === "live" ? (
              <>
                <AgentPanel
                  agents={gameState.agents}
                  winnerId={gameState.winnerId}
                  selectedAgentId={selectedAgentId}
                  onSelect={setSelectedAgentId}
                />
                <EventLog events={gameState.events} />
              </>
            ) : (
              <>
                <Leaderboard entries={leaderboard} isRunning={isBatchRunning} totalGames={leaderboard[0]?.gamesPlayed} />
                {leaderboard.length === 0 && !isBatchRunning && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
                    <h4 className="text-sm font-semibold">How batch works</h4>
                    <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      Runs {batchSize} independent games with different seeds. Each agent uses its strategy.
                      Stats are averaged to show which strategy is most robust.
                    </p>
                    <button
                      onClick={() => runBatch()}
                      className="mt-2 h-10 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 transition"
                    >
                      ⚡ Run {batchSize} simulations
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Always show leaderboard collapsed when live? optional */}
            {activeTab === "live" && leaderboard.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-sm font-semibold">Last Batch Results</h4>
                  <button onClick={() => setActiveTab("batch")} className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                    View full →
                  </button>
                </div>
                <div className="p-2">
                  <Leaderboard entries={leaderboard.slice(0, 3)} totalGames={leaderboard[0]?.gamesPlayed} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[11px] text-zinc-400 dark:text-zinc-600 flex flex-col gap-1">
          <div>Agent Arena • Built with Next.js + Tailwind • Engine is deterministic with seed</div>
          <div className="font-mono">Press Space to play/pause • N to step • R to reset</div>
        </div>
      </main>
    </div>
  );
}
