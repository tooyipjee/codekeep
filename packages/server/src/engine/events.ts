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
  | { type: 'upgrade_random' }
  | { type: 'remove_card' }
  | { type: 'max_hp'; value: number }
  | { type: 'nothing' };

const ACT1_EVENTS: GameEvent[] = [
  {
    id: 'wandering_smith',
    name: 'The Wandering Smith',
    description: 'A cloaked figure sits by a forge that shouldn\'t exist this far into the Pale. They offer to work on your defenses.',
    choices: [
      { label: 'Pay 30 fragments to upgrade a random card.', effect: { type: 'upgrade_random' } },
      { label: 'Ask for supplies. (Gain 15 fragments)', effect: { type: 'fragments', value: 15 } },
      { label: 'Leave them be.', effect: { type: 'nothing' } },
    ],
  },
  {
    id: 'pale_fountain',
    name: 'The Pale Fountain',
    description: 'A spring of luminous water bubbles from cracked stone. Its glow is unsettling but beckons.',
    choices: [
      { label: 'Drink deeply. (Heal 20 HP, gain 10 max HP)', effect: { type: 'heal', value: 20 } },
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
      { label: 'Be careful — trap? (Gain 15 fragments, take 5 damage)', effect: { type: 'fragments', value: 15 } },
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
      { label: 'Buy a rare card. (Pay 40 fragments)', effect: { type: 'card_reward' } },
      { label: 'Trade health for power. (Lose 10 HP, gain a card)', effect: { type: 'damage', value: 10 } },
      { label: 'Walk away.', effect: { type: 'nothing' } },
    ],
  },
];

export function pickEvent(act: number, rng: () => number): GameEvent {
  const pool = ACT1_EVENTS;
  return pool[Math.floor(rng() * pool.length)];
}

export function getAllEvents(): GameEvent[] {
  return [...ACT1_EVENTS];
}
