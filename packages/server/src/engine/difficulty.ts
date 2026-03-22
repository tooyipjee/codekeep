import type { DifficultyModifiers } from '@codekeep/shared';

export type { DifficultyModifiers };

export function getDifficultyModifiers(act: number, ascensionLevel: number = 0): DifficultyModifiers {
  const base: DifficultyModifiers = {
    enemyHpMult: 1,
    enemyDamageMult: 1,
    startingGateHp: 70,
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
    base.enemyHpMult += 0.3;
    base.enemyDamageMult += 0.25;
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

  return base;
}
