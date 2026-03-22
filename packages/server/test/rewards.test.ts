import { describe, it, expect } from 'vitest';
import { generateCardRewards } from '../src/engine/rewards.js';
import { mulberry32 } from '../src/engine/rng.js';

describe('card rewards', () => {
  it('generates 3 cards by default', () => {
    const rng = mulberry32(42);
    const rewards = generateCardRewards(rng);
    expect(rewards.length).toBe(3);
  });

  it('cards are unique', () => {
    const rng = mulberry32(42);
    const rewards = generateCardRewards(rng);
    const ids = rewards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deterministic: same seed produces same rewards', () => {
    const r1 = generateCardRewards(mulberry32(42));
    const r2 = generateCardRewards(mulberry32(42));
    expect(r1.map((c) => c.id)).toEqual(r2.map((c) => c.id));
  });
});
