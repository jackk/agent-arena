"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GameEngine, DEFAULT_CONFIG, AGENT_PRESETS } from "./engine";
import { GameState, Direction, AgentConfig } from "./types";
import { LeaderboardEntry } from "@/components/Leaderboard";
import { ALL_STRATEGIES } from "../agents/strategies";

type BatchProgress = {
  completed: number;
  total: number;
};

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(120); // ms per turn
  const [batchSize, setBatchSize] = useState(100);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);

  const engineRef = useRef<GameEngine | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build strategy map
  const getStrategyMap = useCallback(() => {
    const map = new Map<string, (s: GameState, id: string) => Direction>();
    for (const strat of ALL_STRATEGIES) {
      map.set(strat.id, strat.decide);
    }
    // fallback for any missing preset -> random
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
    const presets = customPresets ?? AGENT_PRESETS;
    const initial = engine.createInitialState(presets, DEFAULT_CONFIG);
    setGameState(initial);
    setHistoryIndex(0);
    setIsPlaying(false);
    setSelectedAgentId(undefined);
    if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
    return initial;
  }, []);

  const step = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      if (prev.isOver) return prev;
      const engine = engineRef.current;
      if (!engine) return prev;
      const stratMap = getStrategyMap();
      const actions = prev.agents.filter(a=>a.alive).map(a=>{
        const fn = stratMap.get(a.id);
        let dir: Direction = 'stay';
        try {
          dir = fn ? fn(prev, a.id) : 'stay';
        } catch {
          dir = 'stay';
        }
        return { agentId: a.id, dir };
      });
      const next = engine.applyTurn(prev, actions);
      return next;
    });
  }, [getStrategyMap]);

  const play = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
  }, [isPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (playRef.current) {
      clearInterval(playRef.current);
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

  // Interval handling for auto-play
  useEffect(() => {
    if (isPlaying) {
      if (playRef.current) clearInterval(playRef.current);
      playRef.current = setInterval(() => {
        setGameState(prev => {
          if (!prev) return prev;
          if (prev.isOver) {
            setIsPlaying(false);
            if (playRef.current) {
              clearInterval(playRef.current);
              playRef.current = null;
            }
            return prev;
          }
          const engine = engineRef.current;
          if (!engine) return prev;
          const stratMap = getStrategyMap();
          const actions = prev.agents.filter(a=>a.alive).map(a=>{
            const fn = stratMap.get(a.id);
            let dir: Direction = 'stay';
            try { dir = fn ? fn(prev, a.id) : 'stay'; } catch { dir = 'stay'; }
            return { agentId: a.id, dir };
          });
          const next = engine.applyTurn(prev, actions);
          if (next.isOver) {
            setIsPlaying(false);
            if (playRef.current) {
              clearInterval(playRef.current);
              playRef.current = null;
            }
          }
          return next;
        });
      }, speed);
    } else {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    }
    return () => {
      if (playRef.current) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [isPlaying, speed, getStrategyMap]);

  // Keyboard shortcuts
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

  // history navigation
  const goToTurn = useCallback((idx: number) => {
    if (!gameState) return;
    const hist = gameState.history;
    if (idx < 0 || idx >= hist.length) return;
    const snap = hist[idx];
    // Reconstruct partial state from snapshot but keep config etc
    const reconstructed: GameState = {
      ...gameState,
      turn: snap.turn,
      agents: snap.agents.map(a=>({ ...a, pos: { ...a.pos } })),
      resources: snap.resources.map(r=>({ ...r, pos: { ...r.pos } })),
      events: snap.events,
      // isOver only if at last history and original isOver? Use snapshot logic: if idx == last => keep original isOver
      isOver: idx === hist.length - 1 ? gameState.isOver : false,
      winnerId: idx === hist.length - 1 ? gameState.winnerId : undefined,
    };
    // We keep history itself inside reconstructed for further navigation (use original history)
    reconstructed.history = gameState.history;
    // We need to set a special viewing mode? For simplicity update gameState to reconstructed but keep history reference
    // However we lose future history if we step from middle - better to keep original history and track index
    setHistoryIndex(idx);
    // Overwrite displayed state without losing original history? We use a separate viewing state logic: we will return derived state
    // For now, just set gameState to reconstructed for replay display
    // To allow resume, store original? Simpler: keep separate viewing
  }, [gameState]);

  // For batch
  const runBatch = useCallback(async (size?: number) => {
    const total = size ?? batchSize;
    setIsBatchRunning(true);
    setBatchProgress({ completed: 0, total });

    // run in chunks to avoid blocking UI
    const stats = new Map<string, { wins: number; totalScore: number; totalKills: number; games: number }>();

    for (const preset of AGENT_PRESETS) {
      stats.set(preset.id, { wins: 0, totalScore: 0, totalKills: 0, games: 0 });
    }

    const stratMap = getStrategyMap();

    // We run async chunk
    await new Promise<void>((resolve) => {
      let completed = 0;
      const chunkSize = 5;

      const runChunk = () => {
        for (let c = 0; c < chunkSize && completed < total; c++) {
          const seed = Math.floor(Math.random() * 1_000_000) + completed;
          const engine = new GameEngine(seed);
          let state = engine.createInitialState(AGENT_PRESETS, DEFAULT_CONFIG);
          state = engine.simulate(state, stratMap);
          completed++;

          // record
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
          // yield
          setTimeout(runChunk, 0);
        } else {
          resolve();
        }
      };

      runChunk();
    });

    const entries: LeaderboardEntry[] = AGENT_PRESETS.map(preset => {
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

  // Also function to run batch and set leaderboard - alias
  const runBatchAndSetLeaderboard = runBatch;

  // Init on mount - intentionally deferred to avoid hydration mismatch
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!gameState) {
      initGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived: if historyIndex is used for replay, we could compute viewing state
  // For now, gameState includes full history; we track historyIndex but display gameState directly unless replay mode
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
          // keep isOver false during replay except last
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
    // aliases for GameControls compatibility
    onRunSingle: playPause,
    onRunBatch: runBatch,
    onReset: reset,
    isRunning: isPlaying,
    goToTurn,
  };
}

export default useGame;
