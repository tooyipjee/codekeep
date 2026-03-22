import { describe, it, expect, beforeEach } from 'vitest';
import { createStarterDeck, drawCards, shuffleDeck, resetInstanceIdCounter } from '../src/engine/deck.js';
import { mulberry32 } from '../src/engine/rng.js';
import { STARTER_DECK_IDS } from '@codekeep/shared';

describe('deck', () => {
  beforeEach(() => resetInstanceIdCounter());

  it('creates a starter deck with correct card count', () => {
    const deck = createStarterDeck();
    expect(deck).toHaveLength(STARTER_DECK_IDS.length);
  });

  it('starter deck has unique instance IDs', () => {
    const deck = createStarterDeck();
    const ids = deck.map((c) => c.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shuffleDeck is deterministic', () => {
    const deck = createStarterDeck();
    const a = shuffleDeck(deck, mulberry32(7));
    resetInstanceIdCounter();
    const deck2 = createStarterDeck();
    const b = shuffleDeck(deck2, mulberry32(7));
    expect(a.map((c) => c.defId)).toEqual(b.map((c) => c.defId));
  });

  it('drawCards draws the right count', () => {
    const deck = createStarterDeck();
    const rng = mulberry32(5);
    const shuffled = shuffleDeck(deck, rng);
    const { drawn, newDrawPile } = drawCards(shuffled, [], 3, rng);
    expect(drawn).toHaveLength(3);
    expect(newDrawPile).toHaveLength(shuffled.length - 3);
  });

  it('drawCards reshuffles discard when draw pile is empty', () => {
    const rng = mulberry32(42);
    const deck = createStarterDeck();
    const { drawn, newDrawPile, newDiscardPile } = drawCards([], deck, 3, rng);
    expect(drawn).toHaveLength(3);
    expect(newDrawPile.length + drawn.length).toBe(deck.length);
    expect(newDiscardPile).toHaveLength(0);
  });
});
