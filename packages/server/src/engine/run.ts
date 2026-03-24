import type { RunState, CardInstance, CombatState, ActMap } from '@codekeep/shared';
import { STARTING_GATE_HP } from '@codekeep/shared';
import { createStarterDeck, makeCardInstance } from './deck.js';
import { generateActMap, getNodeById } from './map.js';
import { hashSeed } from './rng.js';
import { getDifficultyModifiers } from './difficulty.js';
import type { DifficultyPreset } from './difficulty.js';

export function createRun(seedStr: string, ascensionLevel: number = 0, preset: DifficultyPreset = 'normal'): RunState {
  const seed = hashSeed(seedStr);
  const map = generateActMap(1, seed);
  const difficulty = getDifficultyModifiers(1, ascensionLevel, preset);

  const deck = createStarterDeck();
  if (difficulty.startWithCurse) {
    deck.push(makeCardInstance('pale_curse'));
  }

  return {
    id: `run-${Date.now()}-${seed}`,
    seed: seedStr,
    act: 1,
    map,
    currentNodeId: null,
    deck,
    gateHp: difficulty.startingGateHp,
    gateMaxHp: difficulty.startingGateHp,
    fragments: 0,
    potions: [null, null, null],
    relics: [],
    ascensionLevel,
    combat: null,
  };
}

export function addCardToRunDeck(run: RunState, card: CardInstance): RunState {
  return { ...run, deck: [...run.deck, card] };
}

export function removeCardFromRunDeck(run: RunState, instanceId: string): RunState {
  return { ...run, deck: run.deck.filter((c) => c.instanceId !== instanceId) };
}

export function visitNode(run: RunState, nodeId: string): RunState {
  const newNodes = run.map.nodes.map(n =>
    n.id === nodeId ? { ...n, visited: true } : n,
  );
  return { ...run, currentNodeId: nodeId, map: { ...run.map, nodes: newNodes } };
}

export function healGate(run: RunState, amount: number): RunState {
  return { ...run, gateHp: Math.min(run.gateMaxHp, run.gateHp + amount) };
}

export function spendFragments(run: RunState, amount: number): RunState | null {
  if (run.fragments < amount) return null;
  return { ...run, fragments: run.fragments - amount };
}

export function gainFragments(run: RunState, amount: number): RunState {
  return { ...run, fragments: run.fragments + amount };
}

export function addPotion(run: RunState, potionId: string): RunState | null {
  const idx = run.potions.indexOf(null);
  if (idx === -1) return null;
  const potions = [...run.potions];
  potions[idx] = potionId;
  return { ...run, potions };
}

export function usePotion(run: RunState, slotIndex: number): { run: RunState; potionId: string } | null {
  if (slotIndex < 0 || slotIndex >= run.potions.length) return null;
  const potionId = run.potions[slotIndex];
  if (!potionId) return null;
  const potions = [...run.potions];
  potions[slotIndex] = null;
  return { run: { ...run, potions }, potionId };
}

export function advanceAct(run: RunState): RunState {
  const nextAct = run.act + 1;
  const seed = hashSeed(run.seed + `-act${nextAct}`);
  const map = generateActMap(nextAct, seed);
  return { ...run, act: nextAct, map, currentNodeId: null };
}
