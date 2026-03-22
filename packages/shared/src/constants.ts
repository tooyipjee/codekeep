import type { CardDef, EnemyTemplate, PotionDef } from './types.js';

// ── Grid ──

export const COLUMNS = 5;
export const ROWS = 4;
export const MAX_RESOLVE = 3;
export const HAND_SIZE = 5;
export const STARTING_GATE_HP = 70;

// ── Starter Deck (10 cards) ──

export const CARD_DEFS: CardDef[] = [
  // ── Starter / Common ──
  { id: 'strike', name: 'Strike', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 6 damage to an enemy.', effects: [{ type: 'damage', value: 6, target: 'single' }] },
  { id: 'guard', name: 'Guard', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 5 Block.', effects: [{ type: 'block', value: 5, target: 'self' }] },
  { id: 'bolster', name: 'Bolster', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 8 Block.', effects: [{ type: 'block', value: 8, target: 'self' }] },
  { id: 'spark', name: 'Spark', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 4 damage to all enemies in a column.', effects: [{ type: 'damage', value: 4, target: 'column' }] },
  { id: 'reinforce', name: 'Reinforce', cost: 2, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 15 Block.', effects: [{ type: 'block', value: 15, target: 'self' }] },
  { id: 'barrage', name: 'Barrage', cost: 2, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 6 damage to all enemies.', effects: [{ type: 'damage', value: 6, target: 'all' }] },
  { id: 'mend', name: 'Mend', cost: 1, type: 'cast', category: 'edict', rarity: 'common',
    description: 'Heal 4 Gate HP.', effects: [{ type: 'heal', value: 4, target: 'self' }] },
  { id: 'lookout', name: 'Lookout', cost: 0, type: 'cast', category: 'edict', rarity: 'common',
    description: 'Draw 1 card.', effects: [{ type: 'draw', value: 1 }] },
  { id: 'brace', name: 'Brace', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 4 Block. Draw 1 card.', effects: [{ type: 'block', value: 4, target: 'self' }, { type: 'draw', value: 1 }] },
  { id: 'ember', name: 'Ember', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 8 damage to an enemy.', effects: [{ type: 'damage', value: 8, target: 'single' }] },
  { id: 'slash', name: 'Slash', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 5 damage to an enemy. Draw 1 card.', effects: [{ type: 'damage', value: 5, target: 'single' }, { type: 'draw', value: 1 }] },
  { id: 'rally', name: 'Rally', cost: 1, type: 'cast', category: 'edict', rarity: 'common',
    description: 'Gain 3 Block. Draw 2 cards.', effects: [{ type: 'block', value: 3, target: 'self' }, { type: 'draw', value: 2 }] },
  { id: 'salvo', name: 'Salvo', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 3 damage to all enemies.', effects: [{ type: 'damage', value: 3, target: 'all' }] },
  { id: 'patch', name: 'Patch', cost: 0, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 3 Block.', effects: [{ type: 'block', value: 3, target: 'self' }] },
  { id: 'flare', name: 'Flare', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 6 damage to all enemies in a column.', effects: [{ type: 'damage', value: 6, target: 'column' }] },
  // ── Uncommon ──
  { id: 'cleave', name: 'Cleave', cost: 2, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 10 damage to an enemy.', effects: [{ type: 'damage', value: 10, target: 'single' }] },
  { id: 'iron_wall', name: 'Iron Wall', cost: 2, type: 'cast', category: 'fortification', rarity: 'uncommon',
    description: 'Gain 16 Block.', effects: [{ type: 'block', value: 16, target: 'self' }] },
  { id: 'blitz', name: 'Blitz', cost: 1, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 4 damage to an enemy twice.', effects: [{ type: 'damage', value: 4, target: 'single' }, { type: 'damage', value: 4, target: 'single' }] },
  { id: 'volley', name: 'Volley', cost: 2, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 6 damage to all enemies.', effects: [{ type: 'damage', value: 6, target: 'all' }] },
  { id: 'resurgence', name: 'Resurgence', cost: 1, type: 'cast', category: 'edict', rarity: 'uncommon',
    description: 'Heal 8 Gate HP.', effects: [{ type: 'heal', value: 8, target: 'self' }] },
  { id: 'keen_eye', name: 'Keen Eye', cost: 1, type: 'cast', category: 'edict', rarity: 'uncommon',
    description: 'Draw 3 cards.', effects: [{ type: 'draw', value: 3 }] },
  { id: 'expose', name: 'Expose', cost: 1, type: 'cast', category: 'edict', rarity: 'uncommon',
    description: 'Apply 2 Vulnerable to an enemy.', effects: [{ type: 'vulnerable', value: 2, target: 'single' }] },
  { id: 'weaken', name: 'Weaken', cost: 1, type: 'cast', category: 'edict', rarity: 'uncommon',
    description: 'Apply 2 Weak to an enemy.', effects: [{ type: 'weak', value: 2, target: 'single' }] },
  // ── More Common ──
  { id: 'bash', name: 'Bash', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Deal 7 damage. Apply 1 Vulnerable.', effects: [{ type: 'damage', value: 7, target: 'single' }, { type: 'vulnerable', value: 1, target: 'single' }] },
  { id: 'shield_bash', name: 'Shield Bash', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 6 Block. Deal 3 damage.', effects: [{ type: 'block', value: 6, target: 'self' }, { type: 'damage', value: 3, target: 'single' }] },
  { id: 'ignite', name: 'Ignite', cost: 1, type: 'cast', category: 'armament', rarity: 'common',
    description: 'Apply 3 Burn to a column.', effects: [{ type: 'burn', value: 3, target: 'column' }] },
  { id: 'scout', name: 'Scout', cost: 0, type: 'cast', category: 'edict', rarity: 'common',
    description: 'Draw 2 cards.', effects: [{ type: 'draw', value: 2 }] },
  { id: 'fortify', name: 'Fortify', cost: 1, type: 'cast', category: 'fortification', rarity: 'common',
    description: 'Gain 10 Block.', effects: [{ type: 'block', value: 10, target: 'self' }] },
  // ── More Uncommon ──
  { id: 'sundering_strike', name: 'Sundering Strike', cost: 2, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 12 damage. Apply 2 Vulnerable.', effects: [{ type: 'damage', value: 12, target: 'single' }, { type: 'vulnerable', value: 2, target: 'single' }] },
  { id: 'pale_fire', name: 'Pale Fire', cost: 2, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 5 damage to all. Apply 2 Burn.', effects: [{ type: 'damage', value: 5, target: 'all' }, { type: 'burn', value: 2, target: 'all' }] },
  { id: 'shield_wall', name: 'Shield Wall', cost: 2, type: 'cast', category: 'fortification', rarity: 'uncommon',
    description: 'Gain 20 Block.', effects: [{ type: 'block', value: 20, target: 'self' }] },
  { id: 'battle_cry', name: 'Battle Cry', cost: 1, type: 'cast', category: 'edict', rarity: 'uncommon',
    description: 'Gain 1 Resolve. Draw 1 card.', effects: [{ type: 'resolve', value: 1 }, { type: 'draw', value: 1 }] },
  { id: 'intimidate', name: 'Intimidate', cost: 1, type: 'cast', category: 'edict', rarity: 'uncommon',
    description: 'Apply 2 Weak to all enemies.', effects: [{ type: 'weak', value: 2, target: 'all' }] },
  { id: 'hemorrhage', name: 'Hemorrhage', cost: 2, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 8 damage. Apply 4 Burn.', effects: [{ type: 'damage', value: 8, target: 'single' }, { type: 'burn', value: 4, target: 'single' }] },
  { id: 'restoration', name: 'Restoration', cost: 2, type: 'cast', category: 'edict', rarity: 'uncommon',
    description: 'Heal 12 Gate HP. Gain 4 Block.', effects: [{ type: 'heal', value: 12, target: 'self' }, { type: 'block', value: 4, target: 'self' }] },
  { id: 'precision', name: 'Precision', cost: 1, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 10 damage to an enemy. Apply 1 Vulnerable.', effects: [{ type: 'damage', value: 10, target: 'single' }, { type: 'vulnerable', value: 1, target: 'single' }] },
  { id: 'firestorm', name: 'Firestorm', cost: 2, type: 'cast', category: 'armament', rarity: 'uncommon',
    description: 'Deal 8 damage to a column. Apply 3 Burn.', effects: [{ type: 'damage', value: 8, target: 'column' }, { type: 'burn', value: 3, target: 'column' }] },
  { id: 'deep_guard', name: 'Deep Guard', cost: 1, type: 'cast', category: 'fortification', rarity: 'uncommon',
    description: 'Gain 7 Block. Draw 1 card.', effects: [{ type: 'block', value: 7, target: 'self' }, { type: 'draw', value: 1 }] },
  // ── Rare ──
  { id: 'inferno', name: 'Inferno', cost: 3, type: 'cast', category: 'armament', rarity: 'rare',
    description: 'Deal 12 damage to all enemies.', effects: [{ type: 'damage', value: 12, target: 'all' }] },
  { id: 'fortress', name: 'Fortress', cost: 3, type: 'cast', category: 'fortification', rarity: 'rare',
    description: 'Gain 25 Block. Gain 1 Resolve.', effects: [{ type: 'block', value: 25, target: 'self' }, { type: 'resolve', value: 1 }] },
  { id: 'annihilate', name: 'Annihilate', cost: 3, type: 'cast', category: 'armament', rarity: 'rare',
    description: 'Deal 20 damage to an enemy.', effects: [{ type: 'damage', value: 20, target: 'single' }] },
  { id: 'wardens_wrath', name: "Warden's Wrath", cost: 3, type: 'cast', category: 'armament', rarity: 'rare',
    description: 'Deal 8 damage to all. Apply 2 Vulnerable to all.', effects: [{ type: 'damage', value: 8, target: 'all' }, { type: 'vulnerable', value: 2, target: 'all' }] },
  { id: 'iron_bastion', name: 'Iron Bastion', cost: 3, type: 'cast', category: 'fortification', rarity: 'rare',
    description: 'Gain 30 Block. Heal 5.', effects: [{ type: 'block', value: 30, target: 'self' }, { type: 'heal', value: 5, target: 'self' }] },
  { id: 'rally_the_keep', name: 'Rally the Keep', cost: 2, type: 'cast', category: 'edict', rarity: 'rare',
    description: 'Draw 4 cards. Gain 1 Resolve.', effects: [{ type: 'draw', value: 4 }, { type: 'resolve', value: 1 }] },
  { id: 'conflagration', name: 'Conflagration', cost: 3, type: 'cast', category: 'armament', rarity: 'rare',
    description: 'Apply 6 Burn to all enemies. Deal 5 damage to all.', effects: [{ type: 'burn', value: 6, target: 'all' }, { type: 'damage', value: 5, target: 'all' }] },
  { id: 'pale_ward', name: 'Pale Ward', cost: 2, type: 'cast', category: 'fortification', rarity: 'rare',
    description: 'Gain 15 Block. Apply 2 Weak to all enemies.', effects: [{ type: 'block', value: 15, target: 'self' }, { type: 'weak', value: 2, target: 'all' }] },
  // ── Legendary ──
  { id: 'cataclysm', name: 'Cataclysm', cost: 4, type: 'cast', category: 'armament', rarity: 'legendary',
    description: 'Deal 30 damage to all enemies. Take 10 Gate damage.', effects: [{ type: 'damage', value: 30, target: 'all' }, { type: 'self_damage', value: 10 }] },
  { id: 'keeps_resolve', name: "Keep's Resolve", cost: 0, type: 'cast', category: 'edict', rarity: 'legendary',
    description: 'Gain 2 Resolve. Draw 2 cards. Gain 10 Block.', effects: [{ type: 'resolve', value: 2 }, { type: 'draw', value: 2 }, { type: 'block', value: 10, target: 'self' }] },
  { id: 'eternal_wall', name: 'Eternal Wall', cost: 4, type: 'cast', category: 'fortification', rarity: 'legendary',
    description: 'Gain 50 Block. Heal 10 Gate HP.', effects: [{ type: 'block', value: 50, target: 'self' }, { type: 'heal', value: 10, target: 'self' }] },
  // ── Emplace Cards ──
  { id: 'barricade', name: 'Barricade', cost: 1, type: 'emplace', category: 'fortification', rarity: 'common',
    description: 'Cast: Gain 4 Block. Emplace: 8 HP structure, +2 Block/turn.',
    effects: [{ type: 'block', value: 4, target: 'self' }],
    emplaceCost: 1, emplaceHp: 8, emplaceEffects: [{ type: 'block', value: 2, target: 'self' }] },
  { id: 'turret', name: 'Turret', cost: 2, type: 'emplace', category: 'armament', rarity: 'uncommon',
    description: 'Cast: Deal 5 damage. Emplace: 6 HP, deals 3 damage to column/turn.',
    effects: [{ type: 'damage', value: 5, target: 'single' }],
    emplaceCost: 2, emplaceHp: 6, emplaceEffects: [{ type: 'damage', value: 3, target: 'column' }] },
  { id: 'beacon', name: 'Beacon', cost: 1, type: 'emplace', category: 'edict', rarity: 'uncommon',
    description: 'Cast: Draw 1 card. Emplace: 5 HP, heals 2 Gate HP/turn.',
    effects: [{ type: 'draw', value: 1 }],
    emplaceCost: 1, emplaceHp: 5, emplaceEffects: [{ type: 'heal', value: 2, target: 'self' }] },
  { id: 'ward_stone', name: 'Ward Stone', cost: 1, type: 'emplace', category: 'fortification', rarity: 'common',
    description: 'Cast: Gain 3 Block. Emplace: 10 HP, applies 1 Weak to enemies in column.',
    effects: [{ type: 'block', value: 3, target: 'self' }],
    emplaceCost: 1, emplaceHp: 10, emplaceEffects: [{ type: 'weak', value: 1, target: 'column' }] },
  { id: 'siphon', name: 'Siphon', cost: 2, type: 'emplace', category: 'wild', rarity: 'rare',
    description: 'Cast: Deal 4 damage to all. Emplace: 4 HP, deals 2 damage to adjacent columns.',
    effects: [{ type: 'damage', value: 4, target: 'all' }],
    emplaceCost: 2, emplaceHp: 4, emplaceEffects: [{ type: 'damage', value: 2, target: 'adjacent' }] },
  { id: 'watchtower', name: 'Watchtower', cost: 1, type: 'emplace', category: 'edict', rarity: 'common',
    description: 'Cast: Draw 2 cards. Emplace: 4 HP, applies 1 Vulnerable to enemies in column.',
    effects: [{ type: 'draw', value: 2 }],
    emplaceCost: 1, emplaceHp: 4, emplaceEffects: [{ type: 'vulnerable', value: 1, target: 'column' }] },
  { id: 'flame_pit', name: 'Flame Pit', cost: 2, type: 'emplace', category: 'armament', rarity: 'uncommon',
    description: 'Cast: Deal 6 damage to column. Emplace: 5 HP, deals 4 damage to column/turn.',
    effects: [{ type: 'damage', value: 6, target: 'column' }],
    emplaceCost: 2, emplaceHp: 5, emplaceEffects: [{ type: 'damage', value: 4, target: 'column' }] },
  { id: 'bulwark', name: 'Bulwark', cost: 2, type: 'emplace', category: 'fortification', rarity: 'rare',
    description: 'Cast: Gain 10 Block. Emplace: 15 HP, +3 Block/turn.',
    effects: [{ type: 'block', value: 10, target: 'self' }],
    emplaceCost: 2, emplaceHp: 15, emplaceEffects: [{ type: 'block', value: 3, target: 'self' }] },
  { id: 'spike_trap', name: 'Spike Trap', cost: 1, type: 'emplace', category: 'armament', rarity: 'common',
    description: 'Cast: Deal 3 damage. Emplace: 3 HP, deals 2 damage to column/turn.',
    effects: [{ type: 'damage', value: 3, target: 'single' }],
    emplaceCost: 1, emplaceHp: 3, emplaceEffects: [{ type: 'damage', value: 2, target: 'column' }] },
  { id: 'sanctum', name: 'Sanctum', cost: 3, type: 'emplace', category: 'edict', rarity: 'rare',
    description: 'Cast: Heal 6, draw 1. Emplace: 8 HP, heals 3 Gate HP/turn, +1 Block/turn.',
    effects: [{ type: 'heal', value: 6, target: 'self' }, { type: 'draw', value: 1 }],
    emplaceCost: 3, emplaceHp: 8, emplaceEffects: [{ type: 'heal', value: 3, target: 'self' }, { type: 'block', value: 1, target: 'self' }] },
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
  { id: 'hollow', name: 'Hollow', symbol: '☠', hp: 18, damage: 6, speed: 1, act: 1,
    description: 'An empty shape from the Pale. Advances steadily.' },
  { id: 'needle', name: 'Needle', symbol: '↑', hp: 10, damage: 4, speed: 2, act: 1,
    description: 'Fast and fragile. Advances two rows per turn.' },
  { id: 'shade', name: 'Shade', symbol: '◈', hp: 22, damage: 8, speed: 1, act: 1,
    description: 'A dense fragment of the Pale. Hits hard.' },
  { id: 'wisp', name: 'Wisp', symbol: '○', hp: 8, damage: 3, speed: 1, act: 1,
    description: 'Fragile but numerous. Appears in swarms.' },
  { id: 'husk', name: 'Husk', symbol: '▓', hp: 30, damage: 5, speed: 1, act: 1,
    description: 'Armored shell. Slow but resilient.' },
  { id: 'wraith', name: 'Wraith', symbol: '≈', hp: 15, damage: 7, speed: 2, act: 2,
    description: 'Drifts through emplacements. Ignores structures.' },
  { id: 'breaker', name: 'Breaker', symbol: '⚒', hp: 25, damage: 10, speed: 1, act: 2,
    description: 'Targets emplacements first. Destroys structures.' },
  { id: 'flanker', name: 'Flanker', symbol: '↔', hp: 14, damage: 6, speed: 1, act: 2,
    description: 'Shifts columns before attacking.' },
  { id: 'shielder', name: 'Shielder', symbol: '◇', hp: 20, damage: 4, speed: 1, act: 2,
    description: 'Grants shield to adjacent enemies.' },
  { id: 'echo', name: 'Echo', symbol: '∞', hp: 35, damage: 12, speed: 1, act: 3,
    description: 'A memory of something that should not exist.' },
  // ── Bosses ──
  { id: 'boss_suture', name: 'The Suture', symbol: '◈', hp: 60, damage: 8, speed: 1, act: 1,
    description: 'Stitched from fragments of the Pale. The first true threat.' },
  { id: 'boss_archivist', name: 'The Archivist', symbol: '▣', hp: 90, damage: 10, speed: 1, act: 2,
    description: 'Keeper of forgotten records. Debuffs and shields methodically.' },
  { id: 'boss_pale', name: 'The Pale Itself', symbol: '◉', hp: 130, damage: 12, speed: 1, act: 3,
    description: 'The void given form. Three phases of escalating horror.' },
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
