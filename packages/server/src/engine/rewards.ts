import type { CardDef } from '@codekeep/shared';
import { CARD_DEFS } from '@codekeep/shared';

export function generateCardRewards(
  rng: () => number,
  count: number = 3,
  excludeIds: string[] = [],
): CardDef[] {
  const starterIds = new Set(['strike', 'guard', 'bolster', 'brace', 'mend', ...excludeIds]);
  const pool = CARD_DEFS.filter((c) => !starterIds.has(c.id));

  const weighted: { card: CardDef; weight: number }[] = pool.map((card) => ({
    card,
    weight: card.rarity === 'common' ? 6 : card.rarity === 'uncommon' ? 3 : 1,
  }));

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const picked: CardDef[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count && weighted.length > 0; i++) {
    let roll = rng() * totalWeight;
    for (const entry of weighted) {
      if (usedIds.has(entry.card.id)) continue;
      roll -= entry.weight;
      if (roll <= 0) {
        picked.push(entry.card);
        usedIds.add(entry.card.id);
        break;
      }
    }
    if (picked.length <= i) {
      const remaining = weighted.filter((w) => !usedIds.has(w.card.id));
      if (remaining.length > 0) {
        const fallback = remaining[Math.floor(rng() * remaining.length)];
        picked.push(fallback.card);
        usedIds.add(fallback.card.id);
      }
    }
  }

  return picked;
}
