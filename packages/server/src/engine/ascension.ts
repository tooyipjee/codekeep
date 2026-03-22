export const MAX_ASCENSION = 15;

export interface AscensionModifier {
  level: number;
  name: string;
  description: string;
  type: 'stat' | 'mechanical';
}

export const ASCENSION_MODIFIERS: AscensionModifier[] = [
  { level: 1, name: 'Hardened', description: 'Enemies have +10% HP', type: 'stat' },
  { level: 2, name: 'Aggressive', description: 'Enemies deal +10% damage', type: 'stat' },
  { level: 3, name: 'Cursed Start', description: 'Start with a Pale Curse card in your deck', type: 'mechanical' },
  { level: 4, name: 'Reduced Healing', description: 'Healing effects reduced by 25%', type: 'stat' },
  { level: 5, name: 'Gate Weakness', description: 'Start with -10 max Gate HP', type: 'stat' },
  { level: 6, name: 'Blitz', description: 'Enemies advance 1 extra row on turn 1', type: 'mechanical' },
  { level: 7, name: 'Elite Buff', description: 'Elite encounters have +1 enemy', type: 'mechanical' },
  { level: 8, name: 'Scarce Rewards', description: 'Card rewards offer 2 choices instead of 3', type: 'mechanical' },
  { level: 9, name: 'Fortified Enemies', description: 'Enemies gain 1 Fortified at combat start', type: 'mechanical' },
  { level: 10, name: 'Inflation', description: 'Shop prices +25%', type: 'stat' },
  { level: 11, name: 'Void Columns', description: '1 random column per combat blocks emplacements', type: 'mechanical' },
  { level: 12, name: 'Pale Hunger', description: 'Lose 1 Gate HP after each combat', type: 'mechanical' },
  { level: 13, name: 'Boss Reinforcements', description: 'Bosses start with 2 extra minions', type: 'mechanical' },
  { level: 14, name: 'Thin Reserves', description: 'Draw 4 cards per turn instead of 5', type: 'mechanical' },
  { level: 15, name: 'True Pale', description: 'All modifiers active. -1 max Resolve.', type: 'mechanical' },
];

export function getActiveModifiers(ascensionLevel: number): AscensionModifier[] {
  return ASCENSION_MODIFIERS.filter((m) => m.level <= ascensionLevel);
}

export function canAscend(currentLevel: number, won: boolean): boolean {
  return won && currentLevel < MAX_ASCENSION;
}
