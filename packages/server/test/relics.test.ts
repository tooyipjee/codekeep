import { describe, it, expect } from 'vitest';
import { RELIC_DEFS, getRelicDef, pickRelicReward } from '../src/engine/relics.js';
import { mulberry32 } from '../src/engine/rng.js';

describe('relics', () => {
  it('has 20 relics', () => {
    expect(RELIC_DEFS.length).toBe(20);
  });

  it('relic IDs are unique', () => {
    const ids = RELIC_DEFS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every relic has trigger and effect', () => {
    for (const relic of RELIC_DEFS) {
      expect(relic.trigger).toBeTruthy();
      expect(relic.effect).toBeDefined();
      expect(relic.effect.type).toBeTruthy();
    }
  });

  it('getRelicDef returns correct relic', () => {
    const relic = getRelicDef('wardens_signet');
    expect(relic).toBeDefined();
    expect(relic!.name).toBe("Warden's Signet");
  });

  it('picks relics not already owned', () => {
    const rng = mulberry32(42);
    const relics = pickRelicReward(rng, []);
    expect(relics.length).toBeGreaterThan(0);
    expect(relics[0].id).toBeTruthy();
  });

  it('returns empty array when all relics owned', () => {
    const rng = mulberry32(42);
    const allIds = RELIC_DEFS.map((r) => r.id);
    expect(pickRelicReward(rng, allIds)).toEqual([]);
  });

  it('does not pick an owned relic', () => {
    const rng = mulberry32(42);
    const relics = pickRelicReward(rng, ['wardens_signet']);
    for (const relic of relics) {
      expect(relic.id).not.toBe('wardens_signet');
    }
  });

  it('respects count parameter', () => {
    const rng = mulberry32(42);
    const relics = pickRelicReward(rng, [], 1);
    expect(relics.length).toBe(1);
  });
});
