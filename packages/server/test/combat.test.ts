import { describe, it, expect, beforeEach } from 'vitest';
import { createCombatState, playCard, endPlayerTurn } from '../src/engine/combat.js';
import { createStarterDeck, resetInstanceIdCounter } from '../src/engine/deck.js';
import { resetEnemyIdCounter } from '../src/engine/enemies.js';
import { STARTING_GATE_HP } from '@codekeep/shared';

describe('combat', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
    resetEnemyIdCounter();
  });

  it('creates a valid combat state', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42);

    expect(state.columns).toHaveLength(5);
    expect(state.hand).toHaveLength(5);
    expect(state.turn).toBe(1);
    expect(state.phase).toBe('player');
    expect(state.gateHp).toBe(STARTING_GATE_HP);
    expect(state.outcome).toBe('undecided');
  });

  it('enemies are placed in correct columns', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42, STARTING_GATE_HP, STARTING_GATE_HP, [
      { templateId: 'hollow', column: 0 },
      { templateId: 'needle', column: 4 },
    ]);

    expect(state.columns[0].enemies).toHaveLength(1);
    expect(state.columns[4].enemies).toHaveLength(1);
    expect(state.columns[0].enemies[0].templateId).toBe('hollow');
  });

  it('playing a card costs resolve', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42);
    const initialResolve = state.resolve;

    const cardIdx = state.hand.findIndex((c) => c.defId === 'strike' || c.defId === 'guard');
    if (cardIdx >= 0) {
      playCard(state, cardIdx, 0);
      expect(state.resolve).toBeLessThan(initialResolve);
    }
  });

  it('cannot play a card with insufficient resolve', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42);
    state.resolve = 0;

    const handBefore = [...state.hand];
    playCard(state, 0, 0);
    expect(state.hand).toEqual(handBefore);
  });

  it('ending turn transitions to next turn', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42);

    endPlayerTurn(state);
    if (state.outcome === 'undecided') {
      expect(state.turn).toBe(2);
      expect(state.phase).toBe('player');
    }
  });

  it('deterministic: same seed produces same initial state', () => {
    resetInstanceIdCounter();
    resetEnemyIdCounter();
    const a = createCombatState(createStarterDeck(), 999);

    resetInstanceIdCounter();
    resetEnemyIdCounter();
    const b = createCombatState(createStarterDeck(), 999);

    expect(a.hand.map((c) => c.defId)).toEqual(b.hand.map((c) => c.defId));
    expect(a.drawPile.length).toBe(b.drawPile.length);
  });

  it('combat ends in win when all enemies killed', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42, STARTING_GATE_HP, STARTING_GATE_HP, [
      { templateId: 'needle', column: 0 },
    ]);

    state.columns[0].enemies[0].hp = 1;
    const strikeIdx = state.hand.findIndex((c) => c.defId === 'strike' || c.defId === 'ember');
    if (strikeIdx >= 0) {
      playCard(state, strikeIdx, 0);
      expect(state.outcome).toBe('win');
    }
  });

  it('combat ends in lose when gate HP drops to 0', () => {
    const deck = createStarterDeck();
    const state = createCombatState(deck, 42);
    state.gateHp = 1;
    state.gateBlock = 0;

    for (const col of state.columns) {
      for (const enemy of col.enemies) {
        enemy.row = 3;
        enemy.intent = { type: 'attack', value: 100 };
      }
    }

    endPlayerTurn(state);
    expect(state.gateHp).toBe(0);
    expect(state.outcome).toBe('lose');
  });
});
