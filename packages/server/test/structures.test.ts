import { describe, it, expect } from 'vitest';
import { getEffectiveMitigation } from '../src/engine/structures.js';
import { ENCRYPTION_MITIGATION, RELAY_RANGE } from '@codekeep/shared';
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
  it('getEffectiveMitigation_adjacent_encryption_buffs_vault', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 5, 5),
        makeStructure('encryptionNode', 5, 4, 1),
      ],
    };

    const mitigation = getEffectiveMitigation(grid, { x: 5, y: 5 });
    expect(mitigation).toBe(ENCRYPTION_MITIGATION[1]);
  });

  it('getEffectiveMitigation_relay_extends_range', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8),
        makeStructure('encryptionNode', 5, 5, 2),
        makeStructure('relayTower', 5, 6, 2),
      ],
    };

    const relayRange = RELAY_RANGE[2];
    const effectiveRange = 1 + relayRange;

    const mitigation = getEffectiveMitigation(grid, { x: 8, y: 8 });

    const dist = Math.max(Math.abs(5 - 8), Math.abs(5 - 8));
    if (dist <= effectiveRange) {
      expect(mitigation).toBe(ENCRYPTION_MITIGATION[2]);
    } else {
      expect(mitigation).toBe(0);
    }
  });

  it('getEffectiveMitigation_no_encryption_returns_zero', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 5, 5),
        makeStructure('firewall', 5, 4),
        makeStructure('relayTower', 6, 5, 3),
      ],
    };

    const mitigation = getEffectiveMitigation(grid, { x: 5, y: 5 });
    expect(mitigation).toBe(0);
  });
});
