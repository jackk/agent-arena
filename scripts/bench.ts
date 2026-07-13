import { GameEngine, DEFAULT_CONFIG, AGENT_PRESETS_NO_LLM, AGENT_PRESETS } from '../src/lib/game/engine';
import { ALL_STRATEGIES } from '../src/lib/agents/strategies';
import fs from 'fs';

const strategies = new Map();
for (const s of ALL_STRATEGIES) {
  strategies.set(s.id, s.decide);
}

function runBatch(count: number, includeLLM: boolean) {
  const presets = includeLLM ? AGENT_PRESETS : AGENT_PRESETS_NO_LLM;
  const stats = new Map<string, { wins: number; scores: number[]; kills: number; games: number; survivals: number; turns: number[] }>();

  for (const p of presets) {
    stats.set(p.id, { wins: 0, scores: [], kills: 0, games: 0, survivals: 0, turns: [] });
  }

  const start = Date.now();
  
  for (let i = 0; i < count; i++) {
    const seed = 42 + i; // deterministic
    const engine = new GameEngine(seed);
    let state = engine.createInitialState(presets, DEFAULT_CONFIG);
    state = engine.simulate(state, strategies);

    for (const ag of state.agents) {
      const s = stats.get(ag.id)!;
      s.games++;
      s.scores.push(ag.score);
      s.kills += ag.kills;
      if (ag.alive) s.survivals++;
      if (state.winnerId === ag.id) s.wins++;
      s.turns.push(state.turn);
    }

    if ((i+1) % 100 === 0) {
      console.log(`  ${i+1}/${count} done (${((Date.now()-start)/1000).toFixed(1)}s)`);
    }
  }

  const elapsed = (Date.now() - start) / 1000;

  const results = presets.map(p => {
    const s = stats.get(p.id)!;
    const avgScore = s.scores.reduce((a,b)=>a+b,0)/s.scores.length;
    const avgTurns = s.turns.reduce((a,b)=>a+b,0)/s.turns.length;
    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      wins: s.wins,
      winRate: (s.wins / count) * 100,
      avgScore,
      totalKills: s.kills,
      avgKills: s.kills / count,
      survivalRate: (s.survivals / count) * 100,
      avgTurns,
      games: s.games,
    };
  }).sort((a,b) => b.wins - a.wins || b.avgScore - a.avgScore);

  return { results, elapsed, count };
}

function asciiChart(results: ReturnType<typeof runBatch>['results']) {
  const maxWin = Math.max(...results.map(r=>r.winRate));
  const lines: string[] = [];
  lines.push('');
  lines.push('Leaderboard (1000 games, seed 42..1041, 12x12, 100 turns max, deterministic):');
  lines.push('='.repeat(90));
  lines.push(` ${'#'.padEnd(3)} ${'Agent'.padEnd(18)} ${'Wins'.padEnd(6)} ${'Win%'.padEnd(8)} ${'AvgScore'.padEnd(10)} ${'AvgKills'.padEnd(10)} ${'Surv%'.padEnd(8)} Bar`);
  lines.push('-'.repeat(90));
  results.forEach((r, i) => {
    const barLen = Math.round((r.winRate / maxWin) * 20);
    const bar = '█'.repeat(barLen) + '░'.repeat(20-barLen);
    lines.push(
      ` ${(i+1+'').padEnd(3)} ${(r.emoji+' '+r.name).padEnd(18)} ${String(r.wins).padEnd(6)} ${(r.winRate.toFixed(1)+'%').padEnd(8)} ${r.avgScore.toFixed(1).padEnd(10)} ${r.avgKills.toFixed(2).padEnd(10)} ${(r.survivalRate.toFixed(1)+'%').padEnd(8)} ${bar}`
    );
  });
  lines.push('='.repeat(90));
  return lines.join('\n');
}

function mdTable(results: ReturnType<typeof runBatch>['results']) {
  const header = '| Rank | Agent | Wins | Win% | AvgScore | AvgKills | Survival% |';
  const sep = '|------|-------|------|------|----------|----------|-----------|';
  const rows = results.map((r,i) => `| ${i+1} | ${r.emoji} ${r.name} | ${r.wins} | ${r.winRate.toFixed(1)}% | ${r.avgScore.toFixed(1)} | ${r.avgKills.toFixed(2)} | ${r.survivalRate.toFixed(1)}% |`);
  return [header, sep, ...rows].join('\n');
}

console.log('🚀 Running 1000 simulations for Agent Arena...');
console.log('   Agents:', AGENT_PRESETS_NO_LLM.map(a=>a.name).join(', '));

const batch = runBatch(1000, false);

console.log(asciiChart(batch.results));
console.log(`\nElapsed: ${batch.elapsed.toFixed(2)}s (${(1000/batch.elapsed).toFixed(1)} games/sec)`);

console.log('\n--- Markdown Table ---\n');
console.log(mdTable(batch.results));

console.log('\n--- JSON ---\n');
console.log(JSON.stringify({ results: batch.results, meta: { count: batch.count, elapsed: batch.elapsed, config: DEFAULT_CONFIG, seedBase: 42 } }, null, 2));

// Save reports
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/bench-1000.json', JSON.stringify({ results: batch.results, meta: { count: batch.count, elapsed: batch.elapsed } }, null, 2));
fs.writeFileSync('reports/bench-1000.md', `# Agent Arena - 1000 Simulations\n\nSeed base 42, deterministic mulberry32.\n\nDuration: ${batch.elapsed.toFixed(2)}s\nGames/sec: ${(1000/batch.elapsed).toFixed(1)}\n\n${mdTable(batch.results)}\n\n\`\`\`\n${asciiChart(batch.results)}\n\`\`\`\n`);
fs.writeFileSync('reports/bench-1000-ascii.txt', asciiChart(batch.results));

console.log('\nReports saved to reports/bench-1000.{json,md,txt}');
