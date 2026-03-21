import { describe, it, expect } from 'vitest';
import {
  generateNpcKeep,
  NPC_DIFFICULTIES,
} from '../src/npc/generator.js';
import { GRID_SIZE } from '@codekeep/shared';

describe('npc-generator', () => {
  it('generateNpcKeep_produces_valid_keep_with_structures', () => {
    const keep = generateNpcKeep('seed-abc', 1);

    expect(keep.id).toBe('npc-seed-abc-1');
    expect(keep.ownerPlayerId).toBe('npc');
    expect(keep.grid.width).toBe(16);
    expect(keep.grid.height).toBe(16);
    expect(keep.grid.structures.length).toBeGreaterThan(0);

    for (const s of keep.grid.structures) {
      expect(s.pos.x).toBeGreaterThanOrEqual(0);
      expect(s.pos.x).toBeLessThan(GRID_SIZE);
      expect(s.pos.y).toBeGreaterThanOrEqual(0);
      expect(s.pos.y).toBeLessThan(GRID_SIZE);
      expect(s.level).toBeGreaterThanOrEqual(1);
      expect(s.level).toBeLessThanOrEqual(NPC_DIFFICULTIES[0].maxUpgradeLevel);
    }

    const positions = keep.grid.structures.map((s) => `${s.pos.x},${s.pos.y}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('generateNpcKeep_deterministic_for_same_seed', () => {
    const keep1 = generateNpcKeep('deterministic', 3);
    const keep2 = generateNpcKeep('deterministic', 3);

    expect(keep1.grid.structures.length).toBe(keep2.grid.structures.length);

    for (let i = 0; i < keep1.grid.structures.length; i++) {
      expect(keep1.grid.structures[i].kind).toBe(keep2.grid.structures[i].kind);
      expect(keep1.grid.structures[i].pos).toEqual(keep2.grid.structures[i].pos);
      expect(keep1.grid.structures[i].level).toBe(keep2.grid.structures[i].level);
    }
  });

  it('generateNpcKeep_difficulty_scales_structure_count', () => {
    const keepLow = generateNpcKeep('scale-test', 1);
    const keepHigh = generateNpcKeep('scale-test', 5);

    expect(keepHigh.grid.structures.length).toBeGreaterThan(
      keepLow.grid.structures.length,
    );
  });
});
