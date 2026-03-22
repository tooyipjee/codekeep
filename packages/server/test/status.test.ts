import { describe, it, expect } from 'vitest';
import { applyStatus, hasStatus, getDamageMult, getEnemyDamageMult, applyBurn, tickStatusEffects } from '../src/engine/status.js';
import type { EnemyInstance } from '@codekeep/shared';

function makeEnemy(): EnemyInstance {
  return {
    instanceId: 'test-1',
    templateId: 'hollow',
    hp: 20,
    maxHp: 20,
    column: 0,
    row: 0,
    intent: null,
    statusEffects: [],
  };
}

describe('status effects', () => {
  it('applies a new status effect', () => {
    const enemy = makeEnemy();
    applyStatus(enemy, 'vulnerable', 2, 3);
    expect(hasStatus(enemy, 'vulnerable')).toBe(2);
  });

  it('stacks status effects', () => {
    const enemy = makeEnemy();
    applyStatus(enemy, 'vulnerable', 2, 3);
    applyStatus(enemy, 'vulnerable', 1, 2);
    expect(hasStatus(enemy, 'vulnerable')).toBe(3);
  });

  it('vulnerable increases incoming damage by 50%', () => {
    const enemy = makeEnemy();
    expect(getDamageMult(enemy)).toBe(1);
    applyStatus(enemy, 'vulnerable', 1, 2);
    expect(getDamageMult(enemy)).toBe(1.5);
  });

  it('weak reduces enemy damage by 25%', () => {
    const enemy = makeEnemy();
    expect(getEnemyDamageMult(enemy)).toBe(1);
    applyStatus(enemy, 'weak', 1, 2);
    expect(getEnemyDamageMult(enemy)).toBe(0.75);
  });

  it('empowered increases enemy damage', () => {
    const enemy = makeEnemy();
    applyStatus(enemy, 'empowered', 2, 5);
    expect(getEnemyDamageMult(enemy)).toBe(1.5); // 1 + 2 * 0.25
  });

  it('burn deals damage and reduces stacks', () => {
    const enemy = makeEnemy();
    applyStatus(enemy, 'burn', 3, 99);
    const damage = applyBurn(enemy);
    expect(damage).toBe(3);
    expect(enemy.hp).toBe(17);
    expect(hasStatus(enemy, 'burn')).toBe(2);
  });

  it('tick reduces duration and removes expired effects', () => {
    const enemy = makeEnemy();
    applyStatus(enemy, 'vulnerable', 2, 1);
    tickStatusEffects(enemy);
    expect(hasStatus(enemy, 'vulnerable')).toBe(0);
  });

  it('tick keeps effects with remaining duration', () => {
    const enemy = makeEnemy();
    applyStatus(enemy, 'weak', 2, 3);
    tickStatusEffects(enemy);
    expect(hasStatus(enemy, 'weak')).toBe(2);
  });
});
