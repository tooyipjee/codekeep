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
    keep = placeStructure(keep, { x: 5, y: 5 }, 'wall').keep!;

    const s = getStructureAt(keep.grid, { x: 5, y: 5 });
    expect(s).toBeDefined();
    expect(s!.kind).toBe('wall');
  });

  it('returns_undefined_for_empty_cell', () => {
    const keep = freshKeep();
    expect(getStructureAt(keep.grid, { x: 5, y: 5 })).toBeUndefined();
  });
});

describe('grid — resource helpers', () => {
  it('addResources_sums_correctly', () => {
    const result = addResources(
      { gold: 10, wood: 20, stone: 30 },
      { gold: 5, wood: 15, stone: 25 },
    );
    expect(result).toEqual({ gold: 15, wood: 35, stone: 55 });
  });

  it('subtractResources_subtracts_correctly', () => {
    const result = subtractResources(
      { gold: 100, wood: 200, stone: 300 },
      { gold: 30, wood: 50, stone: 70 },
    );
    expect(result).toEqual({ gold: 70, wood: 150, stone: 230 });
  });
});

describe('grid — placement edge cases', () => {
  it('placement_insufficient_resources_shows_shortage_details', () => {
    const keep = freshKeep();
    keep.resources = { gold: 0, wood: 0, stone: 0 };

    const result = placeStructure(keep, { x: 5, y: 5 }, 'wall');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/more gold|more stone/i);
  });

  it('placement_of_archer_structure_works', () => {
    const keep = freshKeep();
    const result = placeStructure(keep, { x: 3, y: 3 }, 'archerTower');
    expect(result.ok).toBe(true);
    expect(result.keep!.grid.structures[0].kind).toBe('archerTower');
  });

  it('upgrade_nonexistent_position_rejected', () => {
    const keep = freshKeep();
    const result = upgradeStructure(keep, { x: 10, y: 10 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no structure/i);
  });

  it('upgrade_insufficient_resources_shows_shortage', () => {
    let keep = freshKeep();
    keep = placeStructure(keep, { x: 5, y: 5 }, 'wall').keep!;
    keep.resources = { gold: 0, wood: 0, stone: 0 };

    const result = upgradeStructure(keep, { x: 5, y: 5 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/more/i);
  });
});

describe('grid — demolish refund for upgraded structures', () => {
  it('demolish_level2_refunds_50_percent_of_level1_plus_level2_costs', () => {
    let keep = freshKeep();
    keep.resources = { gold: 9999, wood: 9999, stone: 9999 };

    keep = placeStructure(keep, { x: 5, y: 5 }, 'wall').keep!;
    keep = upgradeStructure(keep, { x: 5, y: 5 }).keep!;

    const beforeDemolish = { ...keep.resources };
    const result = demolishStructure(keep, { x: 5, y: 5 });
    expect(result.ok).toBe(true);

    const level1Cost = STRUCTURE_COSTS.wall[1];
    const level2Cost = STRUCTURE_COSTS.wall[2];
    const expectedRefund = {
      gold: Math.floor((level1Cost.gold + level2Cost.gold) * 0.5),
      wood: Math.floor((level1Cost.wood + level2Cost.wood) * 0.5),
      stone: Math.floor((level1Cost.stone + level2Cost.stone) * 0.5),
    };

    expect(result.keep!.resources.gold).toBe(beforeDemolish.gold + expectedRefund.gold);
    expect(result.keep!.resources.wood).toBe(beforeDemolish.wood + expectedRefund.wood);
    expect(result.keep!.resources.stone).toBe(beforeDemolish.stone + expectedRefund.stone);
  });

  it('demolish_level3_refunds_50_percent_of_all_three_level_costs', () => {
    let keep = freshKeep();
    keep.resources = { gold: 9999, wood: 9999, stone: 9999 };

    keep = placeStructure(keep, { x: 3, y: 3 }, 'trap').keep!;
    keep = upgradeStructure(keep, { x: 3, y: 3 }).keep!;
    keep = upgradeStructure(keep, { x: 3, y: 3 }).keep!;

    const s = getStructureAt(keep.grid, { x: 3, y: 3 });
    expect(s!.level).toBe(3);

    const beforeDemolish = { ...keep.resources };
    const result = demolishStructure(keep, { x: 3, y: 3 });
    expect(result.ok).toBe(true);

    const l1 = STRUCTURE_COSTS.trap[1];
    const l2 = STRUCTURE_COSTS.trap[2];
    const l3 = STRUCTURE_COSTS.trap[3];
    const expectedRefund = {
      gold: Math.floor((l1.gold + l2.gold + l3.gold) * 0.5),
      wood: Math.floor((l1.wood + l2.wood + l3.wood) * 0.5),
      stone: Math.floor((l1.stone + l2.stone + l3.stone) * 0.5),
    };

    expect(result.keep!.resources.gold).toBe(beforeDemolish.gold + expectedRefund.gold);
    expect(result.keep!.resources.wood).toBe(beforeDemolish.wood + expectedRefund.wood);
    expect(result.keep!.resources.stone).toBe(beforeDemolish.stone + expectedRefund.stone);
  });

  it('demolish_archer_structure_refunds_correctly', () => {
    let keep = freshKeep();
    keep.resources = { gold: 9999, wood: 9999, stone: 9999 };

    keep = placeStructure(keep, { x: 7, y: 7 }, 'archerTower').keep!;

    const beforeDemolish = { ...keep.resources };
    const result = demolishStructure(keep, { x: 7, y: 7 });
    expect(result.ok).toBe(true);

    const cost = STRUCTURE_COSTS.archerTower[1];
    expect(result.keep!.resources.gold).toBe(
      beforeDemolish.gold + Math.floor(cost.gold * 0.5),
    );
  });
});

describe('grid — all structure kinds placeable', () => {
  it('can_place_every_structure_kind', () => {
    const kinds = [
      'wall', 'trap', 'treasury', 'ward', 'watchtower', 'archerTower',
    ] as const;

    let keep = freshKeep();
    keep.resources = { gold: 9999, wood: 9999, stone: 9999 };

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
