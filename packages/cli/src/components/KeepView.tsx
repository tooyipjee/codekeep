import React from 'react';
import { Box, Text } from 'ink';
import type { KeepState } from '@codekeep/shared';
import { KEEP_STRUCTURES, getStructureLevel } from '@codekeep/server';

interface KeepViewProps {
  keep: KeepState;
  selectedIndex: number;
}

const NPC_NAMES: Record<string, string> = {
  wren: 'Wren, the Steward',
  sable: 'Sable, the Archivist',
  duskmar: 'Duskmar, First Wall',
  mott: 'Mott, the Salvager',
  pale_visitor: 'The Pale Visitor',
};

export function KeepView({ keep, selectedIndex }: KeepViewProps) {
  const items = [
    ...KEEP_STRUCTURES.map((s) => {
      const level = getStructureLevel(keep, s.id);
      return { type: 'structure' as const, id: s.id, label: `${s.name} (Lv.${level}/${s.maxLevel}) — ${s.description}` };
    }),
    ...keep.npcs.map((npc) => ({
      type: 'npc' as const, id: npc.id,
      label: `${NPC_NAMES[npc.id] ?? npc.id} (Tier ${npc.tier}/5)`,
    })),
    { type: 'action' as const, id: 'new_run', label: 'Begin New Run' },
    { type: 'action' as const, id: 'ascension', label: `Ascension Level: ${keep.highestAscension}` },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">◆ The Keep</Text>
      <Text>Echoes: <Text bold color="cyan">{keep.echoes}</Text>  |  Runs: {keep.totalRuns}  |  Wins: {keep.totalWins}</Text>
      <Text> </Text>
      {items.map((item, i) => (
        <Text key={item.id} bold={i === selectedIndex} color={i === selectedIndex ? 'yellow' : 'white'}>
          {i === selectedIndex ? '▶ ' : '  '}{item.label}
        </Text>
      ))}
      <Text> </Text>
      <Text dimColor>↑↓ navigate  Enter select  q quit</Text>
    </Box>
  );
}
