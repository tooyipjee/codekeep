import type { CardDef, EnemyTemplate, PotionDef } from './types.js';

// ── Grid ──

export const COLUMNS = 5;
export const ROWS = 4;
export const MAX_RESOLVE = 3;
export const HAND_SIZE = 5;
export const STARTING_GATE_HP = 70;

// ── Starter Deck (10 cards) ──

export const CARD_DEFS: CardDef[] = [
  {
    id: 'strike', name: 'Strike', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 6 damage to an enemy.',
    effects: [{ type: 'damage', value: 6, target: 'single' }],
  },
  {
    id: 'guard', name: 'Guard', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 5 Block.',
    effects: [{ type: 'block', value: 5, target: 'self' }],
  },
  {
    id: 'bolster', name: 'Bolster', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 8 Block.',
    effects: [{ type: 'block', value: 8, target: 'self' }],
  },
  {
    id: 'spark', name: 'Spark', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 4 damage to all enemies in a column.',
    effects: [{ type: 'damage', value: 4, target: 'column' }],
  },
  {
    id: 'reinforce', name: 'Reinforce', cost: 2, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 12 Block.',
    effects: [{ type: 'block', value: 12, target: 'self' }],
  },
  {
    id: 'barrage', name: 'Barrage', cost: 2, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 4 damage to all enemies.',
    effects: [{ type: 'damage', value: 4, target: 'all' }],
  },
  {
    id: 'mend', name: 'Mend', cost: 1, type: 'cast', category: 'edict', rarity: 'common',
    description: 'Heal 4 Gate HP.',
    effects: [{ type: 'heal', value: 4, target: 'self' }],
  },
  {
    id: 'lookout', name: 'Lookout', cost: 0, type: 'cast', category: 'edict', rarity: 'common',
    description: 'Draw 1 card.',
    effects: [{ type: 'draw', value: 1 }],
  },
  {
    id: 'brace', name: 'Brace', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 4 Block. Draw 1 card.',
    effects: [{ type: 'block', value: 4, target: 'self' }, { type: 'draw', value: 1 }],
  },
  {
    id: 'ember', name: 'Ember', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 8 damage to an enemy.',
    effects: [{ type: 'damage', value: 8, target: 'single' }],
  },
];

export const STARTER_DECK_IDS = [
  'strike', 'strike', 'strike',
  'guard', 'guard',
  'spark',
  'ember',
  'brace',
  'bolster',
  'mend',
];

export function getCardDef(id: string): CardDef | undefined {
  return CARD_DEFS.find((c) => c.id === id);
}

// ── Enemy Templates ──

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  {
    id: 'hollow', name: 'Hollow', symbol: '☠', hp: 18, damage: 6, speed: 1, act: 1,
    description: 'An empty shape from the Pale. Advances steadily.',
  },
  {
    id: 'needle', name: 'Needle', symbol: '↑', hp: 10, damage: 4, speed: 2, act: 1,
    description: 'Fast and fragile. Advances two rows per turn.',
  },
];

export function getEnemyTemplate(id: string): EnemyTemplate | undefined {
  return ENEMY_TEMPLATES.find((e) => e.id === id);
}

// ── Potions ──

export const POTION_DEFS: PotionDef[] = [
  { id: 'heal_potion', name: 'Mending Draught', description: 'Heal 15 Gate HP.', effects: [{ type: 'heal', value: 15, target: 'self' }] },
  { id: 'damage_potion', name: 'Fire Flask', description: 'Deal 10 damage to all enemies in a column.', effects: [{ type: 'damage', value: 10, target: 'column' }] },
  { id: 'block_potion', name: 'Iron Tonic', description: 'Gain 15 Block.', effects: [{ type: 'block', value: 15, target: 'self' }] },
  { id: 'draw_potion', name: 'Seer\'s Ink', description: 'Draw 3 cards.', effects: [{ type: 'draw', value: 3 }] },
  { id: 'resolve_potion', name: 'Warden\'s Flame', description: 'Gain 2 Resolve this turn.', effects: [{ type: 'resolve', value: 2 }] },
];

// ── Fragments ──

export const FRAGMENT_REWARDS = {
  combat: 15,
  elite: 30,
  boss: 50,
};
