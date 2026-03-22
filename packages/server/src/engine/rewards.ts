import type { CardDef } from '@codekeep/shared';
import { CARD_DEFS } from '@codekeep/shared';

export function generateCardRewards(
  rng: () => number,
  count: number = 3,
  excludeIds: string[] = [],
): CardDef[] {
  const starterIds = new Set(['strike', 'guard', 'bolster', 'brace', 'mend', ...excludeIds]);
  const pool = CARD_DEFS.filter((c) => !starterIds.has(c.id) && c.id !== 'pale_curse');

  const weighted: { card: CardDef; weight: number }[] = pool.map((card) => ({
    card,
    weight: card.rarity === 'common' ? 6 : card.rarity === 'uncommon' ? 3 : card.rarity === 'rare' ? 1.5 : 0.5,
  }));

  const picked: CardDef[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count && weighted.length > 0; i++) {
    const available = weighted.filter((w) => !usedIds.has(w.card.id));
    if (available.length === 0) break;
    const totalWeight = available.reduce((sum, w) => sum + w.weight, 0);
    let roll = rng() * totalWeight;
    let found = false;
    for (const entry of available) {
      roll -= entry.weight;
      if (roll <= 0) {
        picked.push(entry.card);
        usedIds.add(entry.card.id);
        found = true;
        break;
      }
    }
    if (!found) {
      picked.push(available[available.length - 1].card);
      usedIds.add(available[available.length - 1].card.id);
    }
  }

  return picked;
}
