import React from 'react';
import { Box, Text } from 'ink';
import type { CardInstance } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';

interface CardHandProps {
  hand: CardInstance[];
  selectedIndex: number;
  resolve: number;
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'uncommon': return 'green';
    case 'rare': return 'blue';
    case 'legendary': return 'magenta';
    default: return 'white';
  }
}

function categorySymbol(category: string): string {
  switch (category) {
    case 'armament': return '⚔';
    case 'fortification': return '◇';
    case 'edict': return '✦';
    case 'wild': return '◈';
    default: return '·';
  }
}

export function CardHand({ hand, selectedIndex, resolve }: CardHandProps) {
  if (hand.length === 0) {
    return <Text dimColor>No cards in hand.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>Hand:</Text>
      {hand.map((card, i) => {
        const def = getCardDef(card.defId);
        if (!def) return null;
        const isSelected = i === selectedIndex;
        const canAfford = def.cost <= resolve;
        const prefix = isSelected ? '▶ ' : '  ';
        const num = `${i + 1}`;
        const costStr = `[${def.cost}]`;

        return (
          <Text key={card.instanceId}>
            <Text bold={isSelected} color={isSelected ? 'yellow' : undefined}>
              {prefix}{num}.{' '}
            </Text>
            <Text color={canAfford ? rarityColor(def.rarity) : 'gray'} bold={isSelected}>
              {categorySymbol(def.category)} {def.name} {costStr}
            </Text>
            <Text dimColor> — {isSelected ? def.description : (def.description.length > 35 ? def.description.slice(0, 35) + '…' : def.description)}</Text>
          </Text>
        );
      })}
    </Box>
  );
}
