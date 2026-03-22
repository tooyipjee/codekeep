import React from 'react';
import { Box, Text } from 'ink';
import type { CardInstance } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';

interface DeckViewProps {
  deck: CardInstance[];
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'uncommon': return 'green';
    case 'rare': return 'blue';
    case 'legendary': return 'magenta';
    default: return 'white';
  }
}

export function DeckView({ deck }: DeckViewProps) {
  const counts = new Map<string, number>();
  for (const card of deck) {
    counts.set(card.defId, (counts.get(card.defId) ?? 0) + 1);
  }

  const sorted = [...counts.entries()]
    .map(([defId, count]) => ({ def: getCardDef(defId)!, count }))
    .filter((e) => e.def)
    .sort((a, b) => {
      const rarityOrder = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
      const ra = rarityOrder[a.def.rarity] ?? 0;
      const rb = rarityOrder[b.def.rarity] ?? 0;
      if (ra !== rb) return ra - rb;
      return a.def.name.localeCompare(b.def.name);
    });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Your Deck'} ({deck.length} cards)</Text>
      <Text> </Text>
      {sorted.map(({ def, count }) => (
        <Text key={def.id} color={rarityColor(def.rarity)}>
          {count > 1 ? `${count}x ` : '   '}{def.name} [{def.cost}] — {def.description}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>Press q or Esc to go back.</Text>
    </Box>
  );
}
