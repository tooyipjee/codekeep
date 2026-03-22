import React from 'react';
import { Box, Text } from 'ink';
import type { LoreEntry } from '@codekeep/shared';

interface LoreViewProps {
  entries: LoreEntry[];
  selectedIndex: number;
  viewing: boolean;
}

export function LoreView({ entries, selectedIndex, viewing }: LoreViewProps) {
  if (viewing && entries[selectedIndex]) {
    const entry = entries[selectedIndex];
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="magenta">{entry.title}</Text>
        <Text> </Text>
        <Text>{entry.text}</Text>
        <Text> </Text>
        <Text dimColor>Press Esc to go back.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">◆ Lore Archive ({entries.length} entries)</Text>
      <Text> </Text>
      {entries.length === 0 ? (
        <Text dimColor>No lore discovered yet. Keep exploring.</Text>
      ) : (
        entries.map((entry, i) => (
          <Text key={entry.id} bold={i === selectedIndex} color={i === selectedIndex ? 'yellow' : 'white'}>
            {i === selectedIndex ? '▶ ' : '  '}{entry.title}
          </Text>
        ))
      )}
      <Text> </Text>
      <Text dimColor>↑↓ navigate  Enter read  q back</Text>
    </Box>
  );
}
