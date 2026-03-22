import React from 'react';
import { Box, Text } from 'ink';
import type { ShopItem } from '@codekeep/server';

interface ShopViewProps {
  items: ShopItem[];
  selectedIndex: number;
  fragments: number;
}

export function ShopView({ items, selectedIndex, fragments }: ShopViewProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">◆ Shop — {fragments} fragments</Text>
      <Text> </Text>
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        const canAfford = fragments >= item.cost;
        let label = '';
        if (item.type === 'card' && item.cardDef) {
          label = `${item.cardDef.name} (${item.cardDef.rarity}) — ${item.cardDef.description}`;
        } else if (item.type === 'potion' && item.potionDef) {
          label = `${item.potionDef.name} — ${item.potionDef.description}`;
        } else if (item.type === 'card_remove') {
          label = 'Remove a card from your deck';
        }
        return (
          <Text key={i} bold={isSelected} color={isSelected ? 'yellow' : canAfford ? 'white' : 'gray'}>
            {isSelected ? '▶ ' : '  '}{label}  [{item.cost}f]
          </Text>
        );
      })}
      <Text> </Text>
      <Text dimColor>↑↓ navigate  Enter buy  q leave</Text>
    </Box>
  );
}
