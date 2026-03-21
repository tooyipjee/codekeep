import { describe, it, expect } from 'vitest';
import type { GameSave, PlacedStructure } from '@codekeep/shared';
import { STARTING_RESOURCES, ALL_STRUCTURE_KINDS } from '@codekeep/shared';
import {
  raidDifficulty,
  buildProbeTypes,
  simpleRng,
  ensureProgression,
  getAchievementBonus,
  checkAchievements,
  applyDiminishingReturns,
  ACHIEVEMENT_BONUSES,
} from '../src/lib/game-logic.js';

function makeBaseSave(overrides?: Partial<GameSave>): GameSave {
  return {
    schemaVersion: 1,
    savedAtUnixMs: Date.now(),
    player: { id: 'p1', displayName: 'Test', settings: { asciiMode: false } },
    keep: {
      id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
      grid: { width: 16, height: 16, structures: [] },
      resources: { ...STARTING_RESOURCES },
      createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
    },
    raidHistory: [],
    tutorialCompleted: false,
    lastPlayedAtUnixMs: Date.now(),
    progression: {
      totalBuildsToday: 0, totalCommitsToday: 0,
      lastDailyResetDay: 0,
      totalRaidsWon: 0, totalRaidsLost: 0,
      totalStructuresPlaced: 0,
      currentWinStreak: 0, bestWinStreak: 0,
      achievements: [], totalRaidersKilledByArcher: 0,
    },
    ...overrides,
  };
}

function makeStructure(kind: string, x: number, y: number, level: 1 | 2 | 3 = 1): PlacedStructure {
  return {
    id: `${kind}-${x}-${y}`,
    kind: kind as PlacedStructure['kind'],
    level,
    pos: { x, y },
    placedAtUnixMs: Date.now(),
  };
}

describe('raidDifficulty', () => {
  it('returns 1 for 0-2 raids', () => {
    expect(raidDifficulty(0)).toBe(1);
    expect(raidDifficulty(1)).toBe(1);
    expect(raidDifficulty(2)).toBe(1);
  });

  it('returns 2 for 3-5 raids', () => {
    expect(raidDifficulty(3)).toBe(2);
    expect(raidDifficulty(5)).toBe(2);
  });

  it('returns 3 for 6-9 raids', () => {
    expect(raidDifficulty(6)).toBe(3);
    expect(raidDifficulty(9)).toBe(3);
  });

  it('returns 4 for 10-14 raids', () => {
    expect(raidDifficulty(10)).toBe(4);
    expect(raidDifficulty(14)).toBe(4);
  });

  it('returns 5 for 15+ raids', () => {
    expect(raidDifficulty(15)).toBe(5);
    expect(raidDifficulty(100)).toBe(5);
  });
});

describe('buildProbeTypes', () => {
  it('returns correct count', () => {
    const rng = simpleRng(42);
    const types = buildProbeTypes(5, 1, rng);
    expect(types).toHaveLength(5);
  });

  it('difficulty 1 produces only raiders', () => {
    const rng = simpleRng(42);
    const types = buildProbeTypes(20, 1, rng);
    expect(types.every((t) => t === 'raider')).toBe(true);
  });

  it('difficulty 2 can produce scouts', () => {
    let hasScout = false;
    for (let seed = 0; seed < 100; seed++) {
      const rng = simpleRng(seed);
      const types = buildProbeTypes(10, 2, rng);
      if (types.includes('scout')) { hasScout = true; break; }
    }
    expect(hasScout).toBe(true);
  });

  it('difficulty 3+ can produce brutes', () => {
    let hasBrute = false;
    for (let seed = 0; seed < 100; seed++) {
      const rng = simpleRng(seed);
      const types = buildProbeTypes(10, 3, rng);
      if (types.includes('brute')) { hasBrute = true; break; }
    }
    expect(hasBrute).toBe(true);
  });

  it('all types are valid ProbeType values', () => {
    const rng = simpleRng(42);
    const types = buildProbeTypes(20, 5, rng);
    for (const t of types) {
      expect(['raider', 'scout', 'brute']).toContain(t);
    }
  });
});

describe('simpleRng', () => {
  it('produces values between 0 and 1', () => {
    const rng = simpleRng(42);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic with same seed', () => {
    const a = simpleRng(12345);
    const b = simpleRng(12345);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = simpleRng(1);
    const b = simpleRng(2);
    let differ = false;
    for (let i = 0; i < 5; i++) {
      if (a() !== b()) { differ = true; break; }
    }
    expect(differ).toBe(true);
  });
});

describe('ensureProgression', () => {
  it('fills missing progression fields with defaults', () => {
    const partial = makeBaseSave();
    delete (partial.progression as Record<string, unknown>).totalRaidersKilledByArcher;
    const fixed = ensureProgression(partial);
    expect(fixed.progression.totalRaidersKilledByArcher).toBe(0);
  });

  it('preserves existing values', () => {
    const save = makeBaseSave();
    save.progression.totalRaidsWon = 5;
    save.progression.achievements = ['first_structure'];
    const result = ensureProgression(save);
    expect(result.progression.totalRaidsWon).toBe(5);
    expect(result.progression.achievements).toEqual(['first_structure']);
  });

  it('migrates legacy totalProbesKilledByScanner field', () => {
    const save = makeBaseSave();
    delete (save.progression as Record<string, unknown>).totalRaidersKilledByArcher;
    (save.progression as Record<string, unknown>).totalProbesKilledByScanner = 7;
    const result = ensureProgression(save);
    expect(result.progression.totalRaidersKilledByArcher).toBe(7);
  });
});

describe('getAchievementBonus', () => {
  it('returns bonus for known achievement', () => {
    const bonus = getAchievementBonus('first_structure');
    expect(bonus).toEqual({ gold: 20, wood: 0, stone: 0 });
  });

  it('returns null for unknown achievement', () => {
    expect(getAchievementBonus('nonexistent')).toBeNull();
  });

  it('every defined achievement has a bonus', () => {
    for (const id of Object.keys(ACHIEVEMENT_BONUSES)) {
      const bonus = getAchievementBonus(id);
      expect(bonus).not.toBeNull();
      expect(bonus!.gold + bonus!.wood + bonus!.stone).toBeGreaterThan(0);
    }
  });
});

describe('checkAchievements', () => {
  it('first_structure triggers when totalStructuresPlaced >= 1', () => {
    const save = makeBaseSave();
    save.progression.totalStructuresPlaced = 1;
    expect(checkAchievements(save)).toContain('first_structure');
  });

  it('does not re-trigger already earned achievements', () => {
    const save = makeBaseSave();
    save.progression.totalStructuresPlaced = 1;
    save.progression.achievements = ['first_structure'];
    expect(checkAchievements(save)).not.toContain('first_structure');
  });

  it('defense_win_5 triggers at 5 wins', () => {
    const save = makeBaseSave();
    save.progression.totalRaidsWon = 5;
    expect(checkAchievements(save)).toContain('defense_win_5');
  });

  it('win_streak_3 and win_streak_5 trigger at correct thresholds', () => {
    const save = makeBaseSave();
    save.progression.bestWinStreak = 3;
    expect(checkAchievements(save)).toContain('win_streak_3');
    expect(checkAchievements(save)).not.toContain('win_streak_5');

    save.progression.bestWinStreak = 5;
    expect(checkAchievements(save)).toContain('win_streak_5');
  });

  it('structures_20 triggers at 20 placed', () => {
    const save = makeBaseSave();
    save.progression.totalStructuresPlaced = 20;
    expect(checkAchievements(save)).toContain('structures_20');
  });

  it('raids_10 triggers at 10 total raids', () => {
    const save = makeBaseSave();
    save.progression.totalRaidsWon = 6;
    save.progression.totalRaidsLost = 4;
    expect(checkAchievements(save)).toContain('raids_10');
  });

  it('archer_kills_10 triggers at 10 kills', () => {
    const save = makeBaseSave();
    save.progression.totalRaidersKilledByArcher = 10;
    expect(checkAchievements(save)).toContain('archer_kills_10');
  });

  it('hoarder triggers at 500+ total resources', () => {
    const save = makeBaseSave();
    save.keep.resources = { gold: 200, wood: 200, stone: 100 };
    expect(checkAchievements(save)).toContain('hoarder');
  });

  it('all_types triggers when all 6 structure kinds placed', () => {
    const save = makeBaseSave();
    let x = 0;
    for (const kind of ALL_STRUCTURE_KINDS) {
      save.keep.grid.structures.push(makeStructure(kind, x++, 0));
    }
    expect(checkAchievements(save)).toContain('all_types');
  });

  it('max_level triggers when any structure is level 3', () => {
    const save = makeBaseSave();
    save.keep.grid.structures.push(makeStructure('wall', 5, 5, 3));
    expect(checkAchievements(save)).toContain('max_level');
  });

  it('returns empty array for fresh save', () => {
    const save = makeBaseSave();
    expect(checkAchievements(save)).toEqual([]);
  });

  it('can trigger multiple achievements at once', () => {
    const save = makeBaseSave();
    save.progression.totalStructuresPlaced = 25;
    save.progression.totalRaidsWon = 7;
    save.progression.totalRaidsLost = 3;
    save.progression.bestWinStreak = 5;
    save.progression.totalRaidersKilledByArcher = 15;
    save.keep.resources = { gold: 300, wood: 200, stone: 100 };
    let x = 0;
    for (const kind of ALL_STRUCTURE_KINDS) {
      save.keep.grid.structures.push(makeStructure(kind, x++, 0, x <= 1 ? 3 : 1));
    }
    const results = checkAchievements(save);
    expect(results.length).toBeGreaterThan(5);
  });
});

describe('applyDiminishingReturns', () => {
  const grants = { gold: 10, wood: 8, stone: 6 };

  it('returns unchanged grants below threshold', () => {
    expect(applyDiminishingReturns(grants, 5)).toEqual(grants);
    expect(applyDiminishingReturns(grants, 10)).toEqual(grants);
  });

  it('reduces grants above threshold', () => {
    const result = applyDiminishingReturns(grants, 11);
    expect(result.gold).toBeLessThan(grants.gold);
    expect(result.wood).toBeLessThan(grants.wood);
    expect(result.stone).toBeLessThan(grants.stone);
  });

  it('never reduces below 1', () => {
    const result = applyDiminishingReturns(grants, 100);
    expect(result.gold).toBeGreaterThanOrEqual(1);
    expect(result.wood).toBeGreaterThanOrEqual(1);
    expect(result.stone).toBeGreaterThanOrEqual(1);
  });

  it('applies more reduction at higher use counts', () => {
    const r1 = applyDiminishingReturns(grants, 15);
    const r2 = applyDiminishingReturns(grants, 25);
    expect(r2.gold).toBeLessThanOrEqual(r1.gold);
  });
});
