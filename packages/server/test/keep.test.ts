import { describe, it, expect } from 'vitest';
import { getStructureLevel, upgradeStructure, createDefaultNpcs, advanceNpcTier, calculateEchoReward, KEEP_STRUCTURES } from '../src/engine/keep.js';
import type { KeepState } from '@codekeep/shared';

function makeKeep(echoes: number = 100): KeepState {
  return {
    structures: {},
    npcs: createDefaultNpcs(),
    echoes,
    highestAscension: 0,
    totalRuns: 0,
    totalWins: 0,
    unlockedCardIds: [],
    achievements: [],
    narrativeFlags: [],
  };
}

describe('keep', () => {
  it('has 5 keep structures', () => {
    expect(KEEP_STRUCTURES.length).toBe(5);
  });

  it('structure level starts at 0', () => {
    const keep = makeKeep();
    expect(getStructureLevel(keep, 'forge')).toBe(0);
  });

  it('upgrades a structure', () => {
    const keep = makeKeep(200);
    const upgraded = upgradeStructure(keep, 'forge');
    expect(upgraded).not.toBeNull();
    expect(getStructureLevel(upgraded!, 'forge')).toBe(1);
    expect(upgraded!.echoes).toBeLessThan(200);
  });

  it('cannot upgrade past max level', () => {
    let keep = makeKeep(500);
    for (let i = 0; i < 3; i++) {
      keep = upgradeStructure(keep, 'forge') ?? keep;
    }
    expect(getStructureLevel(keep, 'forge')).toBe(3);
    expect(upgradeStructure(keep, 'forge')).toBeNull();
  });

  it('cannot upgrade without enough echoes', () => {
    const keep = makeKeep(0);
    expect(upgradeStructure(keep, 'forge')).toBeNull();
  });

  it('creates 5 default NPCs', () => {
    const npcs = createDefaultNpcs();
    expect(npcs.length).toBe(5);
    expect(npcs.every((n) => n.tier === 0)).toBe(true);
  });

  it('advances NPC tier', () => {
    const keep = makeKeep(100);
    const advanced = advanceNpcTier(keep, 'wren', 10);
    expect(advanced).not.toBeNull();
    expect(advanced!.npcs.find((n) => n.id === 'wren')!.tier).toBe(1);
  });

  it('cannot advance NPC past tier 5', () => {
    let keep = makeKeep(1000);
    for (let i = 0; i < 5; i++) {
      keep = advanceNpcTier(keep, 'wren', 10) ?? keep;
    }
    expect(advanceNpcTier(keep, 'wren', 10)).toBeNull();
  });

  it('calculates echo rewards correctly', () => {
    const winReward = calculateEchoReward(true, 3, 0);
    const loseReward = calculateEchoReward(false, 1, 0);
    expect(winReward).toBeGreaterThan(loseReward);
  });
});
