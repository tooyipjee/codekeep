import React from 'react';
import { Box, Text } from 'ink';

interface TutorialViewProps {
  page: number;
  totalPages: number;
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
      'Gate HP:  ██████████░░ 70/70',
      '',
      'Enemies advance toward the Gate. When they reach it,',
      'they deal damage. Block reduces incoming damage.',
    ],
  },
  {
    title: 'Combat Basics',
    lines: [
      'Each turn you have 3 Resolve (mana) to play cards.',
      'Cards cost 0-4 Resolve. Your hand refreshes each turn.',
      '',
      'Controls:',
      '  1-5    Select a card from your hand',
      '  ←→     Choose target column',
      '  Enter  Play the selected card',
      '  Space  End your turn',
      '  i      Inspect an enemy',
    ],
  },
  {
    title: 'The 5-Column Grid',
    lines: [
      'The battlefield has 5 columns. Enemies spawn at the top',
      'and advance downward toward your Gate at the bottom.',
      '',
      '  Col 1 │ Col 2 │ Col 3 │ Col 4 │ Col 5',
      '  ──────│───────│───────│───────│──────',
      '  ☠18   │   ·   │ ↑10   │   ·   │   ·',
      '  ══════════════════════════════════════',
      '  Gate ██████████ 70/70',
    ],
  },
  {
    title: 'Enemy Intents',
    lines: [
      'Enemies show what they plan to do next turn:',
      '',
      '  ↓N  Advance N rows toward the Gate',
      '  ⚔N  Attack the Gate for N damage',
      '  ▲N  Buff themselves',
      '  ◈N  Shield nearby enemies',
      '  +N  Summon new enemies',
      '',
      'Read intents to plan your plays wisely!',
    ],
  },
  {
    title: 'Emplacements',
    lines: [
      'Some cards have dual use — cast OR emplace.',
      '',
      'Cast:    Immediate effect (damage, block, etc.)',
      'Emplace: Place as a structure in a column.',
      '         Structures trigger every turn automatically!',
      '',
      'To emplace: select the card, press e to toggle',
      'emplace mode, choose a column, press Enter.',
    ],
  },
  {
    title: 'Status Effects',
    lines: [
      'V = Vulnerable  Takes +25% damage per stack',
      'W = Weak         Deals -15% damage per stack',
      'B = Burn         Takes damage each turn, decays',
      'F = Fortified    Takes -15% damage per stack',
      'E = Empowered    Deals +25% damage per stack',
      '',
      'Stack-based: 2x Vulnerable = +50% damage taken.',
    ],
  },
  {
    title: 'The Map & Node Types',
    lines: [
      '⚔ Combat    Standard enemy encounter',
      '★ Elite     Harder fight, better rewards',
      '△ Rest      Heal or remove a card',
      '$ Shop      Buy cards, potions, remove cards',
      '? Event     Story encounters with choices',
      '◆ Boss      Act boss — defeat to advance',
      '',
      'Choose your path wisely. Elites are risky but rewarding.',
    ],
  },
  {
    title: 'The Keep & Meta-Progression',
    lines: [
      'After each run, you earn Echoes based on performance.',
      'Spend Echoes at The Keep to:',
      '',
      '  ◆ Upgrade structures (bonuses for future runs)',
      '  ◆ Talk to NPCs (unlock story and lore)',
      '  ◆ Increase Ascension (harder difficulty, new modifiers)',
      '',
      'The Keep remembers. Each run makes you stronger.',
    ],
  },
  {
    title: 'Ready to Play!',
    lines: [
      'Quick reference:',
      '  1-5 = select card    ←→ = target column',
      '  Enter = play card    Space = end turn',
      '  e = emplace toggle   p = use potion',
      '  i = inspect enemy    d = view deck',
      '  q = quit to menu',
      '',
      'The Pale awaits, Warden. Defend the Keep.',
      '',
      'Press Enter to begin.',
    ],
  },
];

export function TutorialView({ page, totalPages }: TutorialViewProps) {
  const content = TUTORIAL_PAGES[page];
  if (!content) return null;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">◆ Tutorial — {content.title} ({page + 1}/{totalPages})</Text>
      <Text> </Text>
      {content.lines.map((line, i) => (
        <Text key={i}>{line || ' '}</Text>
      ))}
      <Text> </Text>
      <Text dimColor>
        {page < totalPages - 1
          ? '← prev  → next  Enter skip to game  q close'
          : '← prev  Enter start game  q close'}
      </Text>
    </Box>
  );
}

export const TUTORIAL_PAGE_COUNT = TUTORIAL_PAGES.length;
