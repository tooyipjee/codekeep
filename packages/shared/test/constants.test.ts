import { describe, it, expect } from 'vitest';
import {
  COLUMNS, ROWS, MAX_RESOLVE, HAND_SIZE, STARTING_GATE_HP,
  CARD_DEFS, STARTER_DECK_IDS, getCardDef,
  ENEMY_TEMPLATES, getEnemyTemplate,
  POTION_DEFS, FRAGMENT_REWARDS,
} from '../src/constants.js';

describe('grid constants', () => {
  it('has 5 columns and 4 rows', () => {
    expect(COLUMNS).toBe(5);
    expect(ROWS).toBe(4);
  });

  it('starting resolve and hand size are reasonable', () => {
    expect(MAX_RESOLVE).toBeGreaterThan(0);
    expect(HAND_SIZE).toBeGreaterThan(0);
  });

  it('starting gate HP is positive', () => {
    expect(STARTING_GATE_HP).toBeGreaterThan(0);
  });
});

describe('card definitions', () => {
  it('has at least 45 cards', () => {
    expect(CARD_DEFS.length).toBeGreaterThanOrEqual(45);
  });

  it('every card has required fields', () => {
    for (const card of CARD_DEFS) {
      expect(card.id).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(card.description).toBeTruthy();
      expect(card.effects).toBeDefined();
      expect(card.cost).toBeGreaterThanOrEqual(0);
      if (card.id !== 'pale_curse') {
        expect(card.effects.length).toBeGreaterThan(0);
      }
    }
  });

  it('card IDs are unique', () => {
    const ids = CARD_DEFS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has all rarities represented', () => {
    const rarities = new Set(CARD_DEFS.map((c) => c.rarity));
    expect(rarities.has('common')).toBe(true);
    expect(rarities.has('uncommon')).toBe(true);
    expect(rarities.has('rare')).toBe(true);
    expect(rarities.has('legendary')).toBe(true);
  });

  it('has emplace cards', () => {
    const emplaceCards = CARD_DEFS.filter((c) => c.type === 'emplace');
    expect(emplaceCards.length).toBeGreaterThanOrEqual(10);
    for (const card of emplaceCards) {
      expect(card.emplaceCost).toBeDefined();
      expect(card.emplaceHp).toBeDefined();
      expect(card.emplaceEffects).toBeDefined();
    }
  });

  it('getCardDef returns correct card', () => {
    const strike = getCardDef('strike');
    expect(strike).toBeDefined();
    expect(strike!.name).toBe('Strike');
  });

  it('getCardDef returns undefined for unknown', () => {
    expect(getCardDef('nonexistent')).toBeUndefined();
  });
});

describe('starter deck', () => {
  it('has 10 cards', () => {
    expect(STARTER_DECK_IDS).toHaveLength(10);
  });

  it('all cards reference valid definitions', () => {
    for (const id of STARTER_DECK_IDS) {
      expect(getCardDef(id)).toBeDefined();
    }
  });
});

describe('enemy templates', () => {
  it('has at least 10 enemies', () => {
    expect(ENEMY_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it('every enemy has valid stats', () => {
    for (const enemy of ENEMY_TEMPLATES) {
      expect(enemy.id).toBeTruthy();
      expect(enemy.name).toBeTruthy();
      expect(enemy.hp).toBeGreaterThan(0);
      expect(enemy.damage).toBeGreaterThan(0);
      expect(enemy.speed).toBeGreaterThan(0);
    }
  });

  it('has enemies for all 3 acts', () => {
    const acts = new Set(ENEMY_TEMPLATES.map((e) => e.act));
    expect(acts.has(1)).toBe(true);
    expect(acts.has(2)).toBe(true);
    expect(acts.has(3)).toBe(true);
  });

  it('has boss templates', () => {
    expect(getEnemyTemplate('boss_suture')).toBeDefined();
    expect(getEnemyTemplate('boss_archivist')).toBeDefined();
    expect(getEnemyTemplate('boss_pale')).toBeDefined();
  });

  it('getEnemyTemplate returns correct enemy', () => {
    const hollow = getEnemyTemplate('hollow');
    expect(hollow).toBeDefined();
    expect(hollow!.name).toBe('Hollow');
  });
});

describe('potions', () => {
  it('has at least 5 potions', () => {
    expect(POTION_DEFS.length).toBeGreaterThanOrEqual(5);
  });

  it('potion IDs are unique', () => {
    const ids = POTION_DEFS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('fragment rewards', () => {
  it('boss reward > elite > combat', () => {
    expect(FRAGMENT_REWARDS.boss).toBeGreaterThan(FRAGMENT_REWARDS.elite);
    expect(FRAGMENT_REWARDS.elite).toBeGreaterThan(FRAGMENT_REWARDS.combat);
  });
});
