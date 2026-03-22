import { describe, it, expect, beforeEach } from 'vitest';
import { createCombatState } from '../src/engine/combat.js';
import { createStarterDeck, resetInstanceIdCounter } from '../src/engine/deck.js';
import { resetEnemyIdCounter } from '../src/engine/enemies.js';
import { placeEmplacement, triggerEmplacements } from '../src/engine/emplacements.js';
import { getCardDef } from '@codekeep/shared';

describe('emplacements', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
    resetEnemyIdCounter();
  });

  it('places an emplacement in an empty column', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42);
    const barricadeDef = getCardDef('barricade');
    expect(barricadeDef).toBeDefined();
    
    const placed = placeEmplacement(state, barricadeDef!, 0);
    expect(placed).toBe(true);
    expect(state.columns[0].emplacement).not.toBeNull();
    expect(state.columns[0].emplacement!.cardDefId).toBe('barricade');
  });

  it('cannot place on occupied column', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42);
    const barricadeDef = getCardDef('barricade')!;
    
    placeEmplacement(state, barricadeDef, 0);
    const placed = placeEmplacement(state, barricadeDef, 0);
    expect(placed).toBe(false);
  });

  it('triggers emplacement effects', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42, 70, 70, [{ templateId: 'hollow', column: 0 }]);
    const barricadeDef = getCardDef('barricade')!;
    
    placeEmplacement(state, barricadeDef, 0);
    const blockBefore = state.gateBlock;
    triggerEmplacements(state);
    expect(state.gateBlock).toBeGreaterThan(blockBefore);
  });
});
