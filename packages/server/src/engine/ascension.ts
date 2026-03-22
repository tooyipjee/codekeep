export const MAX_ASCENSION = 15;

export interface AscensionModifier {
  level: number;
  name: string;
  description: string;
}

export const ASCENSION_MODIFIERS: AscensionModifier[] = [
  { level: 1, name: 'Toughened Foes', description: 'Enemies have +5% HP.' },
  { level: 2, name: 'Harder Hitters', description: 'Enemies have +10% HP.' },
  { level: 3, name: 'Punishing Blows', description: 'Enemies deal +10% damage.' },
  { level: 4, name: 'Dwindling Supplies', description: 'Start with 5 less Gate HP.' },
  { level: 5, name: 'Scarce Resources', description: 'Start with 10 less Gate HP.' },
  { level: 6, name: 'Relentless', description: 'Enemies deal +15% damage.' },
  { level: 7, name: 'Reinforced Waves', description: '+1 enemy per encounter.' },
  { level: 8, name: 'Pale Resilience', description: 'Enemies have +20% HP.' },
  { level: 9, name: 'Weakened Defenses', description: 'Start with 15 less Gate HP.' },
  { level: 10, name: 'Inflated Markets', description: 'Shop prices +20%.' },
  { level: 11, name: 'Cruel Odds', description: 'Enemies deal +25% damage.' },
  { level: 12, name: 'Diminished Healing', description: 'Healing reduced by 15%.' },
  { level: 13, name: 'Endless Hordes', description: '+2 enemies per encounter.' },
  { level: 14, name: 'Pale Fury', description: 'Bosses have +30% HP and +20% damage.' },
  { level: 15, name: 'The True Pale', description: 'All modifiers active. Good luck.' },
];

export function getActiveModifiers(ascensionLevel: number): AscensionModifier[] {
  return ASCENSION_MODIFIERS.filter((m) => m.level <= ascensionLevel);
}

export function canAscend(currentLevel: number, won: boolean): boolean {
  return won && currentLevel < MAX_ASCENSION;
}
