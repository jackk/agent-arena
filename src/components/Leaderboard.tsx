"use client";

export type LeaderboardEntry = {
  agentId: string;
  name: string;
  color: string;
  emoji: string;
  wins: number;
  winRate: number;
  avgScore: number;
  avgKills: number;
  totalKills: number;
  totalScore: number;
  gamesPlayed: number;
};

type Props = {
  entries: LeaderboardEntry[];
  isRunning?: boolean;
  totalGames?: number;
};

export default function Leaderboard({ entries, isRunning = false, totalGames }: Props) {
  const sorted = [...entries].sort((a, b) => b.wins - a.wins || b.avgScore - a.avgScore);
  const maxWins = Math.max(1, ...entries.map(e => e.wins));
  const maxAvgScore = Math.max(1, ...entries.map(e => e.avgScore));
  const maxAvgKills = Math.max(1, ...entries.map(e => e.avgKills));

  if (entries.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg">🏆</div>
        <div>
          <h4 className="text-sm font-semibold">No batch results yet</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            Run a batch simulation to see win rates and performance across many games.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <span className="text-base">🏆</span> Leaderboard
          {totalGames !== undefined && (
            <span className="text-xs font-normal text-zinc-500">• {totalGames} games</span>
          )}
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
              <span className="w-3 h-3 border-2 border-violet-500/30 border-t-violet-600 rounded-full animate-spin" />
              running
            </span>
          )}
        </h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">sorted by wins</span>
      </div>

      {/* Desktop table header - hidden on mobile */}
      <div className="hidden sm:grid grid-cols-[auto_1fr_80px_90px_70px] gap-2 px-4 py-2 text-[11px] uppercase tracking-widest font-medium text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <span>#</span>
        <span>Agent</span>
        <span className="text-right">Win Rate</span>
        <span className="text-right">Avg Score</span>
        <span className="text-right">Avg Kills</span>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sorted.map((e, idx) => {
          const rank = idx + 1;
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

          return (
            <div key={e.agentId} className="group relative px-4 py-3 sm:py-2.5 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition">
              {/* bar background for wins */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-zinc-100 to-transparent dark:from-zinc-800/50 opacity-60 transition-all"
                style={{ width: `${(e.wins / maxWins) * 100}%` }}
              />

              <div className="relative flex sm:grid sm:grid-cols-[auto_1fr_80px_90px_70px] gap-3 items-center">
                <div className="flex items-center gap-2 w-12 sm:w-auto shrink-0">
                  <span className="text-xs font-mono text-zinc-400 w-4 text-center">{rank}</span>
                  <span className="text-sm">{medal ?? <span className="text-[10px] opacity-0 group-hover:opacity-30">—</span>}</span>
                </div>

                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm border shadow-sm shrink-0"
                    style={{ backgroundColor: `${e.color}18`, borderColor: `${e.color}30` }}
                  >
                    {e.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tracking-tight truncate">{e.name}</span>
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 flex gap-2">
                      <span>{e.wins}W</span>
                      <span className="opacity-60">/</span>
                      <span>{e.gamesPlayed} games</span>
                      <span className="sm:hidden">• {e.winRate.toFixed(1)}% win</span>
                    </div>
                  </div>
                </div>

                {/* stats */}
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="text-sm font-mono font-semibold tabular-nums">{e.winRate.toFixed(1)}%</div>
                  <div className="w-[60px] h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${e.winRate}%`, backgroundColor: e.color }}
                    />
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="text-sm font-mono tabular-nums">{e.avgScore.toFixed(1)}</div>
                  <div className="w-[60px] h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-white rounded-full"
                      style={{ width: `${(e.avgScore / maxAvgScore) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="text-sm font-mono tabular-nums flex items-center gap-1">
                    <span>⚔️</span> {e.avgKills.toFixed(2)}
                  </div>
                  <div className="w-[40px] h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(e.avgKills / maxAvgKills) * 100}%` }}
                    />
                  </div>
                </div>

                {/* mobile compact bars */}
                <div className="sm:hidden ml-auto flex flex-col gap-1 items-end">
                  <div className="flex gap-2 text-[11px] font-mono">
                    <span className="font-semibold">{e.winRate.toFixed(0)}%</span>
                    <span className="text-zinc-400">|</span>
                    <span>{e.avgScore.toFixed(0)} score</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-14 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${e.winRate}%`, backgroundColor: e.color }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* detailed small row below on mobile */}
              <div className="sm:hidden mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-400">Wins</div>
                  <div className="font-mono font-semibold">{e.wins}</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-400">Avg Score</div>
                  <div className="font-mono font-semibold">{e.avgScore.toFixed(1)}</div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-400">Kills</div>
                  <div className="font-mono font-semibold">{e.avgKills.toFixed(2)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 bg-zinc-50/60 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex justify-between">
        <span>Based on {totalGames ?? entries[0]?.gamesPlayed ?? 0} simulations </span>
        <span className="font-mono hidden sm:inline">winRate = wins/games • avg over all</span>
      </div>
    </div>
  );
}

export { Leaderboard };
