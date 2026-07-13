"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GameEngine, DEFAULT_CONFIG, AGENT_PRESETS, AGENT_PRESETS_NO_LLM } from "./engine";
import { GameState, Direction, AgentConfig } from "./types";
import { LeaderboardEntry } from "@/components/Leaderboard";
import { ALL_STRATEGIES } from "../agents/strategies";
import { fetchLLMDirection } from "../agents/llm-client";

type BatchProgress = {
  completed: number;
  total: number;
};

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
  const [llmEnabled, setLlmEnabled] = useState(true); // whether a6 is included

  const engineRef = useRef<GameEngine | null>(null);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStrategyMap = useCallback(() => {
    const map = new Map<string, (s: GameState, id: string) => Direction>();
    for (const strat of ALL_STRATEGIES) {
      map.set(strat.id, strat.decide);
    }
    for (const preset of AGENT_PRESETS) {
      if (!map.has(preset.id)) {
        map.set(preset.id, () => {
          const dirs: Direction[] = ['up','down','left','right','stay'];
          return dirs[Math.floor(Math.random()*dirs.length)];
        });
      }
    }
    return map;
  }, []);

  const initGame = useCallback((seed?: number, customPresets?: AgentConfig[]) => {
    const s = seed ?? Math.floor(Math.random() * 1_000_000);
    const engine = new GameEngine(s);
    engineRef.current = engine;
    let presets = customPresets ?? (llmEnabled ? AGENT_PRESETS : AGENT_PRESETS_NO_LLM);
    // if llmEnabled false, ensure a6 not included
    if (!llmEnabled) {
      presets = presets.filter(p => p.id !== 'a6');
    }
    const initial = engine.createInitialState(presets, DEFAULT_CONFIG);
    setGameState(initial);
    setHistoryIndex(0);
    setIsPlaying(false);
    setSelectedAgentId(undefined);
    setIsLLMThinking(false);
    if (playRef.current) {
      clearTimeout(playRef.current);
      playRef.current = null;
    }
    return initial;
  }, [llmEnabled]);

  // Async action resolver that handles LLM
  const getActions = useCallback(async (state: GameState): Promise<{ agentId: string; dir: Direction }[]> => {
    const stratMap = getStrategyMap();
    const alive = state.agents.filter(a => a.alive);

    const actions: { agentId: string; dir: Direction }[] = [];

    // Check if LLM agent needs to think
    const hasLLM = alive.some(a => a.id === 'a6') && useLLM && llmEnabled;

    if (hasLLM) {
      setIsLLMThinking(true);
    }

    for (const agent of alive) {
      if (agent.id === 'a6' && useLLM && llmEnabled) {
        try {
          const llmRes = await fetchLLMDirection(state, agent.id);
          setLastLLMReason(`${llmRes.reason} (${llmRes.latencyMs ? Math.round(llmRes.latencyMs/1000*10)/10 + 's' : ''})`);
          actions.push({ agentId: agent.id, dir: llmRes.direction });
        } catch {
          // fallback to sync strategy
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

    if (hasLLM) {
      setIsLLMThinking(false);
    }

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

  const reset = useCallback(() => {
    pause();
    initGame();
  }, [initGame, pause]);

  // Async game loop with LLM support
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
      // Don't start new loop if already thinking or paused
      if (!engineRef.current) return;

      setGameState(prev => {
        if (!prev) return prev;
        if (prev.isOver) {
          setIsPlaying(false);
          return prev;
        }
        return prev;
      });

      // Get current state snapshot for action generation
      // We use functional update to avoid stale closure, but need to await actions
      // So we read from ref? Simpler: use gameState from closure and next tick will be fresh
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
          // schedule next tick after speed ms (or longer if LLM was used)
          const hasLLM = actions.some(a => a.agentId === 'a6');
          const delay = hasLLM && useLLM ? Math.max(speed, 500) : speed;
          playRef.current = setTimeout(loop, delay);
        }
        return next;
      });

      // If not over and no LLM delay already scheduled inside setGameState, schedule
      // The above schedules inside setGameState closure - but to be safe, if not over, ensure loop continues
      // We handle scheduling inside setGameState now, but also have fallback:
      setTimeout(() => {
        if (!isPlaying) return;
        // check if playRef already set - if not, schedule
        // This logic is handled above
      }, 0);
    };

    // Start loop with timeout to allow UI to update
    const hasLLMNow = gameState.agents.some(a => a.alive && a.id === 'a6') && useLLM;
    const initialDelay = isLLMThinking ? 100 : speed;
    playRef.current = setTimeout(loop, hasLLMNow ? 100 : initialDelay);

    return () => {
      if (playRef.current) {
        clearTimeout(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, speed, gameState, getActions, useLLM, isLLMThinking]);

  // Alternative simpler interval for non-LLM mode: if useLLM false, use interval for speed
  useEffect(() => {
    if (useLLM) return; // LLM mode uses async loop above
    if (!isPlaying) return;

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
  }, [isPlaying, speed, useLLM, getStrategyMap]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        playPause();
      } else if (e.key === "n" || e.key === "N") {
        if (!isPlaying) step();
      } else if (e.key === "r" || e.key === "R") {
        reset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playPause, step, reset, isPlaying]);

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

        if (completed < total) {
          setTimeout(runChunk, 0);
        } else {
          resolve();
        }
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

  const runBatchAndSetLeaderboard = runBatch;

  useEffect(() => {
    if (!gameState) {
      initGame();
    }
  }, []); // only on mount

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
    runBatchAndSetLeaderboard,
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
  };
}

export default useGame;
