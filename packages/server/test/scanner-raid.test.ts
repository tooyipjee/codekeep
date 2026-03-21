import { describe, it, expect } from 'vitest';
import { simulateRaid, type RaidConfig } from '../src/engine/raid-sim.js';
import type { KeepGridState, PlacedStructure, RaidTickEvent } from '@codekeep/shared';
import { SCANNER_DAMAGE, SCANNER_RANGE, SCANNER_COOLDOWN_TICKS, PROBE_TYPES } from '@codekeep/shared';

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

describe('raid-sim — scanner interactions', () => {
  it('scanner_damages_probes_in_range', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8),
        makeStructure('scanner', 8, 2, 1),
      ],
    };

    const config: RaidConfig = { probeCount: 4, keepGrid: grid, seed: 'scanner-test-1' };
    const replay = simulateRaid(config);

    const scannerHits = replay.events.filter((e) => e.type === 'scanner_hit');
    expect(scannerHits.length).toBeGreaterThan(0);

    for (const e of scannerHits) {
      if (e.type === 'scanner_hit') {
        expect(e.damage).toBe(SCANNER_DAMAGE[1]);
        expect(e.scannerId).toBe('scanner-8-2');
      }
    }
  });

  it('scanner_can_kill_probes', () => {
    // Honeypots stun probes so scanners have time to kill. Scout has 14 HP, L3 scanner does 10 dmg.
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 14),
        // Honeypots along the top to stun incoming probes
        makeStructure('honeypot', 4, 1, 3, 'hp-4-1'),
        makeStructure('honeypot', 8, 1, 3, 'hp-8-1'),
        makeStructure('honeypot', 12, 1, 3, 'hp-12-1'),
        // Scanners near the honeypots to shoot stunned probes
        makeStructure('scanner', 4, 2, 3, 'sc-4-2'),
        makeStructure('scanner', 8, 2, 3, 'sc-8-2'),
        makeStructure('scanner', 12, 2, 3, 'sc-12-2'),
        makeStructure('scanner', 6, 2, 3, 'sc-6-2'),
        makeStructure('scanner', 10, 2, 3, 'sc-10-2'),
      ],
    };

    let foundKill = false;
    for (const seed of ['kill-a', 'kill-b', 'kill-c', 'kill-d', 'kill-e']) {
      const replay = simulateRaid({
        probeCount: 4,
        keepGrid: grid,
        seed,
        probeTypes: ['scout', 'scout', 'scout', 'scout'],
      });

      const scannerHits = replay.events.filter(
        (e) => e.type === 'scanner_hit' && e.hpRemaining <= 0,
      );
      if (scannerHits.length > 0) {
        foundKill = true;
        break;
      }
    }
    expect(foundKill, 'scanners should kill at least one scout probe across seeds').toBe(true);
  });

  it('scanner_respects_cooldown', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 14),
        makeStructure('scanner', 0, 1, 1),
      ],
    };

    const config: RaidConfig = { probeCount: 6, keepGrid: grid, seed: 'cooldown-test' };
    const replay = simulateRaid(config);

    const hits = replay.events.filter(
      (e): e is Extract<RaidTickEvent, { type: 'scanner_hit' }> => e.type === 'scanner_hit',
    );

    if (hits.length >= 2) {
      const tickGaps = [];
      for (let i = 1; i < hits.length; i++) {
        tickGaps.push(hits[i].t - hits[i - 1].t);
      }
      const minCooldown = SCANNER_COOLDOWN_TICKS[1];
      for (const gap of tickGaps) {
        expect(gap).toBeGreaterThanOrEqual(minCooldown);
      }
    }
  });

  it('higher_level_scanner_deals_more_damage', () => {
    expect(SCANNER_DAMAGE[2]).toBeGreaterThan(SCANNER_DAMAGE[1]);
    expect(SCANNER_DAMAGE[3]).toBeGreaterThan(SCANNER_DAMAGE[2]);
  });

  it('higher_level_scanner_has_shorter_cooldown', () => {
    expect(SCANNER_COOLDOWN_TICKS[2]).toBeLessThan(SCANNER_COOLDOWN_TICKS[1]);
    expect(SCANNER_COOLDOWN_TICKS[3]).toBeLessThan(SCANNER_COOLDOWN_TICKS[2]);
  });

  it('scanner_range_scales_with_level', () => {
    expect(SCANNER_RANGE[3]).toBeGreaterThanOrEqual(SCANNER_RANGE[1]);
  });

  it('no_duplicate_probe_destroyed_events_from_scanners', () => {
    // Regression: scanners could target already-dead probes in the same tick
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 14),
        makeStructure('honeypot', 4, 1, 3, 'hp-4-1'),
        makeStructure('honeypot', 8, 1, 3, 'hp-8-1'),
        makeStructure('honeypot', 12, 1, 3, 'hp-12-1'),
        makeStructure('scanner', 3, 2, 3, 'sc-3-2'),
        makeStructure('scanner', 5, 2, 3, 'sc-5-2'),
        makeStructure('scanner', 7, 2, 3, 'sc-7-2'),
        makeStructure('scanner', 9, 2, 3, 'sc-9-2'),
        makeStructure('scanner', 11, 2, 3, 'sc-11-2'),
        makeStructure('scanner', 13, 2, 3, 'sc-13-2'),
      ],
    };

    for (const seed of ['dup-1', 'dup-2', 'dup-3', 'dup-4', 'dup-5']) {
      const replay = simulateRaid({
        probeCount: 6,
        keepGrid: grid,
        seed,
        probeTypes: ['scout', 'scout', 'scout', 'scout', 'scout', 'scout'],
      });

      const destroyedByProbe = new Map<number, number>();
      for (const e of replay.events) {
        if (e.type === 'probe_destroyed') {
          destroyedByProbe.set(e.probeId, (destroyedByProbe.get(e.probeId) ?? 0) + 1);
        }
      }

      for (const [probeId, count] of destroyedByProbe) {
        expect(count, `probe ${probeId} should only be destroyed once (seed: ${seed})`).toBe(1);
      }
    }
  });

  it('defense_with_scanners_stops_more_probes_than_without', () => {
    const baseStructures: PlacedStructure[] = [
      makeStructure('dataVault', 8, 8),
      makeStructure('firewall', 7, 7, 1),
      makeStructure('firewall', 8, 7, 1),
      makeStructure('firewall', 9, 7, 1),
    ];

    const gridWithout: KeepGridState = {
      width: 16, height: 16, structures: [...baseStructures],
    };
    const gridWith: KeepGridState = {
      width: 16, height: 16,
      structures: [
        ...baseStructures,
        makeStructure('scanner', 8, 6, 3),
        makeStructure('scanner', 7, 6, 3),
        makeStructure('scanner', 9, 6, 3),
      ],
    };

    const seed = 'scanner-vs-no-scanner';
    const probeCount = 6;
    const replayWithout = simulateRaid({ probeCount, keepGrid: gridWithout, seed });
    const replayWith = simulateRaid({ probeCount, keepGrid: gridWith, seed });

    const lootWithout = replayWithout.events
      .filter((e): e is Extract<RaidTickEvent, { type: 'vault_breach' }> => e.type === 'vault_breach')
      .reduce((sum, e) => sum + e.lootTaken.memory, 0);
    const lootWith = replayWith.events
      .filter((e): e is Extract<RaidTickEvent, { type: 'vault_breach' }> => e.type === 'vault_breach')
      .reduce((sum, e) => sum + e.lootTaken.memory, 0);

    expect(lootWith).toBeLessThanOrEqual(lootWithout);
  });
});
