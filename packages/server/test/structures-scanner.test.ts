import { describe, it, expect } from 'vitest';
import {
  getArcherDamage,
  getArcherRange,
  getArcherCooldown,
  getAdjacentCoords,
  chebyshevDistance,
  manhattanDistance,
} from '../src/engine/structures.js';
import {
  ARCHER_DAMAGE,
  ARCHER_RANGE,
  ARCHER_COOLDOWN_TICKS,
} from '@codekeep/shared';

describe('structures — archer helpers', () => {
  it('getArcherDamage_returns_correct_values_per_level', () => {
    expect(getArcherDamage(1)).toBe(ARCHER_DAMAGE[1]);
    expect(getArcherDamage(2)).toBe(ARCHER_DAMAGE[2]);
    expect(getArcherDamage(3)).toBe(ARCHER_DAMAGE[3]);
  });

  it('getArcherRange_returns_correct_values_per_level', () => {
    expect(getArcherRange(1)).toBe(ARCHER_RANGE[1]);
    expect(getArcherRange(2)).toBe(ARCHER_RANGE[2]);
    expect(getArcherRange(3)).toBe(ARCHER_RANGE[3]);
  });

  it('getArcherCooldown_returns_correct_values_per_level', () => {
    expect(getArcherCooldown(1)).toBe(ARCHER_COOLDOWN_TICKS[1]);
    expect(getArcherCooldown(2)).toBe(ARCHER_COOLDOWN_TICKS[2]);
    expect(getArcherCooldown(3)).toBe(ARCHER_COOLDOWN_TICKS[3]);
  });
});

describe('structures — distance helpers', () => {
  it('getAdjacentCoords_returns_4_neighbors', () => {
    const adj = getAdjacentCoords({ x: 5, y: 5 });
    expect(adj).toHaveLength(4);
    expect(adj).toContainEqual({ x: 4, y: 5 });
    expect(adj).toContainEqual({ x: 6, y: 5 });
    expect(adj).toContainEqual({ x: 5, y: 4 });
    expect(adj).toContainEqual({ x: 5, y: 6 });
  });

  it('chebyshevDistance_computes_max_of_deltas', () => {
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(4);
    expect(chebyshevDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(3);
  });

  it('manhattanDistance_computes_sum_of_deltas', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    expect(manhattanDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(4);
  });
});
