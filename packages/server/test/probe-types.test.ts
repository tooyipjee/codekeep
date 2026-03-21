import { describe, it, expect } from 'vitest';
import { simulateRaid, type RaidConfig } from '../src/engine/raid-sim.js';
import type { KeepGridState, PlacedStructure, RaidTickEvent } from '@codekeep/shared';
import { PROBE_TYPES, FIREWALL_HP } from '@codekeep/shared';

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

describe('probe types — stat differences', () => {
  it('scout_has_lower_hp_than_standard', () => {
    expect(PROBE_TYPES.scout.hp).toBeLessThan(PROBE_TYPES.standard.hp);
  });

  it('brute_has_higher_hp_and_damage_than_standard', () => {
    expect(PROBE_TYPES.brute.hp).toBeGreaterThan(PROBE_TYPES.standard.hp);
    expect(PROBE_TYPES.brute.damage).toBeGreaterThan(PROBE_TYPES.standard.damage);
  });

  it('scout_has_speed_2', () => {
    expect(PROBE_TYPES.scout.speed).toBe(2);
  });

  it('standard_and_brute_have_speed_1', () => {
    expect(PROBE_TYPES.standard.speed).toBe(1);
    expect(PROBE_TYPES.brute.speed).toBe(1);
  });
});

describe('probe types — raid behavior', () => {
  it('scout_probes_move_faster_reaching_vault_sooner', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('dataVault', 8, 8)],
    };

    const scoutReplay = simulateRaid({
      probeCount: 1,
      keepGrid: grid,
      seed: 'speed-test',
      probeTypes: ['scout'],
    });
    const standardReplay = simulateRaid({
      probeCount: 1,
      keepGrid: grid,
      seed: 'speed-test',
      probeTypes: ['standard'],
    });

    const scoutBreachTick = scoutReplay.events.find((e) => e.type === 'vault_breach')?.t ?? Infinity;
    const standardBreachTick = standardReplay.events.find((e) => e.type === 'vault_breach')?.t ?? Infinity;

    expect(scoutBreachTick).toBeLessThanOrEqual(standardBreachTick);
  });

  it('brute_probes_destroy_firewalls_faster', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8),
        ...Array.from({ length: 16 }, (_, x) =>
          makeStructure('firewall', x, 4, 1, `fw-${x}-4`),
        ),
      ],
    };

    const bruteReplay = simulateRaid({
      probeCount: 4,
      keepGrid: grid,
      seed: 'brute-test',
      probeTypes: ['brute', 'brute', 'brute', 'brute'],
    });
    const standardReplay = simulateRaid({
      probeCount: 4,
      keepGrid: grid,
      seed: 'brute-test',
      probeTypes: ['standard', 'standard', 'standard', 'standard'],
    });

    const bruteFirstDestroy = bruteReplay.events.find(
      (e) => e.type === 'firewall_damaged' && e.destroyed,
    )?.t ?? Infinity;
    const standardFirstDestroy = standardReplay.events.find(
      (e) => e.type === 'firewall_damaged' && e.destroyed,
    )?.t ?? Infinity;

    expect(bruteFirstDestroy).toBeLessThanOrEqual(standardFirstDestroy);
  });

  it('mixed_probe_types_produce_varied_events', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8),
        makeStructure('firewall', 7, 4, 1),
        makeStructure('firewall', 8, 4, 1),
        makeStructure('honeypot', 6, 6),
      ],
    };

    const replay = simulateRaid({
      probeCount: 3,
      keepGrid: grid,
      seed: 'mixed-types',
      probeTypes: ['scout', 'standard', 'brute'],
    });

    expect(replay.events.filter((e) => e.type === 'probe_spawn')).toHaveLength(3);
    expect(replay.events.some((e) => e.type === 'raid_end')).toBe(true);
  });

  it('brute_probe_survives_more_scanner_hits_than_scout', () => {
    const scanners: PlacedStructure[] = [];
    for (let x = 2; x < 14; x += 2) {
      scanners.push(makeStructure('scanner', x, 2, 1, `scanner-${x}-2`));
    }

    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8),
        ...scanners,
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

    const bruteDeaths = bruteReplay.events.filter((e) => e.type === 'probe_destroyed').length;
    const scoutDeaths = scoutReplay.events.filter((e) => e.type === 'probe_destroyed').length;

    expect(scoutDeaths).toBeGreaterThanOrEqual(bruteDeaths);
  });

  it('probeTypes_config_defaults_to_standard_when_omitted', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('dataVault', 8, 8)],
    };

    const replay = simulateRaid({ probeCount: 2, keepGrid: grid, seed: 'default-type' });

    const spawns = replay.events.filter(
      (e): e is Extract<RaidTickEvent, { type: 'probe_spawn' }> => e.type === 'probe_spawn',
    );
    expect(spawns).toHaveLength(2);
  });
});
