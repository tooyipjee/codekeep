import { describe, it, expect } from 'vitest';
import { getEffectiveMitigation } from '../src/engine/structures.js';
import { WARD_MITIGATION, WATCHTOWER_RANGE } from '@codekeep/shared';
import type { KeepGridState, PlacedStructure } from '@codekeep/shared';

function makeStructure(
  kind: PlacedStructure['kind'],
  x: number,
  y: number,
  level: PlacedStructure['level'] = 1,
): PlacedStructure {
  return {
    id: `${kind}-${x}-${y}`,
    kind,
    level,
    pos: { x, y },
    placedAtUnixMs: 0,
  };
}

describe('structures — getEffectiveMitigation', () => {
  it('getEffectiveMitigation_adjacent_ward_buffs_treasury', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 5, 5),
        makeStructure('ward', 5, 4, 1),
      ],
    };

    const mitigation = getEffectiveMitigation(grid, { x: 5, y: 5 });
    expect(mitigation).toBe(WARD_MITIGATION[1]);
  });

  it('getEffectiveMitigation_watchtower_extends_range', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 8),
        makeStructure('ward', 5, 5, 2),
        makeStructure('watchtower', 5, 6, 2),
      ],
    };

    const watchtowerRange = WATCHTOWER_RANGE[2];
    const effectiveRange = 1 + watchtowerRange;

    const mitigation = getEffectiveMitigation(grid, { x: 8, y: 8 });

    const dist = Math.max(Math.abs(5 - 8), Math.abs(5 - 8));
    if (dist <= effectiveRange) {
      expect(mitigation).toBe(WARD_MITIGATION[2]);
    } else {
      expect(mitigation).toBe(0);
    }
  });

  it('getEffectiveMitigation_no_ward_returns_zero', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 5, 5),
        makeStructure('wall', 5, 4),
        makeStructure('watchtower', 6, 5, 3),
      ],
    };

    const mitigation = getEffectiveMitigation(grid, { x: 5, y: 5 });
    expect(mitigation).toBe(0);
  });
});
