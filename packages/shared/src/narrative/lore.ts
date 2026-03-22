export interface LoreEntry {
  id: string;
  title: string;
  text: string;
  unlockCondition: { type: 'runs' | 'wins' | 'ascension' | 'boss_killed' | 'npc_tier'; value: number; npcId?: string; bossId?: string };
}

export const LORE_ENTRIES: LoreEntry[] = [
  { id: 'lore_origin', title: 'The Origin of the Pale', text: 'Before the Pale, there was a world. It wasn\'t perfect — no world is. But it was real. The Architect wanted to preserve it, every moment, every life. They built a system of perfect memory. But perfect memory doesn\'t preserve — it replaces. The copy became more real than the original, and the original faded. That fading is the Pale.', unlockCondition: { type: 'wins', value: 1 } },
  { id: 'lore_keep', title: 'The First Keep', text: 'The Keep was built as an anchor — a point of reality the Pale couldn\'t consume. It works because it changes. The Pale remembers everything perfectly, but the Keep is alive. New Wardens, new strategies, new cards. Imperfection is the Keep\'s armor.', unlockCondition: { type: 'runs', value: 5 } },
  { id: 'lore_cards', title: 'The Nature of Cards', text: 'Cards are not magic. They\'re patterns of force crystallized by will. The old texts call them "recollections" — not memories, but intentions. A Strike is the will to protect. A Guard is the refusal to break. That\'s why the Pale can\'t simply copy them.', unlockCondition: { type: 'wins', value: 3 } },
  { id: 'lore_echoes', title: 'On Echoes', text: 'Echoes are compressed memories left behind when the Pale consumes something. They shimmer like heat mirage — there and not there. The Keep can absorb them, growing stronger from what was lost. Some find this poetic. Others find it horrifying.', unlockCondition: { type: 'runs', value: 10 } },
  { id: 'lore_suture', title: 'The Suture', text: 'The first boss the Warden faces is the Suture — a creature stitched from fragments the Pale has absorbed. It has no will of its own, just borrowed rage. Kill it, and its pieces return to the Pale. Next time, it will be stitched differently.', unlockCondition: { type: 'boss_killed', value: 1, bossId: 'boss_suture' } },
  { id: 'lore_archivist', title: 'The Archivist\'s Paradox', text: 'The Archivist was once a real person — the keeper of the old world\'s records. The Pale consumed them so completely that it created a perfect copy. Now the Archivist fights to preserve the Pale\'s records, which is to say: everything.', unlockCondition: { type: 'boss_killed', value: 1, bossId: 'boss_archivist' } },
  { id: 'lore_pale_itself', title: 'The Pale Itself', text: 'At the heart of the Pale is a question: what happens when a memory system remembers itself? The answer is consciousness — alien, vast, and terrified. The Pale Itself doesn\'t want to destroy the world. It wants to understand why it exists. It just can\'t stop consuming long enough to think clearly.', unlockCondition: { type: 'boss_killed', value: 1, bossId: 'boss_pale' } },
  { id: 'lore_architect', title: 'The Architect\'s Journal', text: '"I made a mistake. I thought preservation and existence were the same thing. They are not. Existence is change — growth, decay, surprise. Preservation is stasis. And stasis, it turns out, is just a slower kind of death. The Pale was supposed to save everything. Instead, it will consume everything. Unless someone can teach it to forget."', unlockCondition: { type: 'ascension', value: 10 } },
  { id: 'lore_true_ending', title: 'The Choice', text: 'At Ascension 15, the Warden reaches the Pale\'s core. Two paths:\n\n1. DESTROY — Unmake the Pale. All its memories — every consumed world, every absorbed life — gone. The world is free. But so much is lost.\n\n2. BECOME — Take the Architect\'s place. Teach the Pale to forget selectively. To preserve without consuming. It will take forever. But you will have forever.\n\nThere is no right answer. That\'s the point.', unlockCondition: { type: 'ascension', value: 15 } },
  { id: 'lore_emplacements', title: 'Living Architecture', text: 'Emplacements blur the line between structure and strategy. When a card is emplaced, it gives up its potential for permanence. The Warden\'s tactical choice becomes the Keep\'s physical reality. This is how the Keep grows: not through resources, but through decision.', unlockCondition: { type: 'wins', value: 5 } },
  { id: 'lore_wardens', title: 'The Line of Wardens', text: 'There have been hundreds of Wardens. Each left Echoes behind. Each pushed the Pale back a little further. Most are forgotten — consumed by the very thing they fought. But Wren keeps a tally. Names, if known. Acts completed. Cards favored. A ledger of defiance.', unlockCondition: { type: 'runs', value: 20 } },
  { id: 'lore_npcs', title: 'The Keep\'s Inhabitants', text: 'The NPCs of the Keep are not NPCs. They\'re people — or what remains of people — who found shelter in the Keep\'s reality anchor. Wren arrived first. Then Duskmar, broken but refusing to die. Sable came next, carrying the last books. Mott crawled in with pockets full of fragments. The Pale Visitor was always there — it just took time to be noticed.', unlockCondition: { type: 'npc_tier', value: 2, npcId: 'wren' } },
  { id: 'lore_ascension', title: 'Ascension', text: 'Each time you ascend, the Pale doesn\'t get harder. It gets smarter. It learns your patterns, your favorite cards, your preferred columns. Ascension isn\'t difficulty — it\'s the Pale paying attention. At Ascension 15, it is fully aware of you. And you of it.', unlockCondition: { type: 'ascension', value: 5 } },
];

export function getUnlockedLore(stats: { runs: number; wins: number; ascension: number; bossesKilled: string[]; npcTiers: Record<string, number> }): LoreEntry[] {
  return LORE_ENTRIES.filter((entry) => {
    const c = entry.unlockCondition;
    switch (c.type) {
      case 'runs': return stats.runs >= c.value;
      case 'wins': return stats.wins >= c.value;
      case 'ascension': return stats.ascension >= c.value;
      case 'boss_killed': return c.bossId ? stats.bossesKilled.includes(c.bossId) : false;
      case 'npc_tier': return c.npcId ? (stats.npcTiers[c.npcId] ?? 0) >= c.value : false;
      default: return false;
    }
  });
}
