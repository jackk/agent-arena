"use client";

type Props = {
  isPlaying: boolean;
  isOver: boolean;
  turn: number;
  maxTurns: number;
  batchSize: number;
  setBatchSize: (n: number) => void;
  speed: number;
  setSpeed: (n: number) => void;
  onStep: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onRunBatch: () => void;
  isBatchRunning?: boolean;

  // aliases for task spec compatibility
  onRunSingle?: () => void;
  onRunBatchAlias?: () => void;
  isRunning?: boolean;
};

export default function GameControls({
  isPlaying,
  isOver,
  turn,
  maxTurns,
  batchSize,
  setBatchSize,
  speed,
  setSpeed,
  onStep,
  onPlayPause,
  onReset,
  onRunBatch,
  isBatchRunning = false,
  isRunning,
  onRunSingle,
}: Props) {
  const playing = isPlaying ?? isRunning ?? false;
  const progress = maxTurns > 0 ? (turn / maxTurns) * 100 : 0;

  const handlePlayPause = onPlayPause ?? onRunSingle;

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* progress bar */}
      <div className="relative h-1.5 w-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="absolute inset-y-0 left-0 bg-zinc-900 dark:bg-white transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-60 mix-blend-overlay transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-4">
        {/* top row turn info + main actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Turn</span>
            <span className="text-xl font-bold tabular-nums tracking-tight font-mono">
              {turn}
              <span className="text-zinc-400 font-normal text-base"> / {maxTurns}</span>
            </span>
            {isOver && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black">OVER</span>}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onStep}
              disabled={isOver || playing}
              className="h-9 px-3 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
              title="Next turn (step)"
            >
              <span>⏭️</span> <span className="hidden sm:inline">Step</span>
            </button>

            <button
              onClick={handlePlayPause}
              disabled={isOver}
              className={`
                h-9 px-4 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all
                ${playing
                  ? "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md hover:scale-[1.02] hover:shadow-lg"
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <span>{playing ? "⏸️" : "▶️"}</span>
              <span>{playing ? "Pause" : isOver ? "Done" : "Play"}</span>
            </button>

            <button
              onClick={onReset}
              className="h-9 w-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center transition"
              title="Reset game"
            >
              🔄
            </button>
          </div>
        </div>

        {/* speed control */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-widest font-medium text-zinc-500 dark:text-zinc-400">Speed</label>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">{speed}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-zinc-900 dark:accent-white h-1"
              />
              <div className="flex gap-1">
                {[50, 120, 300].map(v => (
                  <button
                    key={v}
                    onClick={() => setSpeed(v)}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border transition ${speed === v ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white" : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-widest font-medium text-zinc-500 dark:text-zinc-400">Batch Size</label>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">{batchSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full accent-zinc-900 dark:accent-white"
              />
              <button
                onClick={onRunBatch}
                disabled={isBatchRunning}
                className="h-8 px-3 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap disabled:opacity-50 transition shadow-sm"
              >
                {isBatchRunning ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    ⚡ Run {batchSize}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* keyboard hints */}
        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
          <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">Space</kbd> play/pause</span>
          <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">N</kbd> step</span>
          <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">R</kbd> reset</span>
        </div>
      </div>
    </div>
  );
}

export { GameControls };
