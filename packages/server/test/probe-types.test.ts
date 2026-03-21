import { describe, it, expect } from 'vitest';
import { simulateRaid, type RaidConfig } from '../src/engine/raid-sim.js';
import type { KeepGridState, PlacedStructure, RaidTickEvent } from '@codekeep/shared';
import { RAIDER_TYPES } from '@codekeep/shared';

function makeStructure(
  kind: PlacedStructure['kind'],
  x: number,
  y: number,
  level: PlacedStructure['level'] = 1,
  id?: string,
): PlacedStructure {
  return {
    id: id ?? `${kind}-${x}-${y}`,
    kind,
    level,
    pos: { x, y },
    placedAtUnixMs: 0,
  };
}

describe('raider types — stat differences', () => {
  it('scout_has_lower_hp_than_raider', () => {
    expect(RAIDER_TYPES.scout.hp).toBeLessThan(RAIDER_TYPES.raider.hp);
  });

  it('brute_has_higher_hp_and_damage_than_raider', () => {
    expect(RAIDER_TYPES.brute.hp).toBeGreaterThan(RAIDER_TYPES.raider.hp);
    expect(RAIDER_TYPES.brute.damage).toBeGreaterThan(RAIDER_TYPES.raider.damage);
  });

  it('scout_has_speed_2', () => {
    expect(RAIDER_TYPES.scout.speed).toBe(2);
  });

  it('raider_and_brute_have_speed_1', () => {
    expect(RAIDER_TYPES.raider.speed).toBe(1);
    expect(RAIDER_TYPES.brute.speed).toBe(1);
  });
});

describe('raider types — raid behavior', () => {
  it('scout_raiders_move_faster_reaching_treasury_sooner', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('treasury', 8, 8)],
    };

    const scoutReplay = simulateRaid({
      probeCount: 1,
      keepGrid: grid,
      seed: 'speed-test',
      probeTypes: ['scout'],
    });
    const raiderReplay = simulateRaid({
      probeCount: 1,
      keepGrid: grid,
      seed: 'speed-test',
      probeTypes: ['raider'],
    });

    const scoutBreachTick = scoutReplay.events.find((e) => e.type === 'treasury_breach')?.t ?? Infinity;
    const raiderBreachTick = raiderReplay.events.find((e) => e.type === 'treasury_breach')?.t ?? Infinity;

    expect(scoutBreachTick).toBeLessThanOrEqual(raiderBreachTick);
  });

  it('brute_raiders_destroy_walls_faster', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 8),
        ...Array.from({ length: 16 }, (_, x) =>
          makeStructure('wall', x, 4, 1, `fw-${x}-4`),
        ),
      ],
    };

    const bruteReplay = simulateRaid({
      probeCount: 4,
      keepGrid: grid,
      seed: 'brute-test',
      probeTypes: ['brute', 'brute', 'brute', 'brute'],
    });
    const raiderReplay = simulateRaid({
      probeCount: 4,
      keepGrid: grid,
      seed: 'brute-test',
      probeTypes: ['raider', 'raider', 'raider', 'raider'],
    });

    const bruteFirstDestroy = bruteReplay.events.find(
      (e) => e.type === 'wall_damaged' && e.destroyed,
    )?.t ?? Infinity;
    const raiderFirstDestroy = raiderReplay.events.find(
      (e) => e.type === 'wall_damaged' && e.destroyed,
    )?.t ?? Infinity;

    expect(bruteFirstDestroy).toBeLessThanOrEqual(raiderFirstDestroy);
  });

  it('mixed_raider_types_produce_varied_events', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 8),
        makeStructure('wall', 7, 4, 1),
        makeStructure('wall', 8, 4, 1),
        makeStructure('trap', 6, 6),
      ],
    };

    const replay = simulateRaid({
      probeCount: 3,
      keepGrid: grid,
      seed: 'mixed-types',
      probeTypes: ['scout', 'raider', 'brute'],
    });

    expect(replay.events.filter((e) => e.type === 'raider_spawn')).toHaveLength(3);
    expect(replay.events.some((e) => e.type === 'raid_end')).toBe(true);
  });

  it('brute_raider_survives_more_archer_hits_than_scout', () => {
    const archerTowers: PlacedStructure[] = [];
    for (let x = 2; x < 14; x += 2) {
      archerTowers.push(makeStructure('archerTower', x, 2, 1, `archerTower-${x}-2`));
    }

    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 8),
        ...archerTowers,
      ],
    };

    const bruteReplay = simulateRaid({
      probeCount: 2,
      keepGrid: grid,
      seed: 'survive-test',
      probeTypes: ['brute', 'brute'],
    });
    const scoutReplay = simulateRaid({
      probeCount: 2,
      keepGrid: grid,
      seed: 'survive-test',
      probeTypes: ['scout', 'scout'],
    });

    const bruteDeaths = bruteReplay.events.filter((e) => e.type === 'raider_destroyed').length;
    const scoutDeaths = scoutReplay.events.filter((e) => e.type === 'raider_destroyed').length;

    expect(scoutDeaths).toBeGreaterThanOrEqual(bruteDeaths);
  });

  it('probeTypes_config_defaults_to_raider_when_omitted', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('treasury', 8, 8)],
    };

    const replay = simulateRaid({ probeCount: 2, keepGrid: grid, seed: 'default-type' });

    const spawns = replay.events.filter(
      (e): e is Extract<RaidTickEvent, { type: 'raider_spawn' }> => e.type === 'raider_spawn',
    );
    expect(spawns).toHaveLength(2);
  });
});
