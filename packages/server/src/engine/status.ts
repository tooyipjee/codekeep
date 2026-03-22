import type { EnemyInstance, StatusEffect } from '@codekeep/shared';

export function tickStatusEffects(enemy: EnemyInstance): void {
  enemy.statusEffects = enemy.statusEffects
    .map((s) => ({ ...s, duration: s.duration - 1 }))
    .filter((s) => s.duration > 0 && s.stacks > 0);
}

export function applyStatus(enemy: EnemyInstance, type: StatusEffect['type'], stacks: number, duration: number = 2): void {
  const existing = enemy.statusEffects.find((s) => s.type === type);
  if (existing) {
    existing.stacks += stacks;
    existing.duration = Math.max(existing.duration, duration);
  } else {
    enemy.statusEffects.push({ type, stacks, duration });
  }
}

export function hasStatus(enemy: EnemyInstance, type: StatusEffect['type']): number {
  const s = enemy.statusEffects.find((e) => e.type === type);
  return s?.stacks ?? 0;
}

export function getDamageMult(enemy: EnemyInstance): number {
  let mult = 1;
  const vulnStacks = hasStatus(enemy, 'vulnerable');
  if (vulnStacks > 0) mult *= 1 + vulnStacks * 0.25;
  return mult;
}

export function getEnemyDamageMult(enemy: EnemyInstance): number {
  let mult = 1;
  const weakStacks = hasStatus(enemy, 'weak');
  if (weakStacks > 0) mult *= Math.max(0.25, 1 - weakStacks * 0.15);
  if (hasStatus(enemy, 'empowered') > 0) mult *= 1 + hasStatus(enemy, 'empowered') * 0.25;
  return mult;
}

export function applyBurn(enemy: EnemyInstance): number {
  const burnStacks = hasStatus(enemy, 'burn');
  if (burnStacks > 0) {
    enemy.hp -= burnStacks;
    const existing = enemy.statusEffects.find((s) => s.type === 'burn');
    if (existing) existing.stacks = Math.max(0, existing.stacks - 1);
    return burnStacks;
  }
  return 0;
}
