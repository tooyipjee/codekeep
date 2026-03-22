export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  condition?: { type: 'runs_gte' | 'wins_gte' | 'npc_tier_gte' | 'flag_set' | 'flag_not_set'; value: string | number };
}

export interface DialogueSet {
  npcId: string;
  tier: number;
  lines: DialogueLine[];
}

export const NPC_DIALOGUES: DialogueSet[] = [
  // ── Wren (Steward) ──
  { npcId: 'wren', tier: 0, lines: [
    { id: 'wren_t0_1', speaker: 'Wren', text: 'Welcome to the Keep, Warden. I maintain what\'s left of it.' },
    { id: 'wren_t0_2', speaker: 'Wren', text: 'The Pale has been encroaching for years now. Each run pushes it back — a little.' },
    { id: 'wren_t0_3', speaker: 'Wren', text: 'The Echoes you bring back... they\'re more than currency. They\'re fragments of what the Pale has consumed.' },
  ]},
  { npcId: 'wren', tier: 1, lines: [
    { id: 'wren_t1_1', speaker: 'Wren', text: 'You\'re doing well, Warden. The Keep grows stronger.' },
    { id: 'wren_t1_2', speaker: 'Wren', text: 'I\'ve been organizing the archives. There are records of other keeps — all fallen.' },
    { id: 'wren_t1_3', speaker: 'Wren', text: 'Did you know the Pale wasn\'t always like this? Sable might tell you more.' },
    { id: 'wren_t1_4', speaker: 'Wren', text: 'The structures you build... I can feel them resonate. Like the Keep remembers what it was.' },
  ]},
  { npcId: 'wren', tier: 2, lines: [
    { id: 'wren_t2_1', speaker: 'Wren', text: 'I found something in the lower chambers. A journal. The previous Warden\'s.' },
    { id: 'wren_t2_2', speaker: 'Wren', text: '"The Pale does not destroy," they wrote. "It remembers — and in remembering, unmakes."' },
    { id: 'wren_t2_3', speaker: 'Wren', text: 'I think this Keep has been here longer than any of us know.' },
  ]},
  { npcId: 'wren', tier: 3, lines: [
    { id: 'wren_t3_1', speaker: 'Wren', text: 'Warden. I need to tell you something. The Pale Visitor... they\'re not what they seem.' },
    { id: 'wren_t3_2', speaker: 'Wren', text: 'I\'ve been tracking the patterns. Every fifty runs, the Pale shifts. Something deeper stirs.' },
  ]},
  { npcId: 'wren', tier: 4, lines: [
    { id: 'wren_t4_1', speaker: 'Wren', text: 'The truth is... there have been many Wardens. You\'re not the first. And you won\'t be the last.' },
    { id: 'wren_t4_2', speaker: 'Wren', text: 'Unless you find the source. The thing the Pale is actually looking for.' },
  ]},

  // ── Sable (Archivist) ──
  { npcId: 'sable', tier: 0, lines: [
    { id: 'sable_t0_1', speaker: 'Sable', text: 'Hmm? Oh, another Warden. The Archive is open, if you can read the old script.' },
    { id: 'sable_t0_2', speaker: 'Sable', text: 'Cards, Warden. That\'s what the old records call them. Patterns of power, crystallized.' },
    { id: 'sable_t0_3', speaker: 'Sable', text: 'The Pale erases. But patterns — true patterns — resist erasure. That\'s what your deck is.' },
  ]},
  { npcId: 'sable', tier: 1, lines: [
    { id: 'sable_t1_1', speaker: 'Sable', text: 'I\'ve decoded another section. The Pale isn\'t natural. It was created.' },
    { id: 'sable_t1_2', speaker: 'Sable', text: 'Someone — or something — made the Pale as a weapon. Against what, I don\'t yet know.' },
    { id: 'sable_t1_3', speaker: 'Sable', text: 'The emplacements you build... they\'re based on ancient designs. The old Keep had them too.' },
  ]},
  { npcId: 'sable', tier: 2, lines: [
    { id: 'sable_t2_1', speaker: 'Sable', text: 'I found it. A name: "The Architect." They built the first Keep — and the first Pale.' },
    { id: 'sable_t2_2', speaker: 'Sable', text: 'The Architect wanted to preserve everything. So they built a system that remembers. Perfectly.' },
    { id: 'sable_t2_3', speaker: 'Sable', text: 'A perfect memory is indistinguishable from a prison, Warden.' },
  ]},
  { npcId: 'sable', tier: 3, lines: [
    { id: 'sable_t3_1', speaker: 'Sable', text: 'The bosses you fight... they\'re not monsters. They\'re memories. The Suture, the Archivist...' },
    { id: 'sable_t3_2', speaker: 'Sable', text: 'Wait. The Archivist. That\'s my title. Why is there a boss named after my role?' },
  ]},
  { npcId: 'sable', tier: 4, lines: [
    { id: 'sable_t4_1', speaker: 'Sable', text: 'I cross-referenced myself against the Archive records. The result was... recursive.' },
    { id: 'sable_t4_2', speaker: 'Sable', text: 'The original Archivist\'s handwriting. It\'s identical to mine. Not similar — identical.' },
    { id: 'sable_t4_3', speaker: 'Sable', text: 'I\'m not afraid that I\'m a copy, Warden. I\'m afraid that the copy was an improvement.' },
  ]},
  { npcId: 'sable', tier: 5, lines: [
    { id: 'sable_t5_1', speaker: 'Sable', text: 'I found something in the Archive today. A letter, addressed to me. In my handwriting. Dated three hundred years ago.' },
    { id: 'sable_t5_2', speaker: 'Sable', text: 'It said: \'When you find this, stop looking. Some records exist to be lost.\'' },
    { id: 'sable_t5_3', speaker: 'Sable', text: 'I\'ve decided to keep cataloguing. Not because I have to. Because it\'s the only thing I do that the original never did.' },
  ]},

  // ── Duskmar (First Wall) ──
  { npcId: 'duskmar', tier: 0, lines: [
    { id: 'dusk_t0_1', speaker: 'Duskmar', text: 'I was the first to man these walls. And I\'ll be the last, if it comes to that.' },
    { id: 'dusk_t0_2', speaker: 'Duskmar', text: 'The Hollows are nothing. Wait until you face the Shades. Or the things in Act 3.' },
    { id: 'dusk_t0_3', speaker: 'Duskmar', text: 'Block. Always block. The Pale punishes the reckless.' },
  ]},
  { npcId: 'duskmar', tier: 1, lines: [
    { id: 'dusk_t1_1', speaker: 'Duskmar', text: 'I\'ve been teaching the walls to remember. Emplacements — that\'s the real defense.' },
    { id: 'dusk_t1_2', speaker: 'Duskmar', text: 'Every time you ascend, the Pale gets smarter. But so do you.' },
  ]},
  { npcId: 'duskmar', tier: 2, lines: [
    { id: 'dusk_t2_1', speaker: 'Duskmar', text: 'I died once, you know. In the Pale. Wren brought me back with Echoes.' },
    { id: 'dusk_t2_2', speaker: 'Duskmar', text: 'Death isn\'t permanent here. That should worry you more than it comforts you.' },
  ]},
  { npcId: 'duskmar', tier: 4, lines: [
    { id: 'duskmar_t4_1', speaker: 'Duskmar', text: 'I remember dying, Warden. Not the pain — that faded. The silence after.' },
    { id: 'duskmar_t4_2', speaker: 'Duskmar', text: 'When they brought me back, I could feel the Pale filling the gaps where memories should be. Cold, like water in a cracked foundation.' },
    { id: 'duskmar_t4_3', speaker: 'Duskmar', text: 'I don\'t block because I\'m brave. I block because I know exactly what it costs to fall.' },
  ]},

  // ── Mott (Salvager) ──
  { npcId: 'mott', tier: 0, lines: [
    { id: 'mott_t0_1', speaker: 'Mott', text: 'Fragments! Echoes! Bits and pieces of a world that doesn\'t exist anymore!' },
    { id: 'mott_t0_2', speaker: 'Mott', text: 'I trade in what the Pale leaves behind. Potions, mostly. Sometimes relics.' },
    { id: 'mott_t0_3', speaker: 'Mott', text: 'The shop in the Pale? That\'s me. Well, a memory of me. It\'s complicated.' },
  ]},
  { npcId: 'mott', tier: 1, lines: [
    { id: 'mott_t1_1', speaker: 'Mott', text: 'Found something odd today. A card that doesn\'t match any pattern I\'ve seen.' },
    { id: 'mott_t1_2', speaker: 'Mott', text: 'The relics aren\'t just powerful. They\'re pieces of the old world. Before the Pale.' },
  ]},
  { npcId: 'mott', tier: 2, lines: [
    { id: 'mott_t2_1', speaker: 'Mott', text: 'I figured it out. The fragments? They\'re not resources. They\'re memories — compressed.' },
    { id: 'mott_t2_2', speaker: 'Mott', text: 'When you spend fragments, you\'re spending someone\'s past. Heavy, right?' },
  ]},
  { npcId: 'mott', tier: 4, lines: [
    { id: 'mott_t4_1', speaker: 'Mott', text: 'I can\'t sell this one. It\'s... it\'s someone\'s last birthday. The whole day, compressed into a shard.' },
    { id: 'mott_t4_2', speaker: 'Mott', text: 'You ever wonder if we\'re the good guys, Warden? Spending people\'s pasts like pocket change?' },
    { id: 'mott_t4_3', speaker: 'Mott', text: 'Found a fragment today that tasted like rain. Don\'t ask me how I know that. Don\'t ask me why I cried.' },
  ]},

  // ── The Pale Visitor ──
  { npcId: 'pale_visitor', tier: 0, lines: [
    { id: 'pv_t0_1', speaker: '???', text: '...' },
    { id: 'pv_t0_2', speaker: '???', text: 'You can see me. Interesting. Most Wardens take longer.' },
  ]},
  { npcId: 'pale_visitor', tier: 1, lines: [
    { id: 'pv_t1_1', speaker: 'The Visitor', text: 'Do you know why the Keep exists, Warden?' },
    { id: 'pv_t1_2', speaker: 'The Visitor', text: 'Not to fight the Pale. To contain it. There\'s a difference.' },
  ]},
  { npcId: 'pale_visitor', tier: 2, lines: [
    { id: 'pv_t2_1', speaker: 'The Visitor', text: 'I am the Pale. Or I was. The part of it that wanted to stop.' },
    { id: 'pv_t2_2', speaker: 'The Visitor', text: 'Every run you complete, you weaken the whole. But you also feed it.' },
  ]},
  { npcId: 'pale_visitor', tier: 3, lines: [
    { id: 'pv_t3_1', speaker: 'The Visitor', text: 'The Architect built me as a failsafe. I was supposed to shut it all down.' },
    { id: 'pv_t3_2', speaker: 'The Visitor', text: 'But I can\'t. Not alone. That\'s why I need a Warden.' },
  ]},
  { npcId: 'pale_visitor', tier: 4, lines: [
    { id: 'pv_t4_1', speaker: 'The Visitor', text: 'There is a place where the Pale is thin enough to see through. You will know it when the game stops feeling like a game.' },
    { id: 'pv_t4_2', speaker: 'The Visitor', text: 'The Architect left two doors. One leads out. One leads deeper. Both are locked from the inside.' },
    { id: 'pv_t4_3', speaker: 'The Visitor', text: 'You\'re closer than any Warden has been. That\'s not a compliment. It\'s a warning.' },
  ]},
  { npcId: 'pale_visitor', tier: 5, lines: [
    { id: 'pv_t5_1', speaker: '???', text: 'The Pale doesn\'t consume. It remembers. And a memory that remembers itself...' },
    { id: 'pv_t5_2', speaker: '???', text: 'You\'ve seen the Architect\'s journal. You know what they tried to build. Do you understand what they actually built?' },
    { id: 'pv_t5_3', speaker: '???', text: 'The Keep is not a fortress, Warden. It\'s an argument. Against eternity. And you are its latest word.' },
  ]},
];

export function getDialogueForNpc(npcId: string, tier: number): DialogueLine[] {
  const sets = NPC_DIALOGUES.filter((d) => d.npcId === npcId && d.tier <= tier);
  return sets.flatMap((s) => s.lines);
}

export function getUnseenDialogue(npcId: string, tier: number, seenIds: string[]): DialogueLine[] {
  const all = getDialogueForNpc(npcId, tier);
  const seenSet = new Set(seenIds);
  return all.filter((l) => !seenSet.has(l.id));
}
