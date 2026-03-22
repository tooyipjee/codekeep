export interface DifficultyModifiers {
  enemyHpMult: number;
  enemyDamageMult: number;
  startingGateHp: number;
  extraEnemies: number;
  shopCostMult: number;
  healMult: number;
}

export function getDifficultyModifiers(act: number, ascensionLevel: number = 0): DifficultyModifiers {
  const base: DifficultyModifiers = {
    enemyHpMult: 1,
    enemyDamageMult: 1,
    startingGateHp: 70,
    extraEnemies: 0,
    shopCostMult: 1,
    healMult: 1,
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

  // Ascension scaling
  if (ascensionLevel >= 1) base.enemyHpMult += 0.05 * ascensionLevel;
  if (ascensionLevel >= 3) base.enemyDamageMult += 0.03 * ascensionLevel;
  if (ascensionLevel >= 5) base.startingGateHp -= 5 * Math.min(ascensionLevel - 4, 5);
  if (ascensionLevel >= 7) base.extraEnemies += Math.floor((ascensionLevel - 6) / 3);
  if (ascensionLevel >= 10) base.shopCostMult += 0.2;
  if (ascensionLevel >= 12) base.healMult -= 0.15;

  return base;
}
