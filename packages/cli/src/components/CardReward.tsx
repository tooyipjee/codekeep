import React from 'react';
import { Box, Text } from 'ink';
import type { CardDef } from '@codekeep/shared';

interface CardRewardProps {
  cards: CardDef[];
  selectedIndex: number;
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'uncommon': return 'green';
    case 'rare': return 'blue';
    case 'legendary': return 'magenta';
    default: return 'white';
  }
}

export function CardReward({ cards, selectedIndex }: CardRewardProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Choose a Card Reward'}</Text>
      <Text> </Text>
      {cards.map((card, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={card.id} flexDirection="column" marginBottom={1}>
            <Text bold={isSelected} color={isSelected ? 'yellow' : rarityColor(card.rarity)}>
              {isSelected ? '▶ ' : '  '}{i + 1}. {card.name} [{card.cost}] ({card.rarity})
            </Text>
            <Text dimColor>     {card.description}</Text>
          </Box>
        );
      })}
      <Text> </Text>
      <Text dimColor>
        {selectedIndex >= 0
          ? `  ${cards.length + 1}. Skip — take no card`
          : `▶ ${cards.length + 1}. Skip — take no card`}
      </Text>
      <Text> </Text>
      <Text dimColor>↑↓ navigate  Enter select  s skip</Text>
    </Box>
  );
}
