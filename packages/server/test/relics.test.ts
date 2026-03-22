import { describe, it, expect } from 'vitest';
import { RELIC_DEFS, getRelicDef, pickRelicReward } from '../src/engine/relics.js';
import { mulberry32 } from '../src/engine/rng.js';

describe('relics', () => {
  it('has 15 relics', () => {
    expect(RELIC_DEFS.length).toBe(15);
  });

  it('relic IDs are unique', () => {
    const ids = RELIC_DEFS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getRelicDef returns correct relic', () => {
    const relic = getRelicDef('iron_crown');
    expect(relic).toBeDefined();
    expect(relic!.name).toBe('Iron Crown');
  });

  it('picks a relic not already owned', () => {
    const rng = mulberry32(42);
    const relic = pickRelicReward(rng, []);
    expect(relic).not.toBeNull();
    expect(relic!.id).toBeTruthy();
  });

  it('returns null when all relics owned', () => {
    const rng = mulberry32(42);
    const allIds = RELIC_DEFS.map((r) => r.id);
    expect(pickRelicReward(rng, allIds)).toBeNull();
  });

  it('does not pick an owned relic', () => {
    const rng = mulberry32(42);
    const relic = pickRelicReward(rng, ['iron_crown']);
    if (relic) {
      expect(relic.id).not.toBe('iron_crown');
    }
  });
});
