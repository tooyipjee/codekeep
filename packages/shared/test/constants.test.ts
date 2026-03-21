import { describe, it, expect } from 'vitest';
import {
  GRID_SIZE,
  TICK_RATE_HZ,
  MAX_RAID_TICKS,
  STARTING_RESOURCES,
  DAILY_RESOURCE_CAP,
  STRUCTURE_SYMBOLS,
  STRUCTURE_NAMES,
  STRUCTURE_COSTS,
  EMPTY_CELL_SYMBOL,
  WALL_HP,
  TRAP_STUN_TICKS,
  TRAP_COOLDOWN_TICKS,
  TREASURY_CAPACITY,
  WARD_MITIGATION,
  WATCHTOWER_RANGE,
  ARCHER_DAMAGE,
  ARCHER_RANGE,
  ARCHER_COOLDOWN_TICKS,
  RAIDER_TYPES,
  PASSIVE_INCOME_PER_TREASURY,
  PASSIVE_INCOME_PER_WATCHTOWER,
  CODING_EVENT_GRANTS,
  KINGDOM_EVENT_NAMES,
  ACHIEVEMENTS,
  FRAGMENT_TYPES,
  ALL_STRUCTURE_KINDS,
  RESOURCE_ICONS,
  RESOURCE_COLORS,
  RESOURCE_NAMES,
  FRAGMENT_MAX,
  FRAGMENT_SPAWN_INTERVAL_MS,
  FRAGMENT_DECAY_MS,
  FRAGMENT_TREASURY_BONUS,
  FRAGMENT_TREASURY_RANGE,
  BACKGROUND_RAID_INTERVAL_MS,
  BACKGROUND_RAID_MAX,
  FAUCET_BASE_USES,
  FAUCET_DIMINISH_FACTOR,
} from '../src/constants.js';
import type { StructureKind, UpgradeLevel } from '../src/types.js';

describe('constants — grid and simulation', () => {
  it('GRID_SIZE is 16x16', () => {
    expect(GRID_SIZE).toBe(16);
  });

  it('TICK_RATE_HZ is positive', () => {
    expect(TICK_RATE_HZ).toBeGreaterThan(0);
  });

  it('MAX_RAID_TICKS is a reasonable upper bound', () => {
    expect(MAX_RAID_TICKS).toBeGreaterThan(100);
    expect(MAX_RAID_TICKS).toBeLessThan(10000);
  });

  it('EMPTY_CELL_SYMBOL is a single visual character', () => {
    expect(EMPTY_CELL_SYMBOL).toBeTruthy();
  });
});

describe('constants — resources', () => {
  it('STARTING_RESOURCES has all three resource types', () => {
    expect(STARTING_RESOURCES.gold).toBeGreaterThan(0);
    expect(STARTING_RESOURCES.wood).toBeGreaterThan(0);
    expect(STARTING_RESOURCES.stone).toBeGreaterThan(0);
  });

  it('DAILY_RESOURCE_CAP exceeds starting resources', () => {
    expect(DAILY_RESOURCE_CAP.gold).toBeGreaterThan(STARTING_RESOURCES.gold);
    expect(DAILY_RESOURCE_CAP.wood).toBeGreaterThan(STARTING_RESOURCES.wood);
    expect(DAILY_RESOURCE_CAP.stone).toBeGreaterThan(STARTING_RESOURCES.stone);
  });

  it('RESOURCE_ICONS covers all three types', () => {
    expect(RESOURCE_ICONS.gold).toBeTruthy();
    expect(RESOURCE_ICONS.wood).toBeTruthy();
    expect(RESOURCE_ICONS.stone).toBeTruthy();
  });

  it('RESOURCE_COLORS covers all three types', () => {
    expect(RESOURCE_COLORS.gold).toBeTruthy();
    expect(RESOURCE_COLORS.wood).toBeTruthy();
    expect(RESOURCE_COLORS.stone).toBeTruthy();
  });

  it('RESOURCE_NAMES covers all three types', () => {
    expect(RESOURCE_NAMES.gold).toBeTruthy();
    expect(RESOURCE_NAMES.wood).toBeTruthy();
    expect(RESOURCE_NAMES.stone).toBeTruthy();
  });
});

describe('constants — structures', () => {
  const kinds: StructureKind[] = ['wall', 'trap', 'treasury', 'ward', 'watchtower', 'archerTower'];
  const levels: UpgradeLevel[] = [1, 2, 3];

  it('ALL_STRUCTURE_KINDS contains all 6 types', () => {
    expect(ALL_STRUCTURE_KINDS).toHaveLength(6);
    for (const kind of kinds) {
      expect(ALL_STRUCTURE_KINDS).toContain(kind);
    }
  });

  it('every structure kind has a symbol', () => {
    for (const kind of kinds) {
      expect(STRUCTURE_SYMBOLS[kind]).toBeTruthy();
    }
  });

  it('every structure kind has a name', () => {
    for (const kind of kinds) {
      expect(STRUCTURE_NAMES[kind]).toBeTruthy();
      expect(typeof STRUCTURE_NAMES[kind]).toBe('string');
    }
  });

  it('every structure kind has costs for all 3 levels', () => {
    for (const kind of kinds) {
      for (const level of levels) {
        const cost = STRUCTURE_COSTS[kind][level];
        expect(cost).toBeDefined();
        expect(cost.gold).toBeGreaterThanOrEqual(0);
        expect(cost.wood).toBeGreaterThanOrEqual(0);
        expect(cost.stone).toBeGreaterThanOrEqual(0);
        expect(cost.gold + cost.wood + cost.stone).toBeGreaterThan(0);
      }
    }
  });

  it('upgrade costs increase with level for most structures', () => {
    for (const kind of kinds) {
      const cost1 = STRUCTURE_COSTS[kind][1];
      const cost3 = STRUCTURE_COSTS[kind][3];
      const total1 = cost1.gold + cost1.wood + cost1.stone;
      const total3 = cost3.gold + cost3.wood + cost3.stone;
      expect(total3).toBeGreaterThanOrEqual(total1);
    }
  });
});

describe('constants — structure stats', () => {
  it('WALL_HP increases per level', () => {
    expect(WALL_HP[1]).toBeLessThan(WALL_HP[2]);
    expect(WALL_HP[2]).toBeLessThan(WALL_HP[3]);
  });

  it('TRAP_STUN_TICKS increases per level', () => {
    expect(TRAP_STUN_TICKS[1]).toBeLessThan(TRAP_STUN_TICKS[2]);
    expect(TRAP_STUN_TICKS[2]).toBeLessThan(TRAP_STUN_TICKS[3]);
  });

  it('TRAP_COOLDOWN_TICKS decreases per level', () => {
    expect(TRAP_COOLDOWN_TICKS[1]).toBeGreaterThan(TRAP_COOLDOWN_TICKS[2]);
    expect(TRAP_COOLDOWN_TICKS[2]).toBeGreaterThan(TRAP_COOLDOWN_TICKS[3]);
  });

  it('TREASURY_CAPACITY increases per level', () => {
    expect(TREASURY_CAPACITY[1]).toBeLessThan(TREASURY_CAPACITY[2]);
    expect(TREASURY_CAPACITY[2]).toBeLessThan(TREASURY_CAPACITY[3]);
  });

  it('WARD_MITIGATION increases per level and stays below 1', () => {
    expect(WARD_MITIGATION[1]).toBeLessThan(WARD_MITIGATION[2]);
    expect(WARD_MITIGATION[2]).toBeLessThan(WARD_MITIGATION[3]);
    expect(WARD_MITIGATION[3]).toBeLessThan(1);
  });

  it('WATCHTOWER_RANGE increases per level', () => {
    expect(WATCHTOWER_RANGE[1]).toBeLessThan(WATCHTOWER_RANGE[2]);
    expect(WATCHTOWER_RANGE[2]).toBeLessThan(WATCHTOWER_RANGE[3]);
  });

  it('ARCHER_DAMAGE increases per level', () => {
    expect(ARCHER_DAMAGE[1]).toBeLessThan(ARCHER_DAMAGE[2]);
    expect(ARCHER_DAMAGE[2]).toBeLessThan(ARCHER_DAMAGE[3]);
  });

  it('ARCHER_COOLDOWN_TICKS decreases per level', () => {
    expect(ARCHER_COOLDOWN_TICKS[1]).toBeGreaterThan(ARCHER_COOLDOWN_TICKS[2]);
    expect(ARCHER_COOLDOWN_TICKS[2]).toBeGreaterThan(ARCHER_COOLDOWN_TICKS[3]);
  });

  it('ARCHER_RANGE stays constant or increases', () => {
    expect(ARCHER_RANGE[1]).toBeLessThanOrEqual(ARCHER_RANGE[2]);
    expect(ARCHER_RANGE[2]).toBeLessThanOrEqual(ARCHER_RANGE[3]);
  });
});

describe('constants — raiders', () => {
  it('raider types have valid stats', () => {
    for (const [, stats] of Object.entries(RAIDER_TYPES)) {
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.damage).toBeGreaterThan(0);
      expect(stats.loot).toBeGreaterThan(0);
      expect(stats.speed).toBeGreaterThan(0);
    }
  });

  it('brute has more HP than raider', () => {
    expect(RAIDER_TYPES.brute.hp).toBeGreaterThan(RAIDER_TYPES.raider.hp);
  });

  it('scout is faster than raider', () => {
    expect(RAIDER_TYPES.scout.speed).toBeGreaterThanOrEqual(RAIDER_TYPES.raider.speed);
  });

  it('scout has less HP than raider', () => {
    expect(RAIDER_TYPES.scout.hp).toBeLessThan(RAIDER_TYPES.raider.hp);
  });
});

describe('constants — economy', () => {
  it('PASSIVE_INCOME_PER_TREASURY has positive values', () => {
    const total = PASSIVE_INCOME_PER_TREASURY.gold + PASSIVE_INCOME_PER_TREASURY.wood + PASSIVE_INCOME_PER_TREASURY.stone;
    expect(total).toBeGreaterThan(0);
  });

  it('PASSIVE_INCOME_PER_WATCHTOWER has positive values', () => {
    const total = PASSIVE_INCOME_PER_WATCHTOWER.gold + PASSIVE_INCOME_PER_WATCHTOWER.wood + PASSIVE_INCOME_PER_WATCHTOWER.stone;
    expect(total).toBeGreaterThan(0);
  });

  it('CODING_EVENT_GRANTS covers all event types', () => {
    for (const type of ['build_success', 'tests_pass', 'git_commit', 'session_reward', 'daily_login']) {
      expect(CODING_EVENT_GRANTS[type]).toBeDefined();
      const g = CODING_EVENT_GRANTS[type];
      expect(g.gold + g.wood + g.stone).toBeGreaterThan(0);
    }
  });

  it('KINGDOM_EVENT_NAMES covers all coding event types', () => {
    for (const type of ['build_success', 'tests_pass', 'git_commit', 'session_reward', 'daily_login']) {
      expect(KINGDOM_EVENT_NAMES[type]).toBeTruthy();
    }
  });

  it('FAUCET constants are reasonable', () => {
    expect(FAUCET_BASE_USES).toBeGreaterThan(0);
    expect(FAUCET_DIMINISH_FACTOR).toBeGreaterThan(0);
    expect(FAUCET_DIMINISH_FACTOR).toBeLessThan(1);
  });

  it('BACKGROUND_RAID constants are reasonable', () => {
    expect(BACKGROUND_RAID_INTERVAL_MS).toBeGreaterThan(0);
    expect(BACKGROUND_RAID_MAX).toBeGreaterThan(0);
  });
});

describe('constants — achievements', () => {
  it('has 10 achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(10);
  });

  it('every achievement has id, name, and desc', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.desc).toBeTruthy();
    }
  });

  it('achievement IDs are unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every achievement has a bonus description', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.bonus).toBeTruthy();
    }
  });
});

describe('constants — fragments', () => {
  it('fragment types have valid properties', () => {
    for (const [, frag] of Object.entries(FRAGMENT_TYPES)) {
      expect(frag.symbol).toBeTruthy();
      expect(frag.color).toBeTruthy();
      expect(frag.weight).toBeGreaterThan(0);
      expect(frag.yield.gold + frag.yield.wood + frag.yield.stone).toBeGreaterThan(0);
    }
  });

  it('fragment weights sum to 100', () => {
    const totalWeight = Object.values(FRAGMENT_TYPES).reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('FRAGMENT_MAX is positive', () => {
    expect(FRAGMENT_MAX).toBeGreaterThan(0);
  });

  it('FRAGMENT_SPAWN_INTERVAL_MS is positive', () => {
    expect(FRAGMENT_SPAWN_INTERVAL_MS).toBeGreaterThan(0);
  });

  it('FRAGMENT_DECAY_MS exceeds spawn interval', () => {
    expect(FRAGMENT_DECAY_MS).toBeGreaterThan(FRAGMENT_SPAWN_INTERVAL_MS);
  });

  it('FRAGMENT_TREASURY_BONUS is between 0 and 1', () => {
    expect(FRAGMENT_TREASURY_BONUS).toBeGreaterThan(0);
    expect(FRAGMENT_TREASURY_BONUS).toBeLessThan(1);
  });

  it('FRAGMENT_TREASURY_RANGE is positive', () => {
    expect(FRAGMENT_TREASURY_RANGE).toBeGreaterThan(0);
  });
});
