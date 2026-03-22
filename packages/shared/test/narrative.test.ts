import { describe, it, expect } from 'vitest';
import { NPC_DIALOGUES, getDialogueForNpc, getUnseenDialogue } from '../src/narrative/dialogue.js';
import { LORE_ENTRIES, getUnlockedLore } from '../src/narrative/lore.js';

describe('dialogue', () => {
  it('has dialogue for all 5 NPCs', () => {
    const npcIds = new Set(NPC_DIALOGUES.map((d) => d.npcId));
    expect(npcIds.size).toBe(5);
    expect(npcIds.has('wren')).toBe(true);
    expect(npcIds.has('sable')).toBe(true);
    expect(npcIds.has('duskmar')).toBe(true);
    expect(npcIds.has('mott')).toBe(true);
    expect(npcIds.has('pale_visitor')).toBe(true);
  });

  it('has multiple tiers of dialogue per NPC', () => {
    const wrenSets = NPC_DIALOGUES.filter((d) => d.npcId === 'wren');
    expect(wrenSets.length).toBeGreaterThanOrEqual(3);
  });

  it('all dialogue lines have required fields', () => {
    for (const set of NPC_DIALOGUES) {
      for (const line of set.lines) {
        expect(line.id).toBeTruthy();
        expect(line.speaker).toBeTruthy();
        expect(line.text).toBeTruthy();
      }
    }
  });

  it('dialogue IDs are unique', () => {
    const allIds = NPC_DIALOGUES.flatMap((s) => s.lines.map((l) => l.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('getDialogueForNpc returns lines up to given tier', () => {
    const lines = getDialogueForNpc('wren', 1);
    const tier0 = NPC_DIALOGUES.find((d) => d.npcId === 'wren' && d.tier === 0)!.lines.length;
    const tier1 = NPC_DIALOGUES.find((d) => d.npcId === 'wren' && d.tier === 1)!.lines.length;
    expect(lines.length).toBe(tier0 + tier1);
  });

  it('getUnseenDialogue filters out seen dialogue', () => {
    const all = getDialogueForNpc('wren', 0);
    const unseen = getUnseenDialogue('wren', 0, [all[0].id]);
    expect(unseen.length).toBe(all.length - 1);
  });
});

describe('lore', () => {
  it('has at least 12 lore entries', () => {
    expect(LORE_ENTRIES.length).toBeGreaterThanOrEqual(12);
  });

  it('lore IDs are unique', () => {
    const ids = LORE_ENTRIES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all entries have required fields', () => {
    for (const entry of LORE_ENTRIES) {
      expect(entry.id).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.text.length).toBeGreaterThan(50);
    }
  });

  it('unlocks lore based on stats', () => {
    const none = getUnlockedLore({ runs: 0, wins: 0, ascension: 0, bossesKilled: [], npcTiers: {} });
    expect(none.length).toBe(0);

    const some = getUnlockedLore({ runs: 10, wins: 5, ascension: 0, bossesKilled: [], npcTiers: {} });
    expect(some.length).toBeGreaterThan(0);
  });

  it('boss kills unlock boss lore', () => {
    const lore = getUnlockedLore({ runs: 0, wins: 0, ascension: 0, bossesKilled: ['boss_suture'], npcTiers: {} });
    expect(lore.some((l) => l.id === 'lore_suture')).toBe(true);
  });
});
