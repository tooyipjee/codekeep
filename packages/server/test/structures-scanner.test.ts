import { describe, it, expect } from 'vitest';
import {
  getScannerDamage,
  getScannerRange,
  getScannerCooldown,
  getAdjacentCoords,
  chebyshevDistance,
  manhattanDistance,
} from '../src/engine/structures.js';
import {
  SCANNER_DAMAGE,
  SCANNER_RANGE,
  SCANNER_COOLDOWN_TICKS,
} from '@codekeep/shared';

describe('structures — scanner helpers', () => {
  it('getScannerDamage_returns_correct_values_per_level', () => {
    expect(getScannerDamage(1)).toBe(SCANNER_DAMAGE[1]);
    expect(getScannerDamage(2)).toBe(SCANNER_DAMAGE[2]);
    expect(getScannerDamage(3)).toBe(SCANNER_DAMAGE[3]);
  });

  it('getScannerRange_returns_correct_values_per_level', () => {
    expect(getScannerRange(1)).toBe(SCANNER_RANGE[1]);
    expect(getScannerRange(2)).toBe(SCANNER_RANGE[2]);
    expect(getScannerRange(3)).toBe(SCANNER_RANGE[3]);
  });

  it('getScannerCooldown_returns_correct_values_per_level', () => {
    expect(getScannerCooldown(1)).toBe(SCANNER_COOLDOWN_TICKS[1]);
    expect(getScannerCooldown(2)).toBe(SCANNER_COOLDOWN_TICKS[2]);
    expect(getScannerCooldown(3)).toBe(SCANNER_COOLDOWN_TICKS[3]);
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
