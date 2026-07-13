"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GameEngine, DEFAULT_CONFIG, AGENT_PRESETS, AGENT_PRESETS_NO_LLM, HUMAN_PRESET, HUMAN_VS_BOTS_PRESETS, VERSUS_PRESETS } from "./engine";
import { GameState, Direction, AgentConfig } from "./types";
import { LeaderboardEntry } from "@/components/Leaderboard";
import { ALL_STRATEGIES, getStrategyById } from "../agents/strategies";
import { fetchLLMDirection } from "../agents/llm-client";

type BatchProgress = {
  completed: number;
  total: number;
};

export type GameMode = 'arena' | 'human' | 'versus' | 'llmBattle';

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [batchSize, setBatchSize] = useState(100);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const [isLLMThinking, setIsLLMThinking] = useState(false);
  const [lastLLMReason, setLastLLMReason] = useState<string>("");
  const [useLLM, setUseLLM] = useState(true);
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('arena');
  const [versusPair, setVersusPair] = useState<[string, string]>(['a4', 'a6']);
  const [humanDir, setHumanDirState] = useState<Direction>('stay');
  const humanDirRef = useRef<Direction>('stay');
  const [lastHumanInput, setLastHumanInput] = useState<number>(0);

  const engineRef = useRef<GameEngine | null>(null);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStrategyMap = useCallback(() => {
    const map = new Map<string, (s: GameState, id: string) => Direction>();
    for (const strat of ALL_STRATEGIES) {
      map.set(strat.id, strat.decide);
    }
    for (const preset of [...AGENT_PRESETS, HUMAN_PRESET]) {
      if (!map.has(preset.id)) {
        map.set(preset.id, () => {
          const dirs: Direction[] = ['up','down','left','right','stay'];
          return dirs[Math.floor(Math.random()*dirs.length)];
        });
      }
    }
    return map;
  }, []);

  const getPresetsForMode = useCallback((mode: GameMode, pair?: [string,string]): AgentConfig[] => {
    switch(mode) {
      case 'human':
        return HUMAN_VS_BOTS_PRESETS;
      case 'versus':
        return VERSUS_PRESETS(pair?.[0] || versusPair[0], pair?.[1] || versusPair[1]);
      case 'llmBattle':
        // 1v1 LLM battle - two copies of MuseSpark with different IDs? Use a4 vs a6 as proxy, but allow custom
        return VERSUS_PRESETS('a4', 'a6');
      case 'arena':
      default:
        return llmEnabled ? AGENT_PRESETS : AGENT_PRESETS_NO_LLM;
    }
  }, [llmEnabled, versusPair]);

  const initGame = useCallback((seed?: number, customPresets?: AgentConfig[], mode?: GameMode) => {
    const actualMode = mode ?? gameMode;
    const s = seed ?? Math.floor(Math.random() * 1_000_000);
    const engine = new GameEngine(s);
    engineRef.current = engine;
    let presets = customPresets ?? getPresetsForMode(actualMode);
    if (actualMode === 'arena' && !llmEnabled) {
      presets = presets.filter(p => p.id !== 'a6');
    }
    const initial = engine.createInitialState(presets, DEFAULT_CONFIG);
    setGameState(initial);
    setHistoryIndex(0);
    setIsPlaying(false);
    setSelectedAgentId(undefined);
    setIsLLMThinking(false);
    humanDirRef.current = 'stay';
    setHumanDirState('stay');
    if (playRef.current) {
      clearTimeout(playRef.current);
      playRef.current = null;
    }
    return initial;
  }, [llmEnabled, gameMode, getPresetsForMode]);

  const setHumanDir = useCallback((dir: Direction) => {
    humanDirRef.current = dir;
    setHumanDirState(dir);
    setLastHumanInput(Date.now());
  }, []);

  // Async action resolver that handles LLM + Human
  const getActions = useCallback(async (state: GameState): Promise<{ agentId: string; dir: Direction }[]> => {
    const stratMap = getStrategyMap();
    const alive = state.agents.filter(a => a.alive);
    const actions: { agentId: string; dir: Direction }[] = [];
    const hasLLM = alive.some(a => a.id === 'a6') && useLLM && llmEnabled;

    if (hasLLM) setIsLLMThinking(true);

    for (const agent of alive) {
      if (agent.id === 'human') {
        actions.push({ agentId: agent.id, dir: humanDirRef.current });
      } else if (agent.id === 'a6' && useLLM && llmEnabled) {
        try {
          const llmRes = await fetchLLMDirection(state, agent.id);
          setLastLLMReason(`${llmRes.reason} (${llmRes.latencyMs ? Math.round(llmRes.latencyMs/1000*10)/10 + 's' : ''})`);
          actions.push({ agentId: agent.id, dir: llmRes.direction });
        } catch {
          const fn = stratMap.get(agent.id);
          let dir: Direction = 'stay';
          try { dir = fn ? fn(state, agent.id) : 'stay'; } catch { dir = 'stay'; }
          actions.push({ agentId: agent.id, dir });
        }
      } else {
        const fn = stratMap.get(agent.id);
        let dir: Direction = 'stay';
        try { dir = fn ? fn(state, agent.id) : 'stay'; } catch { dir = 'stay'; }
        actions.push({ agentId: agent.id, dir });
      }
    }

    if (hasLLM) setIsLLMThinking(false);
    return actions;
  }, [getStrategyMap, useLLM, llmEnabled]);

  const step = useCallback(async () => {
    if (!gameState) return;
    if (gameState.isOver) return;
    const engine = engineRef.current;
    if (!engine) return;
    const actions = await getActions(gameState);
    setGameState(prev => {
      if (!prev || prev.isOver) return prev;
      return engine.applyTurn(prev, actions);
    });
  }, [gameState, getActions]);

  const play = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
  }, [isPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) {
      clearTimeout(playRef.current);
      playRef.current = null;
    }
  }, []);

  const playPause = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const reset = useCallback((mode?: GameMode) => {
    pause();
    initGame(undefined, undefined, mode);
  }, [initGame, pause]);

  const switchMode = useCallback((mode: GameMode, pair?: [string,string]) => {
    setGameMode(mode);
    if (pair) setVersusPair(pair);
    setTimeout(() => {
      initGame(undefined, pair ? VERSUS_PRESETS(pair[0], pair[1]) : undefined, mode);
    }, 50);
  }, [initGame]);

  // Human keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't interfere when typing in inputs
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      let dir: Direction | null = null;
      switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': dir = 'up'; break;
        case 'ArrowDown': case 's': case 'S': dir = 'down'; break;
        case 'ArrowLeft': case 'a': case 'A': dir = 'left'; break;
        case 'ArrowRight': case 'd': case 'D': dir = 'right'; break;
        case ' ': dir = 'stay'; break;
        case 'Space': 
          if (gameMode === 'human') {
            e.preventDefault();
            setHumanDir('stay');
            return;
          }
          break;
      }
      if (dir && gameMode === 'human') {
        e.preventDefault();
        setHumanDir(dir);
      } else if (e.code === "Space" && gameMode !== 'human') {
        e.preventDefault();
        playPause();
      } else if (e.key === "n" || e.key === "N") {
        if (!isPlaying) step();
      } else if (e.key === "r" || e.key === "R") {
        if (gameMode !== 'human') reset();
        else {
          // reset human mode
          initGame(undefined, undefined, 'human');
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playPause, step, reset, isPlaying, gameMode, setHumanDir, initGame]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !gameState) {
      if (playRef.current) {
        clearTimeout(playRef.current);
        playRef.current = null;
      }
      return;
    }
    if (gameState.isOver) {
      setIsPlaying(false);
      return;
    }

    const loop = async () => {
      if (!engineRef.current) return;
      const current = gameState;
      if (!current || current.isOver) {
        setIsPlaying(false);
        return;
      }
      const actions = await getActions(current);
      setGameState(prev => {
        if (!prev) return prev;
        if (prev.isOver) {
          setIsPlaying(false);
          return prev;
        }
        const engine = engineRef.current!;
        const next = engine.applyTurn(prev, actions);
        if (next.isOver) {
          setIsPlaying(false);
        } else {
          const hasLLM = actions.some(a => a.agentId === 'a6');
          const delay = hasLLM && useLLM ? Math.max(speed, 600) : speed;
          playRef.current = setTimeout(loop, delay);
        }
        return next;
      });
    };

    const hasLLMNow = gameState.agents.some(a => a.alive && a.id === 'a6') && useLLM;
    playRef.current = setTimeout(loop, hasLLMNow ? 100 : speed);

    return () => {
      if (playRef.current) {
        clearTimeout(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, speed, gameState, getActions, useLLM]);

  // Non-LLM fast loop fallback
  useEffect(() => {
    if (useLLM) return;
    if (!isPlaying) return;
    if (gameMode === 'human') return; // human uses main loop

    const stratMap = getStrategyMap();
    playRef.current = setTimeout(function tick() {
      setGameState(prev => {
        if (!prev) return prev;
        if (prev.isOver) {
          setIsPlaying(false);
          return prev;
        }
        const engine = engineRef.current;
        if (!engine) return prev;
        const actions = prev.agents.filter(a=>a.alive).map(a=>{
          if (a.id === 'human') return { agentId: a.id, dir: humanDirRef.current };
          const fn = stratMap.get(a.id);
          let dir: Direction = 'stay';
          try { dir = fn ? fn(prev, a.id) : 'stay'; } catch { dir = 'stay'; }
          return { agentId: a.id, dir };
        });
        const next = engine.applyTurn(prev, actions);
        if (!next.isOver) {
          playRef.current = setTimeout(tick, speed);
        } else {
          setIsPlaying(false);
        }
        return next;
      });
    }, speed) as any;

    return () => {
      if (playRef.current) clearTimeout(playRef.current);
    };
  }, [isPlaying, speed, useLLM, getStrategyMap, gameMode]);

  const goToTurn = useCallback((idx: number) => {
    if (!gameState) return;
    const hist = gameState.history;
    if (idx < 0 || idx >= hist.length) return;
    setHistoryIndex(idx);
  }, [gameState]);

  const runBatch = useCallback(async (size?: number, includeLLM = false) => {
    const total = size ?? batchSize;
    setIsBatchRunning(true);
    setBatchProgress({ completed: 0, total });

    const presets = includeLLM ? AGENT_PRESETS : AGENT_PRESETS_NO_LLM;
    const stats = new Map<string, { wins: number; totalScore: number; totalKills: number; games: number }>();

    for (const preset of presets) {
      stats.set(preset.id, { wins: 0, totalScore: 0, totalKills: 0, games: 0 });
    }

    const stratMap = getStrategyMap();

    await new Promise<void>((resolve) => {
      let completed = 0;
      const chunkSize = 10;

      const runChunk = () => {
        for (let c = 0; c < chunkSize && completed < total; c++) {
          const seed = Math.floor(Math.random() * 1_000_000) + completed;
          const engine = new GameEngine(seed);
          let state = engine.createInitialState(presets, DEFAULT_CONFIG);
          state = engine.simulate(state, stratMap);
          completed++;

          for (const ag of state.agents) {
            const s = stats.get(ag.id);
            if (s) {
              s.games++;
              s.totalScore += ag.score;
              s.totalKills += ag.kills;
              if (state.winnerId === ag.id) s.wins++;
            }
          }
        }
        setBatchProgress({ completed, total });
        if (completed < total) setTimeout(runChunk, 0);
        else resolve();
      };
      runChunk();
    });

    const entries: LeaderboardEntry[] = presets.map(preset => {
      const s = stats.get(preset.id)!;
      const games = s.games || 1;
      return {
        agentId: preset.id,
        name: preset.name,
        color: preset.color,
        emoji: preset.emoji,
        wins: s.wins,
        winRate: (s.wins / games) * 100,
        avgScore: s.totalScore / games,
        avgKills: s.totalKills / games,
        totalKills: s.totalKills,
        totalScore: s.totalScore,
        gamesPlayed: games,
      };
    });

    setLeaderboard(entries.sort((a, b) => b.wins - a.wins));
    setIsBatchRunning(false);
    setBatchProgress(null);
  }, [batchSize, getStrategyMap]);

  useEffect(() => {
    if (!gameState) initGame();
  }, []); // mount only

  const viewingState = gameState ? (
    historyIndex > 0 && historyIndex < gameState.history.length - 1
      ? (() => {
        const snap = gameState.history[historyIndex];
        return {
          ...gameState,
          turn: snap.turn,
          agents: snap.agents,
          resources: snap.resources,
          events: snap.events,
          isOver: historyIndex === gameState.history.length - 1 ? gameState.isOver : false,
          winnerId: historyIndex === gameState.history.length - 1 ? gameState.winnerId : undefined,
        } as GameState;
      })()
      : gameState
  ) : null;

  return {
    gameState: viewingState,
    rawGameState: gameState,
    isPlaying,
    isOver: gameState?.isOver ?? false,
    turn: gameState?.turn ?? 0,
    maxTurns: gameState?.config.maxTurns ?? DEFAULT_CONFIG.maxTurns,
    speed,
    setSpeed,
    batchSize,
    setBatchSize,
    isBatchRunning,
    batchProgress,
    leaderboard,
    historyIndex,
    setHistoryIndex,
    selectedAgentId,
    setSelectedAgentId,
    initGame,
    step,
    play,
    pause,
    playPause,
    reset,
    runBatch,
    runBatchAndSetLeaderboard: runBatch,
    onRunSingle: playPause,
    onRunBatch: runBatch,
    onReset: reset,
    isRunning: isPlaying,
    goToTurn,
    isLLMThinking,
    lastLLMReason,
    useLLM,
    setUseLLM,
    llmEnabled,
    setLlmEnabled,
    gameMode,
    setGameMode,
    switchMode,
    versusPair,
    setVersusPair,
    humanDir,
    setHumanDir,
    lastHumanInput,
  };
}

export default useGame;
