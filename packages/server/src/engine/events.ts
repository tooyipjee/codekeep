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
      { label: 'Take only what you need. (Heal 10 HP, gain 10 fragments)', effect: { type: 'heal', value: 10 } },
      { label: 'Leave it for the next warden.', effect: { type: 'nothing' } },
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
    description: 'A ghostly figure in warden\'s garb appears. "I held this keep once. Take what remains of my strength."',
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

export function pickEvent(act: number, rng: () => number): GameEvent {
  let pool: GameEvent[];
  switch (act) {
    case 2: pool = ACT2_EVENTS; break;
    case 3: pool = ACT3_EVENTS; break;
    default: pool = ACT1_EVENTS; break;
  }
  return pool[Math.floor(rng() * pool.length)];
}

export function getAllEvents(): GameEvent[] {
  return [...ACT1_EVENTS, ...ACT2_EVENTS, ...ACT3_EVENTS];
}
