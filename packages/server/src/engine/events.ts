export interface GameEvent {
  id: string;
  name: string;
  description: string;
  choices: EventChoice[];
}

export interface EventChoice {
  label: string;
  effect: EventEffect;
}

export type EventEffect =
  | { type: 'heal'; value: number }
  | { type: 'damage'; value: number }
  | { type: 'fragments'; value: number }
  | { type: 'card_reward' }
  | { type: 'remove_card' }
  | { type: 'max_hp'; value: number }
  | { type: 'nothing' };

const ACT1_EVENTS: GameEvent[] = [
  {
    id: 'wandering_smith',
    name: 'The Wandering Smith',
    description: 'A cloaked figure sits by a forge that shouldn\'t exist this far into the Pale. They offer to work on your defenses.',
    choices: [
      { label: 'Ask them to reinforce the gate. (Heal 15 HP)', effect: { type: 'heal', value: 15 } },
      { label: 'Ask for supplies. (Gain 15 fragments)', effect: { type: 'fragments', value: 15 } },
      { label: 'Leave them be.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'pale_fountain',
    name: 'The Pale Fountain',
    description: 'A spring of luminous water bubbles from cracked stone. Its glow is unsettling but beckons.',
    choices: [
      { label: 'Drink deeply. (+10 max Gate HP)', effect: { type: 'max_hp', value: 10 } },
      { label: 'Fill a flask. (Gain a random card)', effect: { type: 'card_reward' } },
      { label: 'Leave. The Pale gives nothing freely.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'abandoned_cache',
    name: 'Abandoned Cache',
    description: 'You find a sealed chest among the rubble of a collapsed watchtower.',
    choices: [
      { label: 'Pry it open. (Gain 25 fragments)', effect: { type: 'fragments', value: 25 } },
      { label: 'Smash it quickly. (Gain 10 fragments)', effect: { type: 'fragments', value: 10 } },
      { label: 'Leave it. Could be cursed.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'old_veteran',
    name: 'The Old Veteran',
    description: 'A scarred soldier leans against the wall. "I\'ve seen the Pale take stronger keeps than yours," they say.',
    choices: [
      { label: '"Teach me." (Remove a card from your deck)', effect: { type: 'remove_card' } },
      { label: '"Give me your supplies." (Gain 20 fragments)', effect: { type: 'fragments', value: 20 } },
      { label: '"Good luck." (Nothing happens)', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'strange_merchant',
    name: 'Strange Merchant',
    description: 'A merchant with too many eyes offers wares from a floating pack.',
    choices: [
      { label: 'Browse their cards. (Gain a card)', effect: { type: 'card_reward' } },
      { label: 'Sell your blood. (Lose 10 HP, gain 30 fragments)', effect: { type: 'damage', value: 10 } },
      { label: 'Walk away.', effect: { type: 'nothing' } },
    ],
  },
];

const ACT2_EVENTS: GameEvent[] = [
  {
    id: 'pale_scholar',
    name: 'The Pale Scholar',
    description: 'An ancient figure pores over a tome that seems to read itself. "The Pale remembers everything," they whisper.',
    choices: [
      { label: 'Ask for knowledge. (Gain a card)', effect: { type: 'card_reward' } },
      { label: 'Ask for healing. (Heal 20 HP)', effect: { type: 'heal', value: 20 } },
      { label: 'Back away slowly.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'fractured_mirror',
    name: 'The Fractured Mirror',
    description: 'A mirror stands in the corridor, cracked but gleaming. Your reflection looks stronger than you feel.',
    choices: [
      { label: 'Reach through. (+5 max Gate HP, lose 5 HP)', effect: { type: 'max_hp', value: 5 } },
      { label: 'Smash it. (Gain 20 fragments)', effect: { type: 'fragments', value: 20 } },
      { label: 'Walk past. Mirrors lie.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'deserters_cache',
    name: "Deserter's Cache",
    description: 'Behind a collapsed wall, you find supplies left by someone who fled the Keep long ago.',
    choices: [
      { label: 'Take everything. (Gain 30 fragments)', effect: { type: 'fragments', value: 30 } },
      { label: 'Take only what you need. (Gain 10 fragments)', effect: { type: 'fragments', value: 10 } },
      { label: 'Leave it for the next Warden.', effect: { type: 'nothing' } },
    ],
  },
];

const ACT1_EVENTS_CRACKS: GameEvent[] = [
  {
    id: 'wandering_smith_cracks',
    name: 'The Wandering Smith',
    description: "The smith again. You've seen this forge before — the same cracks in the stone, the same angle of the cloak. They look up and for the first time, you notice their hands are shaking.",
    choices: [
      { label: '"How long have you been here?" (Heal 15 HP)', effect: { type: 'heal', value: 15 } },
      { label: '"You\'re not real, are you." (Gain 20 fragments)', effect: { type: 'fragments', value: 20 } },
      { label: 'Say nothing. The kindness is worse than the lie.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'the_echoing_child',
    name: 'The Echoing Child',
    description: "A child sits in the corridor, humming. They look up with eyes that glow faintly. \"I remember my house,\" they say. \"Can you take me there?\" The house is gone. You know this.",
    choices: [
      { label: '"I\'ll try." (Lose 15 HP — the detour is dangerous)', effect: { type: 'damage', value: 15 } },
      { label: '"There\'s nothing to go back to." (Gain 10 fragments — they dissolve)', effect: { type: 'fragments', value: 10 } },
      { label: '"Stay here. The Keep is safe."', effect: { type: 'nothing' } },
    ],
  },
];

const ACT2_EVENTS_CRACKS: GameEvent[] = [
  {
    id: 'motts_stash',
    name: "Mott's Hidden Stash",
    description: "\"DON'T TELL MOTT,\" reads the note pinned to a crate. It's Mott's handwriting.",
    choices: [
      { label: 'Open it. (Gain 25 fragments)', effect: { type: 'fragments', value: 25 } },
      { label: 'Leave it. Mott knows things you don\'t.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'wardens_echo',
    name: "A Warden's Echo",
    description: "You find scratches on the wall. Tallies. Hundreds of them. Below, in faded ink: \"Run 847. The Pale is not the enemy. The Pale is the answer to a question we forgot.\"",
    choices: [
      { label: 'Study the scratches. (Gain a card)', effect: { type: 'card_reward' } },
      { label: 'Cover them. Some knowledge is dangerous. (Gain 15 fragments)', effect: { type: 'fragments', value: 15 } },
      { label: 'Add your own tally mark.', effect: { type: 'nothing' } },
    ],
  },
];

const ACT3_EVENTS_TRUTH: GameEvent[] = [
  {
    id: 'the_architects_choice',
    name: "The Architect's Choice",
    description: "A door that shouldn't exist. Beyond it, a room you've seen in dreams. A desk. A journal. A pen that still has ink. The Architect's final workspace.",
    choices: [
      { label: 'Read the journal. (+15 max Gate HP)', effect: { type: 'max_hp', value: 15 } },
      { label: 'Destroy the journal. (Gain 40 fragments)', effect: { type: 'fragments', value: 40 } },
      { label: 'Sit down. Pick up the pen.', effect: { type: 'nothing' } },
    ],
  },
];

const ACT3_EVENTS: GameEvent[] = [
  {
    id: 'the_last_wall',
    name: 'The Last Wall',
    description: 'The final barrier before the Pale\'s heart. Ancient wards still flicker across its surface.',
    choices: [
      { label: 'Channel the wards. (+15 max Gate HP)', effect: { type: 'max_hp', value: 15 } },
      { label: 'Break through quickly. (Gain 20 fragments)', effect: { type: 'fragments', value: 20 } },
      { label: 'Let it stand. Its purpose is not yours.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'echo_of_a_warden',
    name: 'Echo of a Warden',
    description: 'A ghostly figure in Warden\'s garb appears. "I held this Keep once. Take what remains of my strength."',
    choices: [
      { label: 'Accept their gift. (Gain a card, lose 5 HP)', effect: { type: 'card_reward' } },
      { label: 'Ask them to strengthen the gate. (Heal 25 HP)', effect: { type: 'heal', value: 25 } },
      { label: '"Rest now, Warden."', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'pale_bargain',
    name: 'The Pale Bargain',
    description: 'The void itself speaks: "Give me something, and I will give you power."',
    choices: [
      { label: 'Sacrifice a card. (Remove a card)', effect: { type: 'remove_card' } },
      { label: 'Sacrifice blood. (Lose 15 HP, gain 40 fragments)', effect: { type: 'damage', value: 15 } },
      { label: '"I make no deals with the void."', effect: { type: 'nothing' } },
    ],
  },
];

export function pickEvent(act: number, rng: () => number, storyLayer?: string): GameEvent {
  let pool: GameEvent[];
  switch (act) {
    case 2: pool = ACT2_EVENTS; break;
    case 3: pool = ACT3_EVENTS; break;
    default: pool = ACT1_EVENTS; break;
  }

  const isCracksOrAbove = storyLayer === 'cracks' || storyLayer === 'truth' || storyLayer === 'true_ending';
  const isTruthOrAbove = storyLayer === 'truth' || storyLayer === 'true_ending';

  if (isTruthOrAbove && act === 3 && ACT3_EVENTS_TRUTH.length > 0 && rng() < 0.4) {
    return ACT3_EVENTS_TRUTH[Math.floor(rng() * ACT3_EVENTS_TRUTH.length)];
  }

  if (isCracksOrAbove) {
    let cracksPool: GameEvent[] | null = null;
    if (act === 1) cracksPool = ACT1_EVENTS_CRACKS;
    else if (act === 2) cracksPool = ACT2_EVENTS_CRACKS;

    if (cracksPool && cracksPool.length > 0 && rng() < 0.4) {
      return cracksPool[Math.floor(rng() * cracksPool.length)];
    }
  }

  return pool[Math.floor(rng() * pool.length)];
}

export function getAllEvents(): GameEvent[] {
  return [...ACT1_EVENTS, ...ACT2_EVENTS, ...ACT3_EVENTS, ...ACT1_EVENTS_CRACKS, ...ACT2_EVENTS_CRACKS, ...ACT3_EVENTS_TRUTH];
}
