import { describe, it, expect } from 'vitest';
import {
  createEmptyKeep,
  placeStructure,
  upgradeStructure,
  demolishStructure,
  canAfford,
} from '../src/engine/grid.js';
import { STRUCTURE_COSTS, STARTING_RESOURCES } from '@codekeep/shared';

function freshKeep() {
  return createEmptyKeep('test-player', 'Test Keep');
}

describe('grid — placement', () => {
  it('placement_valid_tile_places_structure_and_deducts_cost', () => {
    const keep = freshKeep();
    const result = placeStructure(keep, { x: 5, y: 5 }, 'firewall');

    expect(result.ok).toBe(true);
    expect(result.keep).toBeDefined();
    const k = result.keep!;

    expect(k.grid.structures).toHaveLength(1);
    expect(k.grid.structures[0].kind).toBe('firewall');
    expect(k.grid.structures[0].level).toBe(1);
    expect(k.grid.structures[0].pos).toEqual({ x: 5, y: 5 });

    const cost = STRUCTURE_COSTS.firewall[1];
    expect(k.resources.compute).toBe(STARTING_RESOURCES.compute - cost.compute);
    expect(k.resources.memory).toBe(STARTING_RESOURCES.memory - cost.memory);
    expect(k.resources.bandwidth).toBe(STARTING_RESOURCES.bandwidth - cost.bandwidth);
  });

  it('placement_invalid_out_of_bounds_rejected', () => {
    const keep = freshKeep();

    expect(placeStructure(keep, { x: -1, y: 0 }, 'firewall').ok).toBe(false);
    expect(placeStructure(keep, { x: 0, y: -1 }, 'firewall').ok).toBe(false);
    expect(placeStructure(keep, { x: 16, y: 0 }, 'firewall').ok).toBe(false);
    expect(placeStructure(keep, { x: 0, y: 16 }, 'firewall').ok).toBe(false);
  });

  it('placement_invalid_occupied_tile_rejected', () => {
    const keep = freshKeep();
    const first = placeStructure(keep, { x: 3, y: 3 }, 'firewall');
    expect(first.ok).toBe(true);

    const second = placeStructure(first.keep!, { x: 3, y: 3 }, 'honeypot');
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/occupied/i);
  });
});

describe('grid — upgrade', () => {
  it('upgrade_structure_level2_requires_level1_and_deducts_delta_cost', () => {
    let keep = freshKeep();
    keep = placeStructure(keep, { x: 7, y: 7 }, 'firewall').keep!;

    const result = upgradeStructure(keep, { x: 7, y: 7 });
    expect(result.ok).toBe(true);

    const k = result.keep!;
    const upgraded = k.grid.structures.find(
      (s) => s.pos.x === 7 && s.pos.y === 7,
    )!;
    expect(upgraded.level).toBe(2);

    const level1Cost = STRUCTURE_COSTS.firewall[1];
    const level2Cost = STRUCTURE_COSTS.firewall[2];
    expect(k.resources.compute).toBe(
      STARTING_RESOURCES.compute - level1Cost.compute - level2Cost.compute,
    );
  });

  it('upgrade_max_level_rejected', () => {
    let keep = freshKeep();
    keep.resources = { compute: 9999, memory: 9999, bandwidth: 9999 };

    keep = placeStructure(keep, { x: 2, y: 2 }, 'firewall').keep!;
    keep = upgradeStructure(keep, { x: 2, y: 2 }).keep!;
    keep = upgradeStructure(keep, { x: 2, y: 2 }).keep!;

    const s = keep.grid.structures.find(
      (s) => s.pos.x === 2 && s.pos.y === 2,
    )!;
    expect(s.level).toBe(3);

    const result = upgradeStructure(keep, { x: 2, y: 2 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/max/i);
  });
});

describe('grid — demolish', () => {
  it('demolish_returns_50_percent_refund', () => {
    let keep = freshKeep();
    keep = placeStructure(keep, { x: 4, y: 4 }, 'firewall').keep!;

    const afterPlace = { ...keep.resources };
    const result = demolishStructure(keep, { x: 4, y: 4 });
    expect(result.ok).toBe(true);

    const k = result.keep!;
    expect(k.grid.structures).toHaveLength(0);

    const cost = STRUCTURE_COSTS.firewall[1];
    expect(k.resources.compute).toBe(
      afterPlace.compute + Math.floor(cost.compute * 0.5),
    );
    expect(k.resources.bandwidth).toBe(
      afterPlace.bandwidth + Math.floor(cost.bandwidth * 0.5),
    );
  });

  it('demolish_empty_cell_rejected', () => {
    const keep = freshKeep();
    const result = demolishStructure(keep, { x: 0, y: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no structure/i);
  });
});

describe('grid — canAfford', () => {
  it('can_afford_checks_all_three_resources', () => {
    expect(
      canAfford(
        { compute: 10, memory: 10, bandwidth: 10 },
        { compute: 5, memory: 5, bandwidth: 5 },
      ),
    ).toBe(true);

    expect(
      canAfford(
        { compute: 10, memory: 10, bandwidth: 10 },
        { compute: 5, memory: 5, bandwidth: 11 },
      ),
    ).toBe(false);

    expect(
      canAfford(
        { compute: 0, memory: 0, bandwidth: 0 },
        { compute: 0, memory: 0, bandwidth: 0 },
      ),
    ).toBe(true);
  });
});

describe('grid — createEmptyKeep', () => {
  it('createEmptyKeep_returns_starting_resources', () => {
    const keep = createEmptyKeep('p1', 'My Keep');

    expect(keep.ownerPlayerId).toBe('p1');
    expect(keep.name).toBe('My Keep');
    expect(keep.grid.width).toBe(16);
    expect(keep.grid.height).toBe(16);
    expect(keep.grid.structures).toHaveLength(0);
    expect(keep.resources).toEqual(STARTING_RESOURCES);
  });
});
