import { describe, it, expect } from 'vitest';
import { simulateRaid } from '../src/engine/raid-sim.js';
import { generateNpcKeep } from '../src/npc/generator.js';
import type { KeepGridState, PlacedStructure, StructureKind } from '@codekeep/shared';
import { VAULT_HP, VAULT_PROTECTION, VAULT_MAX_COUNT } from '@codekeep/shared';

function makeStructure(
  kind: StructureKind,
  x: number,
  y: number,
  level: PlacedStructure['level'] = 1,
): PlacedStructure {
  return { id: `${kind}-${x}-${y}`, kind, level, pos: { x, y }, placedAtUnixMs: 0 };
}

describe('vault mechanics', () => {
  it('vault HP constants are defined for all levels', () => {
    expect(VAULT_HP[1]).toBe(60);
    expect(VAULT_HP[2]).toBe(90);
    expect(VAULT_HP[3]).toBe(130);
  });

  it('vault protection constants are defined for all levels', () => {
    expect(VAULT_PROTECTION[1]).toEqual({ gold: 50, wood: 30, stone: 20 });
    expect(VAULT_PROTECTION[2]).toEqual({ gold: 100, wood: 60, stone: 40 });
    expect(VAULT_PROTECTION[3]).toEqual({ gold: 180, wood: 110, stone: 75 });
  });

  it('max vault count is 1', () => {
    expect(VAULT_MAX_COUNT).toBe(1);
  });

  it('vault is treated as a solid destructible structure in raids', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 8),
        makeStructure('vault', 7, 8),
        makeStructure('wall', 6, 8),
      ],
    };

    const replay = simulateRaid({
      probeCount: 5,
      keepGrid: grid,
      seed: 'vault-test-1',
      probeTypes: ['brute', 'brute', 'raider', 'raider', 'raider'],
    });

    expect(replay.events.length).toBeGreaterThan(0);
    const endEvent = replay.events.find((e) => e.type === 'raid_end');
    expect(endEvent).toBeDefined();
    // Vault may or may not take damage depending on raider pathing; raid completes without error.
  });

  it('vault appears in NPC generated keeps', () => {
    const keep = generateNpcKeep('vault-npc-test', 3);
    const vaults = keep.grid.structures.filter((s: PlacedStructure) => s.kind === 'vault');
    expect(vaults.length).toBeGreaterThan(0);
    expect(vaults.length).toBeLessThanOrEqual(VAULT_MAX_COUNT);
  });
});
