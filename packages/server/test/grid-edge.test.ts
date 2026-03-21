import { describe, it, expect } from 'vitest';
import {
  createEmptyKeep,
  placeStructure,
  upgradeStructure,
  demolishStructure,
  isInBounds,
  getStructureAt,
  addResources,
  subtractResources,
} from '../src/engine/grid.js';
import { STRUCTURE_COSTS } from '@codekeep/shared';

function freshKeep() {
  return createEmptyKeep('test-player', 'Test Keep');
}

describe('grid — isInBounds', () => {
  it('returns_true_for_valid_positions', () => {
    expect(isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(isInBounds({ x: 15, y: 15 })).toBe(true);
    expect(isInBounds({ x: 8, y: 8 })).toBe(true);
  });

  it('returns_false_for_out_of_bounds', () => {
    expect(isInBounds({ x: -1, y: 0 })).toBe(false);
    expect(isInBounds({ x: 0, y: -1 })).toBe(false);
    expect(isInBounds({ x: 16, y: 0 })).toBe(false);
    expect(isInBounds({ x: 0, y: 16 })).toBe(false);
  });
});

describe('grid — getStructureAt', () => {
  it('returns_structure_at_position', () => {
    let keep = freshKeep();
    keep = placeStructure(keep, { x: 5, y: 5 }, 'firewall').keep!;

    const s = getStructureAt(keep.grid, { x: 5, y: 5 });
    expect(s).toBeDefined();
    expect(s!.kind).toBe('firewall');
  });

  it('returns_undefined_for_empty_cell', () => {
    const keep = freshKeep();
    expect(getStructureAt(keep.grid, { x: 5, y: 5 })).toBeUndefined();
  });
});

describe('grid — resource helpers', () => {
  it('addResources_sums_correctly', () => {
    const result = addResources(
      { compute: 10, memory: 20, bandwidth: 30 },
      { compute: 5, memory: 15, bandwidth: 25 },
    );
    expect(result).toEqual({ compute: 15, memory: 35, bandwidth: 55 });
  });

  it('subtractResources_subtracts_correctly', () => {
    const result = subtractResources(
      { compute: 100, memory: 200, bandwidth: 300 },
      { compute: 30, memory: 50, bandwidth: 70 },
    );
    expect(result).toEqual({ compute: 70, memory: 150, bandwidth: 230 });
  });
});

describe('grid — placement edge cases', () => {
  it('placement_insufficient_resources_shows_shortage_details', () => {
    const keep = freshKeep();
    keep.resources = { compute: 0, memory: 0, bandwidth: 0 };

    const result = placeStructure(keep, { x: 5, y: 5 }, 'firewall');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/more compute|more bandwidth/i);
  });

  it('placement_of_scanner_structure_works', () => {
    const keep = freshKeep();
    const result = placeStructure(keep, { x: 3, y: 3 }, 'scanner');
    expect(result.ok).toBe(true);
    expect(result.keep!.grid.structures[0].kind).toBe('scanner');
  });

  it('upgrade_nonexistent_position_rejected', () => {
    const keep = freshKeep();
    const result = upgradeStructure(keep, { x: 10, y: 10 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no structure/i);
  });

  it('upgrade_insufficient_resources_shows_shortage', () => {
    let keep = freshKeep();
    keep = placeStructure(keep, { x: 5, y: 5 }, 'firewall').keep!;
    keep.resources = { compute: 0, memory: 0, bandwidth: 0 };

    const result = upgradeStructure(keep, { x: 5, y: 5 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/more/i);
  });
});

describe('grid — demolish refund for upgraded structures', () => {
  it('demolish_level2_refunds_50_percent_of_level1_plus_level2_costs', () => {
    let keep = freshKeep();
    keep.resources = { compute: 9999, memory: 9999, bandwidth: 9999 };

    keep = placeStructure(keep, { x: 5, y: 5 }, 'firewall').keep!;
    keep = upgradeStructure(keep, { x: 5, y: 5 }).keep!;

    const beforeDemolish = { ...keep.resources };
    const result = demolishStructure(keep, { x: 5, y: 5 });
    expect(result.ok).toBe(true);

    const level1Cost = STRUCTURE_COSTS.firewall[1];
    const level2Cost = STRUCTURE_COSTS.firewall[2];
    const expectedRefund = {
      compute: Math.floor((level1Cost.compute + level2Cost.compute) * 0.5),
      memory: Math.floor((level1Cost.memory + level2Cost.memory) * 0.5),
      bandwidth: Math.floor((level1Cost.bandwidth + level2Cost.bandwidth) * 0.5),
    };

    expect(result.keep!.resources.compute).toBe(beforeDemolish.compute + expectedRefund.compute);
    expect(result.keep!.resources.memory).toBe(beforeDemolish.memory + expectedRefund.memory);
    expect(result.keep!.resources.bandwidth).toBe(beforeDemolish.bandwidth + expectedRefund.bandwidth);
  });

  it('demolish_level3_refunds_50_percent_of_all_three_level_costs', () => {
    let keep = freshKeep();
    keep.resources = { compute: 9999, memory: 9999, bandwidth: 9999 };

    keep = placeStructure(keep, { x: 3, y: 3 }, 'honeypot').keep!;
    keep = upgradeStructure(keep, { x: 3, y: 3 }).keep!;
    keep = upgradeStructure(keep, { x: 3, y: 3 }).keep!;

    const s = getStructureAt(keep.grid, { x: 3, y: 3 });
    expect(s!.level).toBe(3);

    const beforeDemolish = { ...keep.resources };
    const result = demolishStructure(keep, { x: 3, y: 3 });
    expect(result.ok).toBe(true);

    const l1 = STRUCTURE_COSTS.honeypot[1];
    const l2 = STRUCTURE_COSTS.honeypot[2];
    const l3 = STRUCTURE_COSTS.honeypot[3];
    const expectedRefund = {
      compute: Math.floor((l1.compute + l2.compute + l3.compute) * 0.5),
      memory: Math.floor((l1.memory + l2.memory + l3.memory) * 0.5),
      bandwidth: Math.floor((l1.bandwidth + l2.bandwidth + l3.bandwidth) * 0.5),
    };

    expect(result.keep!.resources.compute).toBe(beforeDemolish.compute + expectedRefund.compute);
    expect(result.keep!.resources.memory).toBe(beforeDemolish.memory + expectedRefund.memory);
    expect(result.keep!.resources.bandwidth).toBe(beforeDemolish.bandwidth + expectedRefund.bandwidth);
  });

  it('demolish_scanner_structure_refunds_correctly', () => {
    let keep = freshKeep();
    keep.resources = { compute: 9999, memory: 9999, bandwidth: 9999 };

    keep = placeStructure(keep, { x: 7, y: 7 }, 'scanner').keep!;

    const beforeDemolish = { ...keep.resources };
    const result = demolishStructure(keep, { x: 7, y: 7 });
    expect(result.ok).toBe(true);

    const cost = STRUCTURE_COSTS.scanner[1];
    expect(result.keep!.resources.compute).toBe(
      beforeDemolish.compute + Math.floor(cost.compute * 0.5),
    );
  });
});

describe('grid — all structure kinds placeable', () => {
  it('can_place_every_structure_kind', () => {
    const kinds = [
      'firewall', 'honeypot', 'dataVault', 'encryptionNode', 'relayTower', 'scanner',
    ] as const;

    let keep = freshKeep();
    keep.resources = { compute: 9999, memory: 9999, bandwidth: 9999 };

    for (let i = 0; i < kinds.length; i++) {
      const result = placeStructure(keep, { x: i, y: 0 }, kinds[i]);
      expect(result.ok, `should be able to place ${kinds[i]}`).toBe(true);
      keep = result.keep!;
    }

    expect(keep.grid.structures).toHaveLength(6);
    for (let i = 0; i < kinds.length; i++) {
      expect(keep.grid.structures[i].kind).toBe(kinds[i]);
    }
  });
});
