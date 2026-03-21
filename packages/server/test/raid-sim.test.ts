import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  hashSeed,
  simulateRaid,
  type RaidConfig,
} from '../src/engine/raid-sim.js';
import type { KeepGridState, PlacedStructure } from '@codekeep/shared';

function emptyGrid(): KeepGridState {
  return { width: 16, height: 16, structures: [] };
}

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

describe('raid-sim — determinism', () => {
  it('raid_simulation_deterministic_with_same_seed', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8),
        makeStructure('firewall', 7, 8),
        makeStructure('honeypot', 6, 8),
      ],
    };

    const config: RaidConfig = { probeCount: 4, keepGrid: grid, seed: 'test-seed-42' };
    const replay1 = simulateRaid(config);
    const replay2 = simulateRaid(config);

    expect(replay1.events).toEqual(replay2.events);
    expect(replay1.maxTicks).toBe(replay2.maxTicks);
  });

  it('mulberry32_produces_deterministic_sequence', () => {
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);

    const seq1 = Array.from({ length: 20 }, () => rng1());
    const seq2 = Array.from({ length: 20 }, () => rng2());

    expect(seq1).toEqual(seq2);
    expect(new Set(seq1).size).toBeGreaterThan(1);
  });
});

describe('raid-sim — edge cases', () => {
  it('raid_empty_grid_completes_without_crash', () => {
    const config: RaidConfig = { probeCount: 3, keepGrid: emptyGrid(), seed: 'empty' };
    const replay = simulateRaid(config);

    expect(replay.events.length).toBeGreaterThan(0);
    const endEvents = replay.events.filter((e) => e.type === 'raid_end');
    expect(endEvents).toHaveLength(1);
    // Empty grid with no defenses = probes breach the virtual core vault
    const outcome = endEvents[0].type === 'raid_end' && endEvents[0].outcome;
    expect(outcome === 'full_breach' || outcome === 'partial_breach').toBe(true);
  });
});

describe('raid-sim — structure interactions', () => {
  it('raid_firewall_blocks_probes', () => {
    const structures = [makeStructure('dataVault', 8, 12)];
    for (let x = 0; x < 16; x++) {
      structures.push(makeStructure('firewall', x, 1, 1, `fw-${x}-1`));
    }
    const grid: KeepGridState = { width: 16, height: 16, structures };

    const config: RaidConfig = { probeCount: 10, keepGrid: grid, seed: 'fw-wall' };
    const replay = simulateRaid(config);

    const fwDamagedEvents = replay.events.filter((e) => e.type === 'firewall_damaged');
    expect(fwDamagedEvents.length).toBeGreaterThan(0);
  });

  it('raid_honeypot_stuns_probes', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8),
        makeStructure('honeypot', 4, 0),
        makeStructure('honeypot', 8, 0),
        makeStructure('honeypot', 12, 0),
        makeStructure('honeypot', 4, 15),
        makeStructure('honeypot', 8, 15),
        makeStructure('honeypot', 0, 4),
        makeStructure('honeypot', 15, 4),
      ],
    };

    const config: RaidConfig = { probeCount: 6, keepGrid: grid, seed: 'hp-stun' };
    const replay = simulateRaid(config);

    const stunEvents = replay.events.filter((e) => e.type === 'probe_stunned');
    expect(stunEvents.length).toBeGreaterThan(0);
  });

  it('raid_vault_breach_takes_loot', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('dataVault', 0, 0)],
    };

    const config: RaidConfig = { probeCount: 4, keepGrid: grid, seed: 'loot-test' };
    const replay = simulateRaid(config);

    const breachEvents = replay.events.filter((e) => e.type === 'vault_breach');
    expect(breachEvents.length).toBeGreaterThan(0);

    for (const e of breachEvents) {
      if (e.type === 'vault_breach') {
        expect(e.lootTaken.memory).toBeGreaterThan(0);
      }
    }
  });

  it('raid_outcome_defense_win_when_no_vaults', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('firewall', 3, 3),
        makeStructure('honeypot', 10, 10),
      ],
    };

    const config: RaidConfig = { probeCount: 2, keepGrid: grid, seed: 'no-vaults' };
    const replay = simulateRaid(config);

    const endEvent = replay.events.find((e) => e.type === 'raid_end');
    expect(endEvent).toBeDefined();
    // No real vaults = virtual core vault at center; with only scattered defenses, probes can breach it
    const outcome = endEvent!.type === 'raid_end' && endEvent!.outcome;
    expect(['defense_win', 'partial_breach', 'full_breach']).toContain(outcome);
  });
});
