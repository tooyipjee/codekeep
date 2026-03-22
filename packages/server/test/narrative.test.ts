import { describe, it, expect } from 'vitest';
import { getCurrentStoryLayer, getNextDialogue, markDialogueSeen, setNarrativeFlag, hasNarrativeFlag } from '../src/engine/narrative.js';
import { createDefaultNpcs } from '../src/engine/keep.js';
import type { KeepState } from '@codekeep/shared';

function makeKeep(): KeepState {
  return {
    structures: {},
    npcs: createDefaultNpcs(),
    echoes: 0,
    highestAscension: 0,
    totalRuns: 0,
    totalWins: 0,
    unlockedCardIds: [],
    achievements: [],
    narrativeFlags: [],
  };
}

describe('narrative', () => {
  it('story layer is surface for new players', () => {
    expect(getCurrentStoryLayer(0, 0)).toBe('surface');
    expect(getCurrentStoryLayer(10, 0)).toBe('surface');
  });

  it('story layer progresses with runs', () => {
    expect(getCurrentStoryLayer(15, 0)).toBe('cracks');
    expect(getCurrentStoryLayer(30, 0)).toBe('truth');
  });

  it('ascension 15 is true ending', () => {
    expect(getCurrentStoryLayer(50, 15)).toBe('true_ending');
  });

  it('gets next dialogue for NPC at tier 0', () => {
    const keep = makeKeep();
    const dialogue = getNextDialogue('wren', keep);
    expect(dialogue).not.toBeNull();
    expect(dialogue!.speaker).toBe('Wren');
  });

  it('marks dialogue as seen', () => {
    const keep = makeKeep();
    const dialogue = getNextDialogue('wren', keep);
    expect(dialogue).not.toBeNull();
    const updated = markDialogueSeen(keep, 'wren', dialogue!.dialogueId);
    const wren = updated.npcs.find((n) => n.id === 'wren')!;
    expect(wren.dialoguesSeen).toContain(dialogue!.dialogueId);
  });

  it('does not repeat seen dialogue', () => {
    let keep = makeKeep();
    const d1 = getNextDialogue('wren', keep);
    keep = markDialogueSeen(keep, 'wren', d1!.dialogueId);
    const d2 = getNextDialogue('wren', keep);
    if (d2) {
      expect(d2.dialogueId).not.toBe(d1!.dialogueId);
    }
  });

  it('sets and checks narrative flags', () => {
    let keep = makeKeep();
    expect(hasNarrativeFlag(keep, 'test_flag')).toBe(false);
    keep = setNarrativeFlag(keep, 'test_flag');
    expect(hasNarrativeFlag(keep, 'test_flag')).toBe(true);
  });

  it('does not duplicate flags', () => {
    let keep = makeKeep();
    keep = setNarrativeFlag(keep, 'test_flag');
    keep = setNarrativeFlag(keep, 'test_flag');
    expect(keep.narrativeFlags.filter((f) => f === 'test_flag').length).toBe(1);
  });
});
