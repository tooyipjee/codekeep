import React from 'react';
import { Box, Text } from 'ink';

interface RestViewProps {
  gateHp: number;
  gateMaxHp: number;
  selectedChoice: number;
  deckSize: number;
}

export function RestView({ gateHp, gateMaxHp, selectedChoice, deckSize }: RestViewProps) {
  const healAmount = Math.floor(gateMaxHp * 0.3);
  const healed = Math.min(gateMaxHp, gateHp + healAmount);

  const choices = [
    { label: 'Rest', detail: `Heal ${healAmount} Gate HP (${gateHp} → ${healed}/${gateMaxHp})`, color: 'green' as const },
    { label: 'Thin', detail: `Remove a card from your deck (${deckSize} cards)`, color: 'cyan' as const },
    { label: 'Leave', detail: 'Continue without resting', color: 'white' as const },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">{'◆ Rest Site'}</Text>
      <Text dimColor>{'─'.repeat(36)}</Text>
      <Text> </Text>
      <Text dimColor italic>The campfire crackles against the encroaching Pale.</Text>
      <Text dimColor italic>A moment of warmth in the endless grey.</Text>
      <Text> </Text>
      {choices.map(({ label, detail, color }, i) => {
        const selected = i === selectedChoice;
        return (
          <Box key={i} flexDirection="column">
            <Text>
              <Text bold={selected} color={selected ? 'yellow' : 'white'}>
                {selected ? ' ▶ ' : '   '}
              </Text>
              <Text color={selected ? color : 'white'} bold={selected}>{label}</Text>
            </Text>
            {selected && <Text dimColor>{'      '}{detail}</Text>}
          </Box>
        );
      })}
      <Text> </Text>
      <Text dimColor>{'↑↓ navigate  Enter choose'}</Text>
    </Box>
  );
}
