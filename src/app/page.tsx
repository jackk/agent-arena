"use client";
// @ts-nocheck
import { useSnakeGame } from "@/lib/game/useSnakeGame";
import { useState, useEffect } from "react";
import ApiKeyPanel from "@/components/arcade/ApiKeyPanel";
import ArcadeControls from "@/components/arcade/ArcadeControls";
import FighterSelect from "@/components/arcade/FighterSelect";
import Tutorial, { useTutorial } from "@/components/arcade/Tutorial";
import SnakeBoard2D from "@/components/arcade/SnakeBoard2D";
import Snake3DBoard from "@/components/arcade/Snake3DBoard";
import ForestFPV from "@/components/arcade/ForestFPV";
import PS2Forest from "@/components/arcade/PS2Forest";
import PS2Overlay from "@/components/arcade/PS2Overlay";

export default function Home() {
  const {
    gameState,
    isPlaying,
    isOver,
    turn,
    maxTurns,
    speed,
    setSpeed,
    step,
    playPause,
    reset,
    isLLMThinking,
    lastLLMReason,
    useLLM,
    setUseLLM,
    gameMode,
    switchMode,
    versusPair,
    humanDir,
    setHumanDir,
    view3D,
    setView3D,
    viewMode,
    setViewMode,
  } = useSnakeGame() as any;

  const [showCoords, setShowCoords] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const tutorial = useTutorial();
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    const check = () => {
      const k = localStorage.getItem('agent-arena-api-key') || localStorage.getItem('agent-arena-llm-config');
      setHasApiKey(!!k && k.length > 10);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  if (!gameState) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
          <span className="text-[10px] font-mono tracking-[0.3em] text-emerald-400 animate-pulse">LOADING SNAKE ARENA...</span>
        </div>
      </div>
    );
  }

  const aliveCount = gameState.snakes.filter((s: any)=>s.alive).length;
  const humanSnake = gameState.snakes.find((s: any)=>s.id==='human');
  const winner = gameState.winnerId ? gameState.snakes.find((s: any)=>s.id===gameState.winnerId) : null;
  const isHumanMode = gameMode==='human';

  return (
    <div className="h-[100dvh] w-screen flex flex-col overflow-hidden bg-black text-white font-sans select-none">
      {/* BG grid */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,black_80%)]" />
      </div>

      <ApiKeyPanel />
      {tutorial.show && <Tutorial onClose={()=>tutorial.close()} />}
      <PS2Overlay enabled={true} />

      {/* HEADER - compact */}
      <header className="relative z-20 shrink-0 h-12 border-b border-zinc-800 bg-black flex items-center">
        <div className="w-full max-w-[1600px] mx-auto px-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 p-[1px] shrink-0">
              <div className="w-full h-full rounded-[7px] bg-black flex items-center justify-center font-black text-xs">🐍</div>
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-black tracking-tighter leading-none flex items-center gap-1.5">
                <span className="text-white" style={{ textShadow: '0 0 8px #003791' }}>SNAKE</span>
                <span className="text-white" style={{ textShadow: '0 0 8px #00ff88' }}>ARENA</span>
                <span className="hidden sm:inline text-[8px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#003791] border border-[#1a50c0] text-white tracking-widest ml-1">PS2 EDITION • 480i • FOREST FPV</span>
              </h1>
              <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-zinc-500 leading-none mt-0.5">
                <span>TURN {turn}/{maxTurns}</span><span>•</span><span>{aliveCount} ALIVE</span><span>•</span><span>{gameState.foods.length} 🍄</span><span>•</span><span className="text-[#8f8]">{viewMode==='forest' ? '🌲 PS2 FOREST • FIRST PERSON • BOBBING CAM' : viewMode==='3d' ? '🎮 3D VECTOR WIREFRAME' : '🟩 2D CLASSIC • PIXEL PERFECT'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={()=>{
                const modes: any[] = ['2d','3d','forest'];
                const idx = modes.indexOf(viewMode);
                setViewMode(modes[(idx+1)%modes.length]);
              }}
              className={`h-7 px-3 rounded-full border text-[10px] font-black tracking-wide ${
                viewMode==='forest' ? 'bg-emerald-400 border-emerald-300 text-black shadow-[0_0_12px_rgba(52,211,153,0.6)]' :
                viewMode==='3d' ? 'bg-cyan-400 border-cyan-300 text-black shadow-[0_0_12px_rgba(34,211,238,0.6)]' :
                'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              {viewMode==='forest' ? '🌲 FOREST FPV' : viewMode==='3d' ? '🎮 3D VECTOR' : '🟩 2D CLASSIC'}
            </button>
            <button onClick={()=>tutorial.open()} className="h-7 w-7 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold">?</button>
            <button onClick={()=>setShowCoords(v=>!v)} className="h-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold hidden sm:flex">GRID</button>
            <div className={`h-7 px-3 rounded-full border text-[10px] font-black tracking-widest flex items-center gap-1.5 ${isOver ? 'bg-red-500 border-red-400 text-white' : isPlaying ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-black animate-pulse' : 'bg-zinc-500'}`} />
              {isOver ? 'OVER' : isPlaying ? 'LIVE' : 'PAUSE'}
            </div>
          </div>
        </div>
      </header>

      {/* MODE SELECTOR */}
      <div className="relative z-20 shrink-0 h-9 border-b border-zinc-800 bg-zinc-950 flex items-center px-2 gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'arena', icon: '🏟️', label: 'ARENA' },
          { id: 'human', icon: '😎', label: 'PLAY' },
          { id: 'versus', icon: '⚔️', label: 'VS' },
          { id: 'llmBattle', icon: '✨', label: 'LLM BATTLE' },
        ].map(m => (
          <button
            key={m.id}
            onClick={()=>switchMode(m.id as any)}
            className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-black tracking-wide border flex items-center gap-1 ${gameMode===m.id ? 'bg-white border-white text-black shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
          >
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}
        <div className="ml-auto hidden lg:flex items-center gap-2 text-[10px] font-mono text-zinc-600">
          <span>CLASSIC SNAKE • Use WASD • Eat 💰 💎 to grow • Wall/body = death</span>
          {!hasApiKey && <span className="text-fuchsia-400 animate-pulse">• 🔑 Add key for LLM battles</span>}
        </div>
      </div>

      {/* BANNERS */}
      {!hasApiKey && gameMode!=='arena' && (
        <div className="relative z-20 shrink-0 h-7 bg-gradient-to-r from-emerald-600 to-cyan-600 flex items-center justify-center px-3 text-[10px] font-mono font-bold text-white truncate">
          🔑 BYOK: Click 🔑 API KEYS → paste Meta key LLM|... to unlock real LLM snakes (2728 reasoning tokens/move)
        </div>
      )}
      {(isLLMThinking || lastLLMReason) && (
        <div className="relative z-20 shrink-0 h-8 bg-zinc-900 border-b border-emerald-500/30 flex items-center gap-2 px-3 text-[11px] font-mono overflow-hidden">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${isLLMThinking ? 'bg-emerald-500 animate-pulse' : 'bg-white text-black'}`}>✨</span>
          <span className="truncate text-white">{isLLMThinking ? 'Muse Spark snaking (2-4s)...' : lastLLMReason}</span>
          <label className="ml-auto flex items-center gap-1 shrink-0 text-[10px] text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={useLLM} onChange={e=>setUseLLM(e.target.checked)} className="accent-emerald-500" /> REAL LLM
          </label>
        </div>
      )}
      {isHumanMode && (
        <div className="relative z-20 shrink-0 h-7 bg-yellow-400 text-black flex items-center justify-center gap-3 px-3 text-[11px] font-black tracking-wide">
          <span>YOU ARE 😎 — USE WASD/ARROWS — DON'T HIT WALL OR BODY — EAT TO GROW</span>
          <span className="px-2 py-0.5 rounded-full bg-black text-yellow-400">{humanDir.toUpperCase()} {humanDir==='up'?'↑':humanDir==='down'?'↓':humanDir==='left'?'←':humanDir==='right'?'→':'●'}</span>
        </div>
      )}
      {isOver && winner && (
        <div className="relative z-20 shrink-0 h-8 bg-white text-black flex items-center justify-center gap-2 px-3 text-xs font-black tracking-wide">
          <span>{winner.emoji} {winner.name.toUpperCase()} WINS! Length:{winner.body.length} Score:{winner.score}</span>
          <button onClick={()=>reset()} className="ml-2 h-6 px-3 rounded-full bg-black text-white text-[10px] font-black">PLAY AGAIN ↻</button>
        </div>
      )}

      {/* MAIN GAME AREA - fits viewport */}
      <main className="relative z-10 flex-1 min-h-0 max-w-[1600px] w-full mx-auto flex flex-col lg:flex-row gap-2 p-2 overflow-hidden">
        {/* LEFT: Board - fits */}
        <div className="flex-1 min-h-0 flex flex-col gap-2 lg:max-w-[640px] xl:max-w-[700px] mx-auto lg:mx-0 w-full">
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="w-full max-w-[min(100vw-16px,60dvh,700px)] lg:max-w-[min(62vh,700px)] aspect-square">
              {viewMode==='forest' ? (
                <PS2Forest state={gameState} />
              ) : viewMode==='3d' ? (
                <Snake3DBoard state={gameState} isPlaying={isPlaying} />
              ) : (
                <SnakeBoard2D state={gameState} selectedId={selectedId} onSelect={setSelectedId} showCoords={showCoords} />
              )}
            </div>
          </div>

          {/* Controls - compact */}
          <div className="shrink-0">
            <ArcadeControls isPlaying={isPlaying} isOver={isOver} onPlayPause={playPause} onStep={step} onReset={()=>reset()} speed={speed} setSpeed={setSpeed} humanDir={humanDir} onHumanDir={setHumanDir} gameMode={gameMode} isLLMThinking={isLLMThinking} />
          </div>

          <div className="shrink-0 hidden sm:flex h-6 rounded-full bg-zinc-950 border border-zinc-800 items-center justify-center gap-3 px-3 text-[10px] font-mono text-zinc-500">
            <span>💰 10pts</span><span className="text-zinc-800">•</span><span>💎 25pts</span><span className="text-zinc-800">•</span><span>🐍 EAT = GROW + SCORE</span><span className="text-zinc-800">•</span><span>WALL/BODY = 💥 DEATH</span><span className="text-zinc-800">•</span><span>LAST ALIVE WINS</span>
          </div>
        </div>

        {/* RIGHT: Info - compact, no scroll */}
        <div className="flex-1 lg:flex-initial lg:w-[380px] xl:w-[420px] min-h-0 flex flex-col gap-2 overflow-hidden">
          {/* Explain */}
          <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 flex gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center text-black font-black text-xs shrink-0">?</div>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-white tracking-wide leading-none">
                {gameMode==='human' ? 'CLASSIC SNAKE: You are 😎 yellow snake, WASD to move, eat food to grow, don\'t crash' : gameMode==='versus' ? 'VERSUS: Pick 2 snakes for 1v1 duel' : gameMode==='llmBattle' ? 'LLM BATTLE: 2 AIs with different keys/models battle' : 'ARENA: 6 snakes classic battle royale'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 leading-tight mt-1">Classic rules everyone knows • No weird resource battle • Just eat, grow, survive • 3D vector view = wireframe Tron style</div>
            </div>
          </div>

          { (gameMode==='versus' || gameMode==='llmBattle') && (
            <div className="shrink-0">
              <FighterSelect selected={versusPair} onSelect={(pair)=>switchMode(gameMode, pair as any)} mode={gameMode==='llmBattle' ? 'llmBattle' : 'versus'} />
            </div>
          )}

          {/* Snakes list */}
          <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-black flex flex-col overflow-hidden">
            <div className="shrink-0 h-7 px-3 flex items-center justify-between border-b border-zinc-800 bg-zinc-950">
              <span className="text-[10px] font-black tracking-[0.2em] text-zinc-400">SNAKES • {aliveCount} ALIVE • CLICK TO HIGHLIGHT</span>
              <span className="text-[9px] font-mono text-zinc-600">TURN {turn}/{maxTurns}</span>
            </div>
            <div className="flex-1 min-h-0 flex flex-col p-1.5 gap-1 overflow-y-auto scrollbar-thin">
              {gameState.snakes.map(snake => {
                const descs: Record<string,string> = {
                  'a1': 'Random — dumb',
                  'a2': 'Greedy — chases nearest food',
                  'a3': 'Hunter — tries to trap others',
                  'a4': 'Strategist — safest + food',
                  'a5': 'Avoider — maximizes space, longest survival',
                  'a6': hasApiKey && useLLM ? 'LLM — real reasoning' : 'LLM — heuristic fallback',
                  'human': 'YOU — WASD controls',
                };
                const isSelected = selectedId===snake.id;
                const isDead = !snake.alive;
                return (
                  <button
                    key={snake.id}
                    onClick={()=>setSelectedId(snake.id)}
                    className={`shrink-0 h-[44px] rounded-lg border px-2.5 flex items-center gap-2.5 text-left ${isSelected ? 'bg-white border-white text-black' : isDead ? 'bg-zinc-900/50 border-zinc-800 opacity-50' : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'}`}
                  >
                    <div className="text-[18px] leading-none">{snake.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black tracking-wide truncate">{snake.name}</span>
                        {snake.id==='human' && <span className="text-[8px] font-black px-1 py-0.5 rounded-full bg-yellow-400 text-black">YOU</span>}
                        {isDead && <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-red-500 text-white">DEAD</span>}
                      </div>
                      <div className={`text-[10px] font-mono leading-none truncate ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>{descs[snake.id]} • LEN:{snake.body.length} S:{snake.score}</div>
                    </div>
                    <div className="w-10 text-right">
                      <div className="text-[11px] font-black font-mono">{snake.body.length}</div>
                      <div className="text-[9px] font-mono text-zinc-500">{snake.score}pts</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer tiny */}
      <footer className="relative z-10 shrink-0 h-5 border-t border-zinc-800 bg-black flex items-center justify-center px-3 text-[9px] font-mono text-zinc-600 gap-2">
        <span>🐍 CLASSIC SNAKE • 3D VECTOR WIREFRAME • DRAG TO ROTATE IN 3D • WASD=Move SPACE=Play R=Reset</span>
      </footer>
    </div>
  );
}
