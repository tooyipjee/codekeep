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
  const choices = [
    `Rest — Heal ${healAmount} Gate HP (${gateHp} → ${Math.min(gateMaxHp, gateHp + healAmount)}/${gateMaxHp})`,
    `Thin — Remove a card from your deck (${deckSize} cards)`,
    `Leave — Continue without resting`,
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">◆ Rest Site</Text>
      <Text> </Text>
      <Text>The campfire crackles against the encroaching Pale.</Text>
      <Text> </Text>
      {choices.map((label, i) => (
        <Text key={i} bold={i === selectedChoice} color={i === selectedChoice ? 'yellow' : 'white'}>
          {i === selectedChoice ? '▶ ' : '  '}{label}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>↑↓ navigate  Enter choose</Text>
    </Box>
  );
}
