import React from 'react';
import { Box, Text } from 'ink';
import type { ShopItem } from '@codekeep/server';

interface ShopViewProps {
  items: ShopItem[];
  selectedIndex: number;
  fragments: number;
  message?: string;
}

export function ShopView({ items, selectedIndex, fragments, message }: ShopViewProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">◆ Shop — {fragments} fragments</Text>
      <Text dimColor>{'─'.repeat(36)}</Text>
      <Text> </Text>
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        const canAfford = fragments >= item.cost;
        let label = '';
        let typeTag = '';
        if (item.type === 'card' && item.cardDef) {
          typeTag = '[Card]';
          label = `${item.cardDef.name} (${item.cardDef.rarity}) — ${item.cardDef.description}`;
        } else if (item.type === 'potion' && item.potionDef) {
          typeTag = '[Potion]';
          label = `${item.potionDef.name} — ${item.potionDef.description}`;
        } else if (item.type === 'card_remove') {
          typeTag = '[Service]';
          label = 'Remove a card from your deck';
        }
        return (
          <Text key={i} bold={isSelected} color={isSelected ? 'yellow' : canAfford ? 'white' : 'gray'}>
            {isSelected ? '▶ ' : '  '}{typeTag} {label}  [{item.cost}f]
          </Text>
        );
      })}
      {items.length === 0 && <Text dimColor>{'  (Shop is empty)'}</Text>}
      <Text> </Text>
      {message && <Text color={message.startsWith('Purchased') ? 'green' : 'red'}>{message}</Text>}
      <Text dimColor>↑↓ navigate  Enter buy  q leave</Text>
    </Box>
  );
}
