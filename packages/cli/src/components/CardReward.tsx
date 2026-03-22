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

function rarityLabel(rarity: string): string {
  switch (rarity) {
    case 'uncommon': return '◇ uncommon';
    case 'rare': return '◆ rare';
    case 'legendary': return '★ legendary';
    default: return '· common';
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

export function CardReward({ cards, selectedIndex }: CardRewardProps) {
  const skipSelected = selectedIndex >= cards.length;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Card Reward'}</Text>
      <Text dimColor>{'─'.repeat(36)}</Text>
      <Text dimColor italic>{'Choose a card to add to your deck.'}</Text>
      <Text> </Text>
      {cards.map((card, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={card.id} flexDirection="column" marginBottom={0}>
            <Text>
              <Text bold={isSelected} color={isSelected ? 'yellow' : 'white'}>
                {isSelected ? ' ▶ ' : '   '}
              </Text>
              <Text color={rarityColor(card.rarity)} bold={isSelected}>
                {categorySymbol(card.category)} {card.name}
              </Text>
              <Text dimColor>{' '}[{card.cost}]{' '}</Text>
              <Text color={rarityColor(card.rarity)} dimColor>{rarityLabel(card.rarity)}</Text>
            </Text>
            {isSelected && <Text dimColor>{'      '}{card.description}</Text>}
          </Box>
        );
      })}
      <Text> </Text>
      <Text bold={skipSelected} color={skipSelected ? 'yellow' : 'white'}>
        {skipSelected ? ' ▶ ' : '   '}Skip
      </Text>
      <Text> </Text>
      <Text dimColor>{'↑↓ navigate  Enter select  s skip'}</Text>
    </Box>
  );
}
