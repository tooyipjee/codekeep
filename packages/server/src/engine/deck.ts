import type { CardInstance } from '@codekeep/shared';
import { STARTER_DECK_IDS } from '@codekeep/shared';
import { shuffle } from './rng.js';

let nextInstanceId = 1;

export function makeCardInstance(defId: string): CardInstance {
  return {
    instanceId: `card-${nextInstanceId++}`,
    defId,
    upgraded: false,
  };
}

export function createStarterDeck(): CardInstance[] {
  return STARTER_DECK_IDS.map(makeCardInstance);
}

export function shuffleDeck(deck: CardInstance[], rng: () => number): CardInstance[] {
  return shuffle(deck, rng);
}

export function drawCards(
  drawPile: CardInstance[],
  discardPile: CardInstance[],
  count: number,
  rng: () => number,
): { drawn: CardInstance[]; newDrawPile: CardInstance[]; newDiscardPile: CardInstance[] } {
  const drawn: CardInstance[] = [];
  let pile = [...drawPile];
  let discard = [...discardPile];

  for (let i = 0; i < count; i++) {
    if (pile.length === 0) {
      if (discard.length === 0) break;
      pile = shuffle(discard, rng);
      discard = [];
    }
    drawn.push(pile.shift()!);
  }

  return { drawn, newDrawPile: pile, newDiscardPile: discard };
}

export function resetInstanceIdCounter(): void {
  nextInstanceId = 1;
}

export function syncInstanceIdCounter(cards: CardInstance[]): void {
  let max = 0;
  for (const card of cards) {
    const m = card.instanceId.match(/^card-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  if (max >= nextInstanceId) nextInstanceId = max + 1;
}
