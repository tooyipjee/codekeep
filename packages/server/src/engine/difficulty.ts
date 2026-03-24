import type { DifficultyModifiers } from '@codekeep/shared';

export type { DifficultyModifiers };

export type DifficultyPreset = 'easy' | 'normal' | 'hard';

const PRESET_SCALES: Record<DifficultyPreset, { hp: number; dmg: number; gateHpBonus: number }> = {
  easy:   { hp: 0.7,  dmg: 0.7,  gateHpBonus: 20 },
  normal: { hp: 1.0,  dmg: 1.0,  gateHpBonus: 0 },
  hard:   { hp: 1.25, dmg: 1.25, gateHpBonus: -10 },
};

export function getDifficultyModifiers(act: number, ascensionLevel: number = 0, preset: DifficultyPreset = 'normal'): DifficultyModifiers {
  const scale = PRESET_SCALES[preset];

  const base: DifficultyModifiers = {
    enemyHpMult: 1,
    enemyDamageMult: 1,
    startingGateHp: 70 + scale.gateHpBonus,
    extraEnemies: 0,
    shopCostMult: 1,
    healMult: 1,
    startWithCurse: false,
    enemyBlitz: false,
    reducedRewards: false,
    enemyStartFortified: false,
    voidColumns: 0,
    paleHunger: false,
    bossExtraMinions: 0,
    reducedHandSize: false,
    reducedMaxResolve: false,
  };

  // Act scaling
  if (act >= 2) {
    base.enemyHpMult += 0.2;
    base.enemyDamageMult += 0.15;
  }
  if (act >= 3) {
    base.enemyHpMult += 0.15;
    base.enemyDamageMult += 0.1;
  }

  // Ascension modifiers (cumulative)
  if (ascensionLevel >= 1) base.enemyHpMult += 0.1;
  if (ascensionLevel >= 2) base.enemyDamageMult += 0.1;
  if (ascensionLevel >= 3) base.startWithCurse = true;
  if (ascensionLevel >= 4) base.healMult -= 0.25;
  if (ascensionLevel >= 5) base.startingGateHp -= 10;
  if (ascensionLevel >= 6) base.enemyBlitz = true;
  if (ascensionLevel >= 7) base.extraEnemies += 1;
  if (ascensionLevel >= 8) base.reducedRewards = true;
  if (ascensionLevel >= 9) base.enemyStartFortified = true;
  if (ascensionLevel >= 10) base.shopCostMult += 0.25;
  if (ascensionLevel >= 11) base.voidColumns = 1;
  if (ascensionLevel >= 12) base.paleHunger = true;
  if (ascensionLevel >= 13) base.bossExtraMinions = 2;
  if (ascensionLevel >= 14) base.reducedHandSize = true;
  if (ascensionLevel >= 15) base.reducedMaxResolve = true;

  // Apply preset scaling to enemy stats
  base.enemyHpMult *= scale.hp;
  base.enemyDamageMult *= scale.dmg;

  return base;
}
