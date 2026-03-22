import React from 'react';
import { Box, Text } from 'ink';
import type { GameEvent } from '@codekeep/server';

interface EventViewProps {
  event: GameEvent;
  selectedChoice: number;
}

export function EventView({ event, selectedChoice }: EventViewProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">◆ {event.name}</Text>
      <Text> </Text>
      <Text>{event.description}</Text>
      <Text> </Text>
      {event.choices.map((choice, i) => (
        <Text key={i} bold={i === selectedChoice} color={i === selectedChoice ? 'yellow' : 'white'}>
          {i === selectedChoice ? '▶ ' : '  '}{i + 1}. {choice.label}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>↑↓ navigate  Enter choose</Text>
    </Box>
  );
}
