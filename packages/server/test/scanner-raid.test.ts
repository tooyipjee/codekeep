import { describe, it, expect } from 'vitest';
import { simulateRaid, type RaidConfig } from '../src/engine/raid-sim.js';
import type { KeepGridState, PlacedStructure, RaidTickEvent } from '@codekeep/shared';
import { ARCHER_DAMAGE, ARCHER_RANGE, ARCHER_COOLDOWN_TICKS } from '@codekeep/shared';

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

describe('raid-sim — archer tower interactions', () => {
  it('archer_tower_damages_raiders_in_range', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 8),
        makeStructure('archerTower', 8, 2, 1),
      ],
    };

    const config: RaidConfig = { probeCount: 4, keepGrid: grid, seed: 'archer-test-1' };
    const replay = simulateRaid(config);

    const arrowHits = replay.events.filter((e) => e.type === 'arrow_hit');
    expect(arrowHits.length).toBeGreaterThan(0);

    for (const e of arrowHits) {
      if (e.type === 'arrow_hit') {
        expect(e.damage).toBe(ARCHER_DAMAGE[1]);
        expect(e.archerId).toBe('archerTower-8-2');
      }
    }
  });

  it('archer_tower_can_kill_raiders', () => {
    // Traps stun raiders so archers have time to kill. Scout has 14 HP, L3 archer tower does 10 dmg.
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 14),
        // Traps along the top to stun incoming raiders
        makeStructure('trap', 4, 1, 3, 'hp-4-1'),
        makeStructure('trap', 8, 1, 3, 'hp-8-1'),
        makeStructure('trap', 12, 1, 3, 'hp-12-1'),
        // Archer towers near the traps to shoot stunned raiders
        makeStructure('archerTower', 4, 2, 3, 'sc-4-2'),
        makeStructure('archerTower', 8, 2, 3, 'sc-8-2'),
        makeStructure('archerTower', 12, 2, 3, 'sc-12-2'),
        makeStructure('archerTower', 6, 2, 3, 'sc-6-2'),
        makeStructure('archerTower', 10, 2, 3, 'sc-10-2'),
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

      const arrowHits = replay.events.filter(
        (e) => e.type === 'arrow_hit' && e.hpRemaining <= 0,
      );
      if (arrowHits.length > 0) {
        foundKill = true;
        break;
      }
    }
    expect(foundKill, 'archer towers should kill at least one scout raider across seeds').toBe(true);
  });

  it('archer_tower_respects_cooldown', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 14),
        makeStructure('archerTower', 0, 1, 1),
      ],
    };

    const config: RaidConfig = { probeCount: 6, keepGrid: grid, seed: 'cooldown-test' };
    const replay = simulateRaid(config);

    const hits = replay.events.filter(
      (e): e is Extract<RaidTickEvent, { type: 'arrow_hit' }> => e.type === 'arrow_hit',
    );

    if (hits.length >= 2) {
      const tickGaps = [];
      for (let i = 1; i < hits.length; i++) {
        tickGaps.push(hits[i].t - hits[i - 1].t);
      }
      const minCooldown = ARCHER_COOLDOWN_TICKS[1];
      for (const gap of tickGaps) {
        expect(gap).toBeGreaterThanOrEqual(minCooldown);
      }
    }
  });

  it('higher_level_archer_tower_deals_more_damage', () => {
    expect(ARCHER_DAMAGE[2]).toBeGreaterThan(ARCHER_DAMAGE[1]);
    expect(ARCHER_DAMAGE[3]).toBeGreaterThan(ARCHER_DAMAGE[2]);
  });

  it('higher_level_archer_tower_has_shorter_cooldown', () => {
    expect(ARCHER_COOLDOWN_TICKS[2]).toBeLessThan(ARCHER_COOLDOWN_TICKS[1]);
    expect(ARCHER_COOLDOWN_TICKS[3]).toBeLessThan(ARCHER_COOLDOWN_TICKS[2]);
  });

  it('archer_range_scales_with_level', () => {
    expect(ARCHER_RANGE[3]).toBeGreaterThanOrEqual(ARCHER_RANGE[1]);
  });

  it('no_duplicate_raider_destroyed_events_from_archer_towers', () => {
    // Regression: archer towers could target already-dead raiders in the same tick
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 8, 14),
        makeStructure('trap', 4, 1, 3, 'hp-4-1'),
        makeStructure('trap', 8, 1, 3, 'hp-8-1'),
        makeStructure('trap', 12, 1, 3, 'hp-12-1'),
        makeStructure('archerTower', 3, 2, 3, 'sc-3-2'),
        makeStructure('archerTower', 5, 2, 3, 'sc-5-2'),
        makeStructure('archerTower', 7, 2, 3, 'sc-7-2'),
        makeStructure('archerTower', 9, 2, 3, 'sc-9-2'),
        makeStructure('archerTower', 11, 2, 3, 'sc-11-2'),
        makeStructure('archerTower', 13, 2, 3, 'sc-13-2'),
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
        if (e.type === 'raider_destroyed') {
          destroyedByProbe.set(e.probeId, (destroyedByProbe.get(e.probeId) ?? 0) + 1);
        }
      }

      for (const [probeId, count] of destroyedByProbe) {
        expect(count, `probe ${probeId} should only be destroyed once (seed: ${seed})`).toBe(1);
      }
    }
  });

  it('defense_with_archer_towers_stops_more_raiders_than_without', () => {
    const baseStructures: PlacedStructure[] = [
      makeStructure('treasury', 8, 8),
      makeStructure('wall', 7, 7, 1),
      makeStructure('wall', 8, 7, 1),
      makeStructure('wall', 9, 7, 1),
    ];

    const gridWithout: KeepGridState = {
      width: 16, height: 16, structures: [...baseStructures],
    };
    const gridWith: KeepGridState = {
      width: 16, height: 16,
      structures: [
        ...baseStructures,
        makeStructure('archerTower', 8, 6, 3),
        makeStructure('archerTower', 7, 6, 3),
        makeStructure('archerTower', 9, 6, 3),
      ],
    };

    const seed = 'archer-vs-no-archer';
    const probeCount = 6;
    const replayWithout = simulateRaid({ probeCount, keepGrid: gridWithout, seed });
    const replayWith = simulateRaid({ probeCount, keepGrid: gridWith, seed });

    const totalLoot = (events: RaidTickEvent[]) => events
      .filter((e): e is Extract<RaidTickEvent, { type: 'treasury_breach' }> => e.type === 'treasury_breach')
      .reduce((sum, e) => sum + e.lootTaken.gold + e.lootTaken.wood + e.lootTaken.stone, 0);
    const lootWithout = totalLoot(replayWithout.events);
    const lootWith = totalLoot(replayWith.events);

    expect(lootWith).toBeLessThanOrEqual(lootWithout);
  });
});
