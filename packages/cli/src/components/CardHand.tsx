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

function costPips(cost: number, resolve: number): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < cost; i++) {
    nodes.push(
      <Text key={i} color={i < resolve ? 'cyan' : 'red'} bold>{'◆'}</Text>
    );
  }
  return nodes;
}

export function CardHand({ hand, selectedIndex, resolve }: CardHandProps) {
  if (hand.length === 0) {
    return <Text dimColor>{'  '}No cards in hand.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>{'─── Hand (' + hand.length + ') ───'}</Text>
      {hand.map((card, i) => {
        const def = getCardDef(card.defId);
        if (!def) return null;
        const isSelected = i === selectedIndex;
        const canAfford = def.cost <= resolve;

        return (
          <Box key={card.instanceId} flexDirection="column">
            <Text>
              <Text bold={isSelected} color={isSelected ? 'yellow' : 'white'}>
                {isSelected ? ' ▶ ' : '   '}
              </Text>
              <Text color={canAfford ? rarityColor(def.rarity) : 'gray'} bold={isSelected}>
                {categorySymbol(def.category)} {def.name}
              </Text>
              <Text> </Text>
              {costPips(def.cost, resolve)}
              {isSelected && def.type === 'emplace' && <Text color="cyan">{' '}[emplaceable]</Text>}
            </Text>
            {isSelected && (
              <Text dimColor>{'      '}{def.description}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
