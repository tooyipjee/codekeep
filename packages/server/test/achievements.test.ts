import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, checkAchievements, getAchievementDef } from '../src/engine/achievements.js';
import { createDefaultNpcs } from '../src/engine/keep.js';
import type { KeepState } from '@codekeep/shared';

function makeKeep(overrides: Partial<KeepState> = {}): KeepState {
  return {
    structures: {},
    npcs: createDefaultNpcs(),
    echoes: 0,
    highestAscension: 0,
    totalRuns: 0,
    totalWins: 0,
    unlockedCardIds: [],
    achievements: [],
    narrativeFlags: [],
    ...overrides,
  };
}

describe('achievements', () => {
  it('has 30 achievements', () => {
    expect(ACHIEVEMENTS.length).toBe(30);
  });

  it('achievement IDs are unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all achievements have positive echo rewards', () => {
    for (const ach of ACHIEVEMENTS) {
      expect(ach.echoReward).toBeGreaterThan(0);
    }
  });

  it('detects first_run achievement', () => {
    const keep = makeKeep({ totalRuns: 1 });
    const { newAchievements } = checkAchievements(keep);
    expect(newAchievements).toContain('first_run');
  });

  it('detects first_win achievement', () => {
    const keep = makeKeep({ totalWins: 1 });
    const { newAchievements } = checkAchievements(keep);
    expect(newAchievements).toContain('first_win');
  });

  it('does not re-award already earned achievements', () => {
    const keep = makeKeep({ totalRuns: 1, achievements: ['first_run'] });
    const { newAchievements } = checkAchievements(keep);
    expect(newAchievements).not.toContain('first_run');
  });

  it('returns echo total for new achievements', () => {
    const keep = makeKeep({ totalRuns: 1, totalWins: 1 });
    const { echoesEarned } = checkAchievements(keep);
    expect(echoesEarned).toBeGreaterThan(0);
  });

  it('getAchievementDef returns correct achievement', () => {
    const ach = getAchievementDef('first_run');
    expect(ach).toBeDefined();
    expect(ach!.name).toBe('Into the Pale');
  });
});
