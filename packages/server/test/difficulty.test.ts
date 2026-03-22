import { describe, it, expect } from 'vitest';
import { getDifficultyModifiers } from '../src/engine/difficulty.js';

describe('difficulty', () => {
  it('act 1 ascension 0 is baseline', () => {
    const mods = getDifficultyModifiers(1, 0);
    expect(mods.enemyHpMult).toBe(1);
    expect(mods.enemyDamageMult).toBe(1);
    expect(mods.startingGateHp).toBe(70);
  });

  it('act 2 increases enemy stats', () => {
    const mods = getDifficultyModifiers(2, 0);
    expect(mods.enemyHpMult).toBeGreaterThan(1);
    expect(mods.enemyDamageMult).toBeGreaterThan(1);
  });

  it('act 3 increases stats further', () => {
    const act2 = getDifficultyModifiers(2, 0);
    const act3 = getDifficultyModifiers(3, 0);
    expect(act3.enemyHpMult).toBeGreaterThan(act2.enemyHpMult);
    expect(act3.enemyDamageMult).toBeGreaterThan(act2.enemyDamageMult);
  });

  it('ascension increases difficulty', () => {
    const a0 = getDifficultyModifiers(1, 0);
    const a10 = getDifficultyModifiers(1, 10);
    expect(a10.enemyHpMult).toBeGreaterThan(a0.enemyHpMult);
    expect(a10.startingGateHp).toBeLessThan(a0.startingGateHp);
  });

  it('high ascension adds extra enemies', () => {
    const mods = getDifficultyModifiers(1, 10);
    expect(mods.extraEnemies).toBeGreaterThan(0);
  });
});
