"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SnakeEngine, SNAKE_DEFAULT_CONFIG, SNAKE_AGENT_PRESETS, SNAKE_AGENT_PRESETS_NO_LLM, SNAKE_HUMAN_PRESET, SNAKE_HUMAN_VS_BOTS, SnakeState, SnakeConfig, SnakeAction } from "./snake-engine";
import { AgentConfig, Direction } from "./types";
import { SNAKE_ALL_STRATEGIES } from "./snake-strategies";
import { fetchSnakeLLMDirection, LLMConfig } from "./snake-llm-client";

type BatchProgress = { completed: number; total: number };
export type GameMode = 'arena' | 'human' | 'versus' | 'llmBattle';

export function useSnakeGame() {
  const [gameState, setGameState] = useState<SnakeState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(180);
  const [isLLMThinking, setIsLLMThinking] = useState(false);
  const [lastLLMReason, setLastLLMReason] = useState("");
  const [useLLM, setUseLLM] = useState(true);
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('arena');
  const [versusPair, setVersusPair] = useState<[string,string]>(['a4','a6']);
  const [humanDir, setHumanDirState] = useState<Direction>('right');
  const humanDirRef = useRef<Direction>('right');
  const [view3D, setView3D] = useState(true);

  const engineRef = useRef<SnakeEngine | null>(null);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStrategyMap = useCallback(() => {
    const map = new Map<string, (s: SnakeState, id: string) => Direction>();
    for (const strat of SNAKE_ALL_STRATEGIES) {
      map.set(strat.id, strat.decide);
    }
    // human fallback
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
    humanDirRef.current = 'right';
    setHumanDirState('right');
    if (playRef.current) { clearTimeout(playRef.current); playRef.current=null; }
    return initial;
  }, [gameMode, llmEnabled, getPresetsForMode]);

  const setHumanDir = useCallback((dir: Direction) => {
    humanDirRef.current = dir;
    setHumanDirState(dir);
  }, []);

  const getActions = useCallback(async (state: SnakeState): Promise<SnakeAction[]> => {
    const stratMap = getStrategyMap();
    const alive = state.snakes.filter(s=>s.alive);
    const actions: SnakeAction[] = [];
    const hasLLM = alive.some(s=>s.id==='a6') && useLLM && llmEnabled;
    if (hasLLM) setIsLLMThinking(true);

    for (const snake of alive) {
      if (snake.id==='human') {
        actions.push({ snakeId: snake.id, dir: humanDirRef.current });
      } else if (snake.id==='a6' && useLLM && llmEnabled) {
        try {
          const res = await fetchSnakeLLMDirection(state, snake.id);
          setLastLLMReason(`${res.reason} (${res.latencyMs ? Math.round(res.latencyMs/10)/100 + 's' : ''})`);
          actions.push({ snakeId: snake.id, dir: res.direction });
        } catch {
          const fn = stratMap.get(snake.id);
          let dir: Direction = snake.dir;
          try { dir = fn ? fn(state, snake.id) : snake.dir; } catch {}
          actions.push({ snakeId: snake.id, dir });
        }
      } else {
        const fn = stratMap.get(snake.id);
        let dir: Direction = snake.dir;
        try { dir = fn ? fn(state, snake.id) : snake.dir; } catch {}
        actions.push({ snakeId: snake.id, dir });
      }
    }
    if (hasLLM) setIsLLMThinking(false);
    return actions;
  }, [getStrategyMap, useLLM, llmEnabled]);

  const step = useCallback(async () => {
    if (!gameState || gameState.isOver) return;
    const engine = engineRef.current;
    if (!engine) return;
    const actions = await getActions(gameState);
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

  // Main loop
  useEffect(() => {
    if (!isPlaying || !gameState) {
      if (playRef.current) { clearTimeout(playRef.current); playRef.current=null; }
      return;
    }
    if (gameState.isOver) { setIsPlaying(false); return; }

    const loop = async () => {
      if (!engineRef.current) return;
      const current = gameState;
      if (!current || current.isOver) { setIsPlaying(false); return; }
      const actions = await getActions(current);
      setGameState(prev => {
        if (!prev || prev.isOver) { setIsPlaying(false); return prev; }
        const next = engineRef.current!.applyTurn(prev, actions);
        if (next.isOver) setIsPlaying(false);
        else {
          const hasLLM = actions.some(a=>a.snakeId==='a6');
          const delay = hasLLM && useLLM ? Math.max(speed, 600) : speed;
          playRef.current = setTimeout(loop, delay);
        }
        return next;
      });
    };
    playRef.current = setTimeout(loop, speed);
    return () => { if (playRef.current) clearTimeout(playRef.current); };
  }, [isPlaying, speed, gameState, getActions, useLLM]);

  useEffect(() => { if (!gameState) initGame(); }, []);

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
    initGame,
  };
}
