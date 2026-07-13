"use client";

import { useGame } from "@/lib/game/useGame";
import { useState, useEffect } from "react";
import ApiKeyPanel from "@/components/arcade/ApiKeyPanel";
import ArcadeGameBoard from "@/components/arcade/ArcadeGameBoard";
import ArcadeControls from "@/components/arcade/ArcadeControls";
import FighterSelect from "@/components/arcade/FighterSelect";
import Tutorial, { useTutorial } from "@/components/arcade/Tutorial";

export default function Home() {
  const {
    gameState,
    isPlaying,
    isOver,
    turn,
    maxTurns,
    speed,
    setSpeed,
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
    const interval = setInterval(checkKey, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!gameState) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-400 animate-pulse">BOOTING ARCADE...</span>
        </div>
      </div>
    );
  }

  const aliveCount = gameState.agents.filter(a=>a.alive).length;
  const humanAgent = gameState.agents.find(a=>a.id==='human');
  const winner = gameState.winnerId ? gameState.agents.find(a=>a.id===gameState.winnerId) : null;
  const isHumanMode = gameMode === 'human';
  const isVersus = gameMode === 'versus' || gameMode === 'llmBattle';

  return (
    <div className="h-[100dvh] w-screen flex flex-col overflow-hidden bg-black text-white font-sans select-none">
      {/* BG */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,black_90%)]" />
      </div>

      <ApiKeyPanel />
      {tutorial.show && <Tutorial onClose={() => tutorial.close()} />}

      {/* COMPACT HEADER - 48px */}
      <header className="relative z-20 shrink-0 h-12 border-b border-zinc-800 bg-black flex items-center">
        <div className="w-full max-w-[1600px] mx-auto px-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 p-[1px] shrink-0">
              <div className="w-full h-full rounded-[7px] bg-black flex items-center justify-center font-black text-xs">A</div>
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-black tracking-tighter leading-none flex items-center gap-1.5 truncate">
                <span className="text-white" style={{ textShadow: '0 0 8px #0ff' }}>AGENT</span>
                <span className="text-white" style={{ textShadow: '0 0 8px #f0f' }}>ARENA</span>
                <span className="hidden sm:inline text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 tracking-widest ml-1">ARCADE</span>
              </h1>
              <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-zinc-500 leading-none mt-0.5">
                <span>TURN {turn}/{maxTurns}</span><span>•</span><span>{aliveCount} ALIVE</span><span>•</span><span>SEED {gameState.seed}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => tutorial.open()} className="h-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold hover:bg-zinc-800">❓</button>
            <button onClick={() => setShowCoords(v=>!v)} className="h-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold hover:bg-zinc-800 hidden sm:flex">{showCoords ? 'COORDS' : 'GRID'}</button>
            <div className={`h-7 px-3 rounded-full border text-[10px] font-black tracking-widest flex items-center gap-1.5 ${isOver ? 'bg-red-500 border-red-400 text-white' : isPlaying ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-black animate-pulse' : 'bg-zinc-500'}`} />
              {isOver ? 'OVER' : isPlaying ? 'LIVE' : 'PAUSE'}
            </div>
          </div>
        </div>
      </header>

      {/* MODE SELECTOR - 36px, no scroll */}
      <div className="relative z-20 shrink-0 h-9 border-b border-zinc-800 bg-zinc-950 flex items-center px-2 gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'arena', icon: '🏟️', label: 'WATCH' },
          { id: 'human', icon: '😎', label: 'PLAY' },
          { id: 'versus', icon: '⚔️', label: 'VS' },
          { id: 'llmBattle', icon: '✨', label: 'LLM BATTLE' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id as any)}
            className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-black tracking-wide border transition-all flex items-center gap-1 ${gameMode===m.id ? 'bg-white border-white text-black shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
          >
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-600 whitespace-nowrap">
          <span className="hidden lg:inline">💰10 💎25 ⚡50+heal ❤️HP ⚔️20-30dmg</span>
          {!hasApiKey && <span className="text-fuchsia-400 animate-pulse">🔑 Add key for LLM battles → top-right</span>}
        </div>
      </div>

      {/* ALERT BANNERS - max 28px each, overlay-like */}
      {!hasApiKey && gameMode!=='arena' && (
        <div className="relative z-20 shrink-0 h-7 bg-gradient-to-r from-fuchsia-600 to-cyan-600 flex items-center justify-center px-3 text-[10px] font-mono text-white font-bold tracking-wide truncate">
          🔑 BYOK: Click 🔑 API KEYS → paste Meta key LLM|... to unlock real LLM reasoning (2728 tokens/move)
        </div>
      )}
      {(isLLMThinking || lastLLMReason) && (
        <div className="relative z-20 shrink-0 h-8 bg-zinc-900 border-b border-fuchsia-500/30 flex items-center gap-2 px-3 text-[11px] font-mono overflow-hidden">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${isLLMThinking ? 'bg-fuchsia-500 animate-pulse' : 'bg-white text-black'}`}>✨</span>
          <span className="truncate text-white">{isLLMThinking ? 'Muse Spark thinking (2-4s)...' : lastLLMReason}</span>
          <label className="ml-auto flex items-center gap-1 shrink-0 text-[10px] text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={useLLM} onChange={e=>setUseLLM(e.target.checked)} className="accent-fuchsia-500" /> REAL LLM
          </label>
        </div>
      )}
      {isHumanMode && (
        <div className="relative z-20 shrink-0 h-7 bg-yellow-400 text-black flex items-center justify-center gap-3 px-3 text-[11px] font-black tracking-wide">
          <span>YOU ARE 😎 - WASD/ARROWS TO MOVE - SPACE=STAY</span>
          <span className="px-2 py-0.5 rounded-full bg-black text-yellow-400">{humanDir.toUpperCase()} {humanDir==='up'?'↑':humanDir==='down'?'↓':humanDir==='left'?'←':humanDir==='right'?'→':'●'}</span>
        </div>
      )}
      {isOver && winner && (
        <div className="relative z-20 shrink-0 h-8 bg-white text-black flex items-center justify-center gap-2 px-3 text-xs font-black tracking-wide">
          <span>{winner.emoji} {winner.name.toUpperCase()} WINS! Score:{winner.score} Kills:{winner.kills}</span>
          <button onClick={()=>reset()} className="ml-2 h-6 px-3 rounded-full bg-black text-white text-[10px] font-black">PLAY AGAIN ↻</button>
        </div>
      )}

      {/* MAIN - fits remaining viewport, no scroll */}
      <main className="relative z-10 flex-1 min-h-0 max-w-[1600px] w-full mx-auto flex flex-col lg:flex-row gap-2 p-2 overflow-hidden">
        {/* LEFT: Board + Controls - takes available space */}
        <div className="flex-1 min-h-0 flex flex-col gap-2 lg:max-w-[640px] xl:max-w-[700px] mx-auto lg:mx-0 w-full">
          {/* Board wrapper - centered, fits */}
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="w-full max-w-[min(100vw-16px,56vh,640px)] lg:max-w-[min(56vh,640px)] aspect-square">
              <ArcadeGameBoard gameState={gameState} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} showCoords={showCoords} />
            </div>
          </div>

          {/* Controls - compact, always visible */}
          <div className="shrink-0">
            <ArcadeControls isPlaying={isPlaying} isOver={isOver} onPlayPause={playPause} onStep={step} onReset={()=>reset()} speed={speed} setSpeed={setSpeed} humanDir={humanDir} onHumanDir={setHumanDir} gameMode={gameMode} isLLMThinking={isLLMThinking} />
          </div>

          {/* Legend - single line, compact */}
          <div className="shrink-0 hidden sm:flex h-6 rounded-full bg-zinc-950 border border-zinc-800 items-center justify-center gap-3 px-3 text-[10px] font-mono text-zinc-500">
            <span>💰 10pts</span><span className="text-zinc-800">•</span><span>💎 25pts</span><span className="text-zinc-800">•</span><span>⚡ 50pts + heal 30</span><span className="text-zinc-800">•</span><span>⚔️ Adjacent = 20-30 dmg</span><span className="text-zinc-800">•</span><span>💀 Kill +50</span>
          </div>
        </div>

        {/* RIGHT: Compact agent list + mode info - fits without scroll */}
        <div className="flex-1 lg:flex-initial lg:w-[380px] xl:w-[420px] min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Quick explain - 2 lines */}
          <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 flex gap-2">
            <div className="w-7 h-7 rounded-full bg-cyan-400 flex items-center justify-center text-black font-black text-xs shrink-0">?</div>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-white tracking-wide leading-none">
                {gameMode==='human' ? 'PLAY: You are yellow 😎, WASD to move, collect coins, avoid fights' : gameMode==='versus' ? 'VERSUS: Pick 2 fighters below, press PLAY' : gameMode==='llmBattle' ? 'LLM BATTLE: Configure 2 different AIs in 🔑 API KEYS, watch reasoning battle' : 'WATCH: 6 AIs battle automatically, no controls needed'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 leading-tight mt-1">Grid 12x12 • Collision blocks • Resources respawn every 5 turns • Last alive or high score wins</div>
            </div>
          </div>

          {/* Versus fighter select when needed - compact */}
          {isVersus && (
            <div className="shrink-0">
              <FighterSelect selected={versusPair} onSelect={(pair)=>switchMode(gameMode, pair)} mode={gameMode==='llmBattle' ? 'llmBattle' : 'versus'} />
            </div>
          )}

          {/* Agent list - compact, no scroll, 6 rows fit */}
          <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-black flex flex-col overflow-hidden">
            <div className="shrink-0 h-7 px-3 flex items-center justify-between border-b border-zinc-800 bg-zinc-950">
              <span className="text-[10px] font-black tracking-[0.2em] text-zinc-400">FIGHTERS • CLICK TO HIGHLIGHT • {aliveCount} ALIVE</span>
              <span className="text-[9px] font-mono text-zinc-600">TURN {turn}/{maxTurns}</span>
            </div>
            <div className="flex-1 min-h-0 flex flex-col p-1.5 gap-1 overflow-y-auto scrollbar-thin">
              {gameState.agents.map(agent => {
                const descs: Record<string,string> = {
                  'a1': 'Random — dumb',
                  'a2': 'Greedy — rushes nearest coin',
                  'a3': 'Hunter — chases enemies, dies fast',
                  'a4': 'Strategist — best balance',
                  'a5': 'Avoider — survives longest',
                  'a6': hasApiKey && useLLM ? 'LLM — real reasoning' : 'LLM — heuristic fallback',
                  'human': 'YOU — WASD controls',
                };
                const isSelected = selectedAgentId===agent.id;
                const isDead = !agent.alive;
                return (
                  <button
                    key={agent.id}
                    onClick={()=>setSelectedAgentId(agent.id)}
                    className={`shrink-0 h-[46px] rounded-lg border px-2.5 flex items-center gap-2.5 text-left transition-all ${isSelected ? 'bg-white border-white text-black' : isDead ? 'bg-zinc-900/50 border-zinc-800 opacity-50' : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'}`}
                  >
                    <div className="text-[18px] leading-none">{agent.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black tracking-wide truncate">{agent.name}</span>
                        {agent.id==='human' && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-yellow-400 text-black">YOU</span>}
                        {isDead && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">DEAD</span>}
                      </div>
                      <div className={`text-[10px] font-mono leading-none truncate ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>{descs[agent.id]} • HP:{agent.health} S:{agent.score}{agent.kills>0 ? ` K:${agent.kills}` : ''}</div>
                    </div>
                    <div className="w-8 shrink-0">
                      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${agent.health}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Replay tiny */}
            {gameState.history.length > 1 && (
              <div className="shrink-0 h-8 px-3 flex items-center gap-2 border-t border-zinc-800 bg-zinc-950">
                <span className="text-[9px] font-black text-zinc-500">REPLAY</span>
                <input type="range" min={0} max={gameState.history.length-1} value={historyIndex} onChange={e=>setHistoryIndex(Number(e.target.value))} className="flex-1 accent-white h-1" />
                <span className="text-[10px] font-mono text-white">{historyIndex}/{gameState.history.length-1}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Tiny footer - 20px */}
      <footer className="relative z-10 shrink-0 h-5 border-t border-zinc-800 bg-black flex items-center justify-center px-3 text-[9px] font-mono text-zinc-600 gap-3 overflow-hidden whitespace-nowrap">
        <span>SPACE=Play N=Step R=Reset WASD=Move 🔑=API Keys</span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">897 games/sec bench • github.com/jackk/agent-arena</span>
      </footer>
    </div>
  );
}
