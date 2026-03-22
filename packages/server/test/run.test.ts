import { describe, it, expect, beforeEach } from 'vitest';
import { createRun, visitNode, healGate, gainFragments, spendFragments, addCardToRunDeck, advanceAct, addPotion, usePotion, removeCardFromRunDeck } from '../src/engine/run.js';
import { makeCardInstance, resetInstanceIdCounter } from '../src/engine/deck.js';
import { resetEnemyIdCounter } from '../src/engine/enemies.js';
import { STARTING_GATE_HP } from '@codekeep/shared';

describe('run state', () => {
  beforeEach(() => {
    resetInstanceIdCounter();
    resetEnemyIdCounter();
  });

  it('creates a new run with starter deck and full gate HP', () => {
    const run = createRun('test-seed');
    expect(run.deck.length).toBe(10);
    expect(run.gateHp).toBe(STARTING_GATE_HP);
    expect(run.gateMaxHp).toBe(STARTING_GATE_HP);
    expect(run.act).toBe(1);
    expect(run.fragments).toBe(0);
    expect(run.potions).toEqual([null, null, null]);
    expect(run.relics).toEqual([]);
    expect(run.currentNodeId).toBeNull();
  });

  it('generates a map for act 1', () => {
    const run = createRun('test-seed');
    expect(run.map.act).toBe(1);
    expect(run.map.nodes.length).toBeGreaterThan(5);
  });

  it('deterministic: same seed produces same run', () => {
    const r1 = createRun('test-seed');
    const r2 = createRun('test-seed');
    expect(r1.deck.length).toBe(r2.deck.length);
    expect(r1.map.nodes.length).toBe(r2.map.nodes.length);
    expect(r1.map.nodes.map((n) => n.id)).toEqual(r2.map.nodes.map((n) => n.id));
  });

  it('visits a node and sets currentNodeId', () => {
    const run = createRun('test-seed');
    const firstNode = run.map.nodes.find((n) => n.row === 0)!;
    const updated = visitNode(run, firstNode.id);
    expect(updated.currentNodeId).toBe(firstNode.id);
  });

  it('heals gate HP capped at max', () => {
    let run = createRun('test-seed');
    run = { ...run, gateHp: 50 };
    const healed = healGate(run, 30);
    expect(healed.gateHp).toBe(Math.min(STARTING_GATE_HP, 80));
  });

  it('gains and spends fragments', () => {
    let run = createRun('test-seed');
    run = gainFragments(run, 50);
    expect(run.fragments).toBe(50);
    const spent = spendFragments(run, 30);
    expect(spent).not.toBeNull();
    expect(spent!.fragments).toBe(20);
  });

  it('cannot spend more fragments than available', () => {
    const run = createRun('test-seed');
    expect(spendFragments(run, 100)).toBeNull();
  });

  it('adds a card to the run deck', () => {
    const run = createRun('test-seed');
    const card = makeCardInstance('ember');
    const updated = addCardToRunDeck(run, card);
    expect(updated.deck.length).toBe(11);
  });

  it('removes a card from the run deck', () => {
    const run = createRun('test-seed');
    const cardToRemove = run.deck[0];
    const updated = removeCardFromRunDeck(run, cardToRemove.instanceId);
    expect(updated.deck.length).toBe(9);
  });

  it('adds and uses potions', () => {
    let run = createRun('test-seed');
    const withPotion = addPotion(run, 'heal_potion');
    expect(withPotion).not.toBeNull();
    expect(withPotion!.potions[0]).toBe('heal_potion');

    const used = usePotion(withPotion!, 0);
    expect(used).not.toBeNull();
    expect(used!.potionId).toBe('heal_potion');
    expect(used!.run.potions[0]).toBeNull();
  });

  it('cannot add potion when slots full', () => {
    let run = createRun('test-seed');
    run = addPotion(run, 'heal_potion')!;
    run = addPotion(run, 'damage_potion')!;
    run = addPotion(run, 'block_potion')!;
    expect(addPotion(run, 'draw_potion')).toBeNull();
  });

  it('advances to act 2', () => {
    const run = createRun('test-seed');
    const advanced = advanceAct(run);
    expect(advanced.act).toBe(2);
    expect(advanced.map.act).toBe(2);
    expect(advanced.currentNodeId).toBeNull();
  });
});
