"use client";
import { useEffect, useState } from "react";

type LLMConfig = {
  apiKey: string;
  model: string;
  reasoningEffort: 'low' | 'medium' | 'high';
  customSystemPrompt: string;
};

const MODELS = [
  { id: 'muse-spark-1.1', label: 'Muse Spark 1.1 (stable)' },
  { id: 'muse-spark-20260615', label: 'Muse Spark 20260615 (latest)' },
  { id: 'muse-spark-dogfood', label: 'Muse Spark Dogfood (experimental)' },
  { id: 'tbh-dogfood', label: 'TBH Dogfood' },
];

export default function ApiKeyPanel() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<LLMConfig>({
    apiKey: '',
    model: 'muse-spark-1.1',
    reasoningEffort: 'high',
    customSystemPrompt: '',
  });
  const [config2, setConfig2] = useState<LLMConfig>({
    apiKey: '',
    model: 'muse-spark-20260615',
    reasoningEffort: 'high',
    customSystemPrompt: 'You are aggressive, hunt weak enemies.',
  });
  const [status, setStatus] = useState<'idle'|'testing'|'ok'|'error'>('idle');
  const [showKey, setShowKey] = useState(false);
  const [showKey2, setShowKey2] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('agent-arena-llm-config');
    if (raw) {
      try { setConfig(JSON.parse(raw)); } catch {}
    } else {
      const legacy = localStorage.getItem('agent-arena-api-key');
      if (legacy) setConfig(c => ({ ...c, apiKey: legacy }));
    }
    const raw2 = localStorage.getItem('agent-arena-agent-a6');
    if (raw2) {
      try { setConfig2(JSON.parse(raw2)); } catch {}
    }
  }, []);

  const save = () => {
    localStorage.setItem('agent-arena-llm-config', JSON.stringify(config));
    localStorage.setItem('agent-arena-api-key', config.apiKey);
    localStorage.setItem('agent-arena-agent-a6', JSON.stringify(config));
    // For versus, also save second agent if present
    if (config2.apiKey) {
      localStorage.setItem('agent-arena-agent-a4', JSON.stringify(config2));
    }
    setStatus('ok');
    setTimeout(() => setStatus('idle'), 2000);
  };

  const testKey = async (cfg: LLMConfig) => {
    setStatus('testing');
    try {
      const res = await fetch('/api/llm-decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turn: 1,
          width: 12,
          height: 12,
          self: { id: 'test', pos: { x: 5, y: 5 }, health: 100, score: 0 },
          resources: [{ pos: { x: 7, y: 7 }, value: 10, type: 'coin', dist: 4 }],
          enemies: [{ id: 'e1', name: 'Enemy', pos: { x: 5, y: 6 }, health: 80, score: 0, dist: 1 }],
          apiKey: cfg.apiKey,
          model: cfg.model,
          reasoningEffort: cfg.reasoningEffort,
        }),
      });
      const data = await res.json();
      if (data.direction) {
        setStatus('ok');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-4 z-50 h-10 px-4 rounded-full bg-black text-white dark:bg-white dark:text-black border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] text-xs font-bold tracking-widest hover:shadow-[0_0_30px_rgba(6,182,212,0.9)] transition-all"
      >
        {open ? '✕ CLOSE' : '🔑 API KEYS'}
      </button>

      <div className={`fixed inset-0 z-40 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/80 backdrop-blur-md transition ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />

        <div className={`absolute right-0 top-0 h-full w-full max-w-[420px] bg-zinc-950 border-l-2 border-cyan-400/50 shadow-[-20px_0_60px_rgba(0,0,0,0.9),0_0_40px_rgba(6,182,212,0.3)] transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
          <div className="p-6 flex flex-col gap-6">
            {/* Header */}
            <div>
              <h2 className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
                <span className="text-cyan-400">◆</span> BYOK • LLM CONFIG
              </h2>
              <p className="text-[11px] font-mono text-zinc-400 mt-1 leading-relaxed">
                Bring your own Meta API key to play LLM vs LLM. Keys stored locally in browser only (localStorage), never sent to our servers except to api.meta.ai via our proxy.
              </p>
            </div>

            {/* Player 1 */}
            <div className="rounded-xl border border-fuchsia-500/30 bg-zinc-900/80 p-4 shadow-[0_0_20px_rgba(232,121,249,0.1)]">
              <h3 className="text-xs font-bold tracking-widest text-fuchsia-300 mb-3">PLAYER 1 • MuseSpark (a6) ✨</h3>

              <label className="text-[10px] font-mono text-zinc-400 tracking-widest">API KEY</label>
              <div className="mt-1 flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="LLM|..."
                  className="flex-1 h-9 px-3 rounded-lg bg-black border border-zinc-700 text-xs font-mono text-white placeholder-zinc-600 focus:border-cyan-400 focus:outline-none"
                />
                <button onClick={() => setShowKey(!showKey)} className="h-9 w-9 rounded-lg bg-zinc-800 border border-zinc-700 text-xs">
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>

              <label className="mt-3 block text-[10px] font-mono text-zinc-400 tracking-widest">MODEL</label>
              <select
                value={config.model}
                onChange={e => setConfig({ ...config, model: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-black border border-zinc-700 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>

              <label className="mt-3 block text-[10px] font-mono text-zinc-400 tracking-widest">REASONING EFFORT</label>
              <div className="mt-1 flex gap-1">
                {(['low','medium','high'] as const).map(eff => (
                  <button
                    key={eff}
                    onClick={() => setConfig({ ...config, reasoningEffort: eff })}
                    className={`flex-1 h-8 rounded-full text-[11px] font-bold tracking-widest border transition ${config.reasoningEffort === eff ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}
                  >
                    {eff.toUpperCase()}
                  </button>
                ))}
              </div>

              <label className="mt-3 block text-[10px] font-mono text-zinc-400 tracking-widest">CUSTOM SYSTEM PROMPT (optional)</label>
              <textarea
                value={config.customSystemPrompt}
                onChange={e => setConfig({ ...config, customSystemPrompt: e.target.value })}
                placeholder="e.g. You are hyper-aggressive, always chase weakest enemy..."
                className="mt-1 w-full h-20 p-2 rounded-lg bg-black border border-zinc-700 text-[11px] font-mono text-white placeholder-zinc-600 focus:border-cyan-400 focus:outline-none resize-none"
              />

              <div className="mt-3 flex gap-2">
                <button onClick={() => testKey(config)} className="flex-1 h-9 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold tracking-widest hover:bg-zinc-700 transition">
                  {status === 'testing' ? '⏳ TESTING...' : '🧪 TEST KEY'}
                </button>
                <button onClick={save} className="flex-1 h-9 rounded-full bg-white text-black text-xs font-black tracking-widest hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  💾 SAVE
                </button>
              </div>

              {status === 'ok' && <div className="mt-2 text-[11px] font-mono text-emerald-400">✓ Key valid, LLM responded!</div>}
              {status === 'error' && <div className="mt-2 text-[11px] font-mono text-red-400">✗ Key failed — check format LLM|...</div>}
            </div>

            {/* Player 2 for LLM vs LLM */}
            <div className="rounded-xl border border-cyan-400/30 bg-zinc-900/80 p-4 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <h3 className="text-xs font-bold tracking-widest text-cyan-300 mb-3">PLAYER 2 • Strategist (a4) vs LLM BATTLE</h3>
              <p className="text-[10px] font-mono text-zinc-500 mb-2">Configure second LLM to battle first LLM. Leave empty to use heuristic StrategistSam.</p>

              <label className="text-[10px] font-mono text-zinc-400 tracking-widest">API KEY 2 (optional)</label>
              <div className="mt-1 flex gap-2">
                <input
                  type={showKey2 ? 'text' : 'password'}
                  value={config2.apiKey}
                  onChange={e => setConfig2({ ...config2, apiKey: e.target.value })}
                  placeholder="LLM|... (or empty = heuristic)"
                  className="flex-1 h-9 px-3 rounded-lg bg-black border border-zinc-700 text-xs font-mono text-white placeholder-zinc-600 focus:border-cyan-400 focus:outline-none"
                />
                <button onClick={() => setShowKey2(!showKey2)} className="h-9 w-9 rounded-lg bg-zinc-800 border border-zinc-700 text-xs">
                  {showKey2 ? '🙈' : '👁️'}
                </button>
              </div>

              <label className="mt-3 block text-[10px] font-mono text-zinc-400 tracking-widest">MODEL 2</label>
              <select
                value={config2.model}
                onChange={e => setConfig2({ ...config2, model: e.target.value })}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-black border border-zinc-700 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>

              <label className="mt-3 block text-[10px] font-mono text-zinc-400 tracking-widest">CUSTOM PROMPT 2</label>
              <textarea
                value={config2.customSystemPrompt}
                onChange={e => setConfig2({ ...config2, customSystemPrompt: e.target.value })}
                placeholder="e.g. You are defensive, avoid combat, farm..."
                className="mt-1 w-full h-20 p-2 rounded-lg bg-black border border-zinc-700 text-[11px] font-mono text-white placeholder-zinc-600 focus:border-cyan-400 focus:outline-none resize-none"
              />

              <div className="mt-3 flex gap-2">
                <button onClick={() => testKey(config2)} className="flex-1 h-9 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold tracking-widest hover:bg-zinc-700 transition">
                  🧪 TEST P2
                </button>
                <button onClick={() => {
                  localStorage.setItem('agent-arena-agent-a4', JSON.stringify(config2));
                  setStatus('ok');
                  setTimeout(()=>setStatus('idle'),2000);
                }} className="flex-1 h-9 rounded-full bg-cyan-400 text-black text-xs font-black tracking-widest hover:bg-cyan-300 transition">
                  💾 SAVE P2
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-black border border-zinc-800 p-3">
              <h4 className="text-[11px] font-bold tracking-widest text-zinc-300">HOW MODEL VS MODEL WORKS</h4>
              <ul className="mt-2 text-[10px] font-mono text-zinc-500 leading-relaxed list-disc pl-4 space-y-1">
                <li>Each LLM agent calls <code className="text-cyan-400">/api/llm-decide</code> with its own API key + model + prompt</li>
                <li>Server proxies to <code className="text-fuchsia-400">api.meta.ai/v1/chat/completions</code></li>
                <li>First LLM to get checkmated by collision/combat loses</li>
                <li>Try high vs low reasoning, or aggressive vs defensive prompts</li>
                <li>Keys stored in localStorage only — clear browser to delete</li>
              </ul>
            </div>

            <div className="h-20" />
          </div>
        </div>
      </div>
    </>
  );
}
