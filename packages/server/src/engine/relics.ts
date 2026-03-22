import type { RelicDef } from '@codekeep/shared';

export const RELIC_DEFS: RelicDef[] = [
  { id: 'iron_crown', name: 'Iron Crown', description: '+1 Resolve per turn.' },
  { id: 'pale_shard', name: 'Pale Shard', description: '+10 max Gate HP.' },
  { id: 'scout_glass', name: 'Scout Glass', description: 'Draw 1 extra card each turn.' },
  { id: 'ember_stone', name: 'Ember Stone', description: '+2 damage to all attacks.' },
  { id: 'warden_sigil', name: 'Warden\'s Sigil', description: 'Gain 3 Block at start of each turn.' },
  { id: 'echo_charm', name: 'Echo Charm', description: 'Heal 2 Gate HP after each combat.' },
  { id: 'forged_plate', name: 'Forged Plate', description: '+5 Block when playing a Fortification card.' },
  { id: 'war_drum', name: 'War Drum', description: 'Emplacements deal +1 damage.' },
  { id: 'shadow_cloak', name: 'Shadow Cloak', description: 'First enemy attack each turn deals 50% damage.' },
  { id: 'burning_brand', name: 'Burning Brand', description: 'Apply 1 Burn to all enemies at start of combat.' },
  { id: 'architects_lens', name: "Architect's Lens", description: 'Cards cost 1 less to emplace.' },
  { id: 'pale_mirror', name: 'Pale Mirror', description: 'Gain 5 fragments after each combat.' },
  { id: 'fortress_heart', name: 'Fortress Heart', description: 'Gain 4 Block at start of each turn for each emplacement.' },
  { id: 'swift_boots', name: 'Swift Boots', description: 'If hand is empty, draw 2 cards.' },
  { id: 'veterans_medal', name: "Veteran's Medal", description: '+3 max Gate HP after each boss.' },
];

export function getRelicDef(id: string): RelicDef | undefined {
  return RELIC_DEFS.find((r) => r.id === id);
}

export function pickRelicReward(rng: () => number, ownedRelics: string[]): RelicDef | null {
  const pool = RELIC_DEFS.filter((r) => !ownedRelics.includes(r.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}
