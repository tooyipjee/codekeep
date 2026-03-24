import React from 'react';
import { Box, Text } from 'ink';

interface TutorialViewProps {
  page: number;
  totalPages: number;
  source?: 'new_game' | 'menu' | 'settings';
}

const TUTORIAL_PAGES = [
  {
    title: 'Welcome to CodeKeep',
    lines: [
      'You are the Warden of the Keep — the last fortress',
      'standing against the Pale, an erasure that consumes all.',
      '',
      'Your goal: survive 3 Acts of increasingly dangerous',
      'enemies by playing cards and building defenses.',
    ],
  },
  {
    title: 'The Gate',
    lines: [
      'Your Gate is your lifeline. It has HP (hit points).',
      'If Gate HP reaches 0, your run is over.',
      '',
      '  ◆ Gate ████████████░░░░░░░░ 70/70',
      '',
      'Enemies advance toward the Gate. When they reach it,',
      'they deal damage. Block reduces incoming damage.',
    ],
  },
  {
    title: 'Combat Basics',
    lines: [
      'Each turn you gain 3 Resolve (mana) to play cards.',
      'Unspent Resolve carries over (up to 6 max). Your hand refreshes each turn.',
      '',
      '  1-5 .... Select a card from your hand',
      '  ←→  .... Choose target column',
      '  Enter .. Play the selected card',
      '  Space .. End your turn',
      '  i ...... Inspect an enemy',
    ],
  },
  {
    title: 'The 5-Column Grid',
    lines: [
      'The battlefield has 5 columns. Enemies spawn at the top',
      'and advance downward toward your Gate at the bottom.',
      '',
      '  ┌──Col 1──┬──Col 2──┬──Col 3──┐',
      '  │  ☠18    │    ·    │  ↑10    │',
      '  └─────────┴─────────┴─────────┘',
      '  ◆ Gate ████████████ 70/70',
    ],
  },
  {
    title: 'Enemy Intents',
    lines: [
      'Enemies show what they plan to do next turn:',
      '',
      '  ↓N .. Advance N rows toward the Gate',
      '  ⚔N .. Attack the Gate for N damage',
      '  ▲N .. Buff themselves',
      '  ◈N .. Shield nearby enemies',
      '  +N .. Summon new enemies',
      '',
      'Read intents to plan your plays wisely!',
    ],
  },
  {
    title: 'Emplacements',
    lines: [
      'Some cards have dual use — cast OR emplace.',
      '',
      '  Cast:    Immediate effect (damage, block, etc.)',
      '  Emplace: Place as a structure in a column.',
      '           Triggers automatically every turn!',
      '',
      'Press e to toggle emplace mode, pick a column,',
      'then press Enter to place it.',
    ],
  },
  {
    title: 'Status Effects',
    lines: [
      '  V Vulnerable ... +25% damage taken per stack',
      '  W Weak ......... -15% damage dealt per stack',
      '  B Burn ......... Takes damage each turn, decays',
      '  F Fortified .... -15% damage taken per stack',
      '  E Empowered .... +25% damage dealt per stack',
      '',
      'Effects stack: 2x Vulnerable = +50% damage taken.',
    ],
  },
  {
    title: 'The Map',
    lines: [
      '  ⚔ Combat ... Standard enemy encounter',
      '  ★ Elite .... Harder fight, better rewards',
      '  △ Rest ..... Heal or remove a card',
      '  $ Shop ..... Buy cards, potions, remove cards',
      '  ? Event .... Story encounters with choices',
      '  ◆ Boss ..... Act boss — defeat to advance',
      '',
      'Choose your path wisely. Elites are risky but rewarding.',
    ],
  },
  {
    title: 'The Keep',
    lines: [
      'After each run, you earn Echoes based on performance.',
      'Explore the Keep to:',
      '',
      '  ◆ Upgrade structures (bonuses for future runs)',
      '  ◆ Talk to NPCs (unlock story and lore)',
      '  ◆ Increase Ascension (harder + new modifiers)',
      '',
      'The Keep remembers. Each run makes you stronger.',
    ],
  },
  {
    title: 'Ready to Play!',
    lines: [
      '  1-5 = card    ←→ = column    Enter = play',
      '  Space = end    e = emplace    p = potion',
      '  i = inspect    d = deck       q = menu',
      '',
      'The Pale awaits, Warden. Defend the Keep.',
      '',
      'Press Enter to begin.',
    ],
  },
];

function progressBar(current: number, total: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round((current / total) * width)));
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

export function TutorialView({ page, totalPages, source = 'new_game' }: TutorialViewProps) {
  const content = TUTORIAL_PAGES[page];
  if (!content) return null;

  const isLast = page >= totalPages - 1;
  const lastPageAction = source === 'new_game' ? 'Enter begin' : 'Enter return';

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Tutorial — '}{content.title}</Text>
      <Text dimColor>{'─'.repeat(44)}</Text>
      <Text> </Text>
      {content.lines.map((line, i) => {
        if (isLast && line === 'Press Enter to begin.' && source !== 'new_game') {
          return <Text key={i}>Press Enter to return.</Text>;
        }
        return <Text key={i}>{line || ' '}</Text>;
      })}
      <Text> </Text>
      <Text dimColor>{'─'.repeat(44)}</Text>
      <Box>
        <Text dimColor>{progressBar(page + 1, totalPages, 20)} {page + 1}/{totalPages}  </Text>
        <Text dimColor>
          {isLast
            ? `← prev  ${lastPageAction}  q close`
            : '← prev  → next  q close'}
        </Text>
      </Box>
    </Box>
  );
}

export const TUTORIAL_PAGE_COUNT = TUTORIAL_PAGES.length;
