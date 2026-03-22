import { describe, it, expect } from 'vitest';
import { generateShop } from '../src/engine/shop.js';
import { mulberry32 } from '../src/engine/rng.js';

describe('shop', () => {
  it('generates shop items with cards, a potion, and card removal', () => {
    const rng = mulberry32(42);
    const items = generateShop(rng);
    expect(items.length).toBe(7); // 5 cards + 1 potion + 1 card_remove

    const cards = items.filter((i) => i.type === 'card');
    const potions = items.filter((i) => i.type === 'potion');
    const removals = items.filter((i) => i.type === 'card_remove');

    expect(cards.length).toBe(5);
    expect(potions.length).toBe(1);
    expect(removals.length).toBe(1);
  });

  it('all items have positive costs', () => {
    const rng = mulberry32(42);
    const items = generateShop(rng);
    for (const item of items) {
      expect(item.cost).toBeGreaterThan(0);
    }
  });

  it('rarer cards cost more', () => {
    const rng = mulberry32(42);
    const items = generateShop(rng);
    const cards = items.filter((i) => i.type === 'card');
    for (const c of cards) {
      if (c.cardDef?.rarity === 'rare') expect(c.cost).toBeGreaterThanOrEqual(75);
      else if (c.cardDef?.rarity === 'uncommon') expect(c.cost).toBeGreaterThanOrEqual(50);
    }
  });
});
