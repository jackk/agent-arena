// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { GameEngine, DEFAULT_CONFIG } from './engine';
import { ALL_STRATEGIES } from '../agents/strategies';

describe('GameEngine', () => {
  it('creates initial state', () => {
    const engine = new GameEngine(42);
    const state = engine.createInitialState([
      { id: 'a1', name: 'T1', color: '#000', emoji: '🤖' },
      { id: 'a2', name: 'T2', color: '#fff', emoji: '👾' },
    ], DEFAULT_CONFIG);
    expect(state.agents.length).toBe(2);
    expect(state.resources.length).toBeGreaterThan(0);
    expect(state.turn).toBe(0);
  });

  it('simulates game to completion', () => {
    const engine = new GameEngine(123);
    const presets = [
      { id: 'a1', name: 'RandomRandy', color: '#ef4444', emoji: '🎲' },
      { id: 'a2', name: 'GreedyGus', color: '#22c55e', emoji: '💰' },
    ];
    let state = engine.createInitialState(presets, { ...DEFAULT_CONFIG, maxTurns: 20 });
    const map = new Map();
    map.set('a1', ALL_STRATEGIES.find(s => s.id === 'a1')!.decide);
    map.set('a2', ALL_STRATEGIES.find(s => s.id === 'a2')!.decide);
    state = engine.simulate(state, map);
    expect(state.isOver).toBe(true);
    expect(state.turn).toBeGreaterThan(0);
  });
});

describe('Strategies', () => {
  it('all strategies return valid direction', () => {
    const engine = new GameEngine(1);
    const state = engine.createInitialState([
      { id: 'a1', name: 'A1', color: '#000', emoji: '1' },
      { id: 'a2', name: 'A2', color: '#fff', emoji: '2' },
    ], DEFAULT_CONFIG);
    for (const strat of ALL_STRATEGIES) {
      const dir = strat.decide(state, 'a1');
      expect(['up','down','left','right','stay']).toContain(dir);
    }
  });
});
