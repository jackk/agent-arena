// @ts-nocheck
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SnakeEngine, SNAKE_DEFAULT_CONFIG, SNAKE_AGENT_PRESETS, SNAKE_AGENT_PRESETS_NO_LLM, SNAKE_HUMAN_PRESET, SNAKE_HUMAN_VS_BOTS, SnakeState, SnakeConfig, SnakeAction } from "./snake-engine";
import { AgentConfig, Direction } from "./types";
import { SNAKE_ALL_STRATEGIES } from "./snake-strategies";
import { fetchSnakeLLMDirection } from "./snake-llm-client";

export type GameMode = 'arena' | 'human' | 'versus' | 'llmBattle';

export function useSnakeGame() {
  const [gameState, setGameState] = useState<SnakeState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(80); // FAST default - classic snake
  const [isLLMThinking, setIsLLMThinking] = useState(false);
  const [lastLLMReason, setLastLLMReason] = useState("");
  const [useLLM, setUseLLM] = useState(false); // default OFF for speed - user can toggle ON for LLM battles
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('arena');
  const [versusPair, setVersusPair] = useState<[string,string]>(['a4','a6']);
  const [humanDir, setHumanDirState] = useState<Direction>('right');
  const humanDirRef = useRef<Direction>('right');
  const llmDirRef = useRef<Direction>('right');
  const llmPendingRef = useRef(false);
  const [view3D, setView3D] = useState(true);
  const [viewMode, setViewMode] = useState<'2d'|'3d'|'forest'>('forest');

  const engineRef = useRef<SnakeEngine | null>(null);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStrategyMap = useCallback(() => {
    const map = new Map<string, (s: SnakeState, id: string) => Direction>();
    for (const strat of SNAKE_ALL_STRATEGIES) {
      map.set(strat.id, strat.decide);
    }
    map.set('human', () => humanDirRef.current);
    return map;
  }, []);

  const getPresetsForMode = useCallback((mode: GameMode, pair?: [string,string]): AgentConfig[] => {
    switch(mode) {
      case 'human': return SNAKE_HUMAN_VS_BOTS;
      case 'versus':
      case 'llmBattle': {
        const all = [...SNAKE_AGENT_PRESETS, SNAKE_HUMAN_PRESET];
        const p1 = pair?.[0] || versusPair[0];
        const p2 = pair?.[1] || versusPair[1];
        return all.filter(a => a.id===p1 || a.id===p2);
      }
      case 'arena':
      default:
        return llmEnabled ? SNAKE_AGENT_PRESETS : SNAKE_AGENT_PRESETS_NO_LLM;
    }
  }, [llmEnabled, versusPair]);

  const initGame = useCallback((seed?: number, customPresets?: AgentConfig[], mode?: GameMode) => {
    const actualMode = mode ?? gameMode;
    const s = seed ?? Math.floor(Math.random()*1000000);
    const engine = new SnakeEngine(s);
    engineRef.current = engine;
    let presets = customPresets ?? getPresetsForMode(actualMode);
    if (actualMode==='arena' && !llmEnabled) presets = presets.filter(p=>p.id!=='a6');
    const initial = engine.createInitialState(presets, SNAKE_DEFAULT_CONFIG);
    setGameState(initial);
    setIsPlaying(false);
    setIsLLMThinking(false);
    llmPendingRef.current = false;
    llmDirRef.current = 'right';
    humanDirRef.current = 'right';
    setHumanDirState('right');
    if (playRef.current) { clearTimeout(playRef.current); playRef.current=null; }
    // In LLM battle mode, auto-enable LLM thinking, in arena/human disable for speed
    if (actualMode==='llmBattle') {
      setUseLLM(true);
    } else if (actualMode==='arena' || actualMode==='human') {
      // Keep fast by default, user can toggle ON if they want slow LLM
      // Don't force-disable, respect user choice but default is OFF
      if (actualMode==='arena') setUseLLM(false);
    }
    return initial;
  }, [gameMode, llmEnabled, getPresetsForMode]);

  const setHumanDir = useCallback((dir: Direction) => {
    humanDirRef.current = dir;
    setHumanDirState(dir);
  }, []);

  // NON-BLOCKING LLM - game never waits for inference
  const triggerLLMBackground = useCallback((state: SnakeState, snakeId: string) => {
    if (llmPendingRef.current) return; // already thinking
    const hasKey = typeof window !== 'undefined' && (localStorage.getItem('agent-arena-api-key') || localStorage.getItem('agent-arena-llm-config'));
    if (!hasKey) {
      // No key, use heuristic and show hint
      setLastLLMReason('No API key - using heuristic fallback (add key in 🔑 panel for real LLM reasoning)');
      return;
    }
    llmPendingRef.current = true;
    setIsLLMThinking(true);
    
    fetchSnakeLLMDirection(state, snakeId)
      .then(res => {
        llmDirRef.current = res.direction;
        setLastLLMReason(`${res.reason} (${res.latencyMs ? (res.latencyMs/1000).toFixed(1)+'s' : ''}) - will use next turn`);
      })
      .catch(() => {
        setLastLLMReason('LLM failed, using heuristic');
      })
      .finally(() => {
        llmPendingRef.current = false;
        setIsLLMThinking(false);
      });
  }, []);

  const getActions = useCallback((state: SnakeState): SnakeAction[] => {
    const stratMap = getStrategyMap();
    const alive = state.snakes.filter(s=>s.alive);
    const actions: SnakeAction[] = [];

    for (const snake of alive) {
      if (snake.id==='human') {
        actions.push({ snakeId: snake.id, dir: humanDirRef.current });
      } else if (snake.id==='a6' && useLLM && llmEnabled) {
        // NON-BLOCKING: Use last LLM dir if available, plus trigger new inference in background
        const fn = stratMap.get(snake.id);
        let heuristicDir: Direction = snake.dir;
        try { heuristicDir = fn ? fn(state, snake.id) : snake.dir; } catch {}

        // If we have a cached LLM dir from previous inference, use it, else heuristic
        const dirToUse = llmDirRef.current && !llmPendingRef.current ? llmDirRef.current : heuristicDir;

        // Trigger background LLM for NEXT turn (don't await)
        if (!llmPendingRef.current) {
          // Don't block - fire and forget, will update ref for next turn
          triggerLLMBackground(state, snake.id);
        }

        actions.push({ snakeId: snake.id, dir: dirToUse });
      } else {
        const fn = stratMap.get(snake.id);
        let dir: Direction = snake.dir;
        try { dir = fn ? fn(state, snake.id) : snake.dir; } catch {}
        actions.push({ snakeId: snake.id, dir });
      }
    }
    return actions;
  }, [getStrategyMap, useLLM, llmEnabled, triggerLLMBackground]);

  const step = useCallback(() => {
    if (!gameState || gameState.isOver) return;
    const engine = engineRef.current;
    if (!engine) return;
    const actions = getActions(gameState);
    setGameState(prev => prev ? engine.applyTurn(prev, actions) : prev);
  }, [gameState, getActions]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) { clearTimeout(playRef.current); playRef.current=null; }
  }, []);
  const playPause = useCallback(() => isPlaying ? pause() : play(), [isPlaying, pause, play]);
  const reset = useCallback((mode?: GameMode) => { pause(); initGame(undefined, undefined, mode); }, [pause, initGame]);

  const switchMode = useCallback((mode: GameMode, pair?: [string,string]) => {
    setGameMode(mode);
    if (pair) setVersusPair(pair);
    setTimeout(() => initGame(undefined, pair ? [...SNAKE_AGENT_PRESETS, SNAKE_HUMAN_PRESET].filter(a=>a.id===pair[0]||a.id===pair[1]) : undefined, mode), 50);
  }, [initGame]);

  // Keyboard for human
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName==='INPUT' || target?.tagName==='TEXTAREA') return;
      let dir: Direction | null = null;
      switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': dir='up'; break;
        case 'ArrowDown': case 's': case 'S': dir='down'; break;
        case 'ArrowLeft': case 'a': case 'A': dir='left'; break;
        case 'ArrowRight': case 'd': case 'D': dir='right'; break;
      }
      if (dir && gameMode==='human') { e.preventDefault(); setHumanDir(dir); }
      else if (e.code==='Space' && gameMode!=='human') { e.preventDefault(); playPause(); }
      else if (e.key==='r' || e.key==='R') { initGame(undefined, undefined, gameMode); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameMode, setHumanDir, playPause, initGame]);

  useEffect(() => { if (!gameState) initGame(); }, []);

  // SINGLE FAST GAME LOOP - never blocks on LLM
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) clearTimeout(playRef.current);
      return;
    }
    if (!gameState || gameState.isOver) {
      setIsPlaying(false);
      return;
    }

    const loop = () => {
      setGameState(prev => {
        if (!prev || prev.isOver) {
          setIsPlaying(false);
          return prev;
        }
        const eng = engineRef.current;
        if (!eng) return prev;
        const acts = getActions(prev);
        const nxt = eng.applyTurn(prev, acts);
        if (nxt.isOver) {
          setIsPlaying(false);
        } else {
          playRef.current = setTimeout(loop, speed);
        }
        return nxt;
      });
    };

    playRef.current = setTimeout(loop, speed);
    return () => { if (playRef.current) clearTimeout(playRef.current); };
  }, [isPlaying, speed, gameState, getActions]);

  return {
    gameState,
    isPlaying,
    isOver: gameState?.isOver ?? false,
    turn: gameState?.turn ?? 0,
    maxTurns: gameState?.config.maxTurns ?? SNAKE_DEFAULT_CONFIG.maxTurns,
    speed,
    setSpeed,
    selectedAgentId: undefined,
    setSelectedAgentId: ()=>{},
    step,
    playPause,
    reset,
    isLLMThinking,
    lastLLMReason,
    useLLM,
    setUseLLM,
    llmEnabled,
    setLlmEnabled,
    gameMode,
    switchMode,
    versusPair,
    setVersusPair,
    humanDir,
    setHumanDir,
    view3D,
    setView3D,
    viewMode,
    setViewMode,
    initGame,
  };
}
