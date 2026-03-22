import type { CardDef, PotionDef } from '@codekeep/shared';
import { CARD_DEFS, POTION_DEFS } from '@codekeep/shared';

export interface ShopItem {
  type: 'card' | 'potion' | 'card_remove';
  cardDef?: CardDef;
  potionDef?: PotionDef;
  cost: number;
}

export function generateShop(rng: () => number): ShopItem[] {
  const items: ShopItem[] = [];
  const pool = CARD_DEFS.filter((c) => c.rarity !== 'common' || c.id === 'slash' || c.id === 'flare');

  const picked = new Set<string>();
  for (let i = 0; i < 5 && picked.size < 5; i++) {
    const card = pool[Math.floor(rng() * pool.length)];
    if (picked.has(card.id)) { i--; continue; }
    picked.add(card.id);
    const cost = card.rarity === 'rare' ? 75 : card.rarity === 'uncommon' ? 50 : 30;
    items.push({ type: 'card', cardDef: card, cost });
  }

  const potion = POTION_DEFS[Math.floor(rng() * POTION_DEFS.length)];
  items.push({ type: 'potion', potionDef: potion, cost: 25 });

  items.push({ type: 'card_remove', cost: 50 });

  return items;
}
