import React from 'react';
import { Box, Text } from 'ink';
import type { Resources, StructureKind, PlacedStructure } from '@codekeep/shared';
import { STRUCTURE_NAMES, STRUCTURE_COSTS, RESOURCE_ICONS } from '@codekeep/shared';

interface HUDProps {
  resources: Resources;
  selectedStructure: StructureKind;
  message: string;
  compact?: boolean;
  structureAtCursor?: PlacedStructure | null;
  fragmentCount?: number;
}

const COMPACT_NAMES: Record<StructureKind, string> = {
  wall: 'WL',
  trap: 'TR',
  treasury: 'TY',
  ward: 'WD',
  watchtower: 'WT',
  archerTower: 'AT',
};

function formatCost(cost: Resources): string {
  const parts: string[] = [];
  if (cost.gold > 0) parts.push(`${RESOURCE_ICONS.gold}${cost.gold}`);
  if (cost.wood > 0) parts.push(`${RESOURCE_ICONS.wood}${cost.wood}`);
  if (cost.stone > 0) parts.push(`${RESOURCE_ICONS.stone}${cost.stone}`);
  return parts.join(' ');
}

export function HUD({ resources, selectedStructure, message, compact, structureAtCursor, fragmentCount = 0 }: HUDProps) {
  if (compact) {
    const name = COMPACT_NAMES[selectedStructure];
    return (
      <Box flexDirection="column" marginBottom={0}>
        <Text>
          <Text bold color="yellow">{'◆'}</Text>
          <Text dimColor>{' │ '}</Text>
          <Text color="yellow">{RESOURCE_ICONS.gold}{resources.gold}</Text>
          <Text> </Text>
          <Text color="green">{RESOURCE_ICONS.wood}{resources.wood}</Text>
          <Text> </Text>
          <Text color="white">{RESOURCE_ICONS.stone}{resources.stone}</Text>
          <Text dimColor>{' │ '}</Text>
          <Text bold>{name}</Text>
          {message ? <Text dimColor>{' │ '}</Text> : null}
          {message ? <Text color={message.startsWith('!') ? 'red' : 'yellow'}>{message}</Text> : null}
        </Text>
      </Box>
    );
  }

  const cursorInfo = structureAtCursor
    ? `${STRUCTURE_NAMES[structureAtCursor.kind]} Lv.${structureAtCursor.level}` +
      (structureAtCursor.level < 3
        ? ` → Lv.${structureAtCursor.level + 1}: ${formatCost(STRUCTURE_COSTS[structureAtCursor.kind][(structureAtCursor.level + 1) as 1 | 2 | 3])}`
        : ' (MAX)')
    : '';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color="yellow">{'◆ CodeKeep'}</Text>
        <Text dimColor>{'│'}</Text>
        <Text color="yellow">{RESOURCE_ICONS.gold} {resources.gold}</Text>
        <Text color="green">{RESOURCE_ICONS.wood} {resources.wood}</Text>
        <Text color="white">{RESOURCE_ICONS.stone} {resources.stone}</Text>
        <Text dimColor>{'│'}</Text>
        <Text>Sel: <Text bold>{STRUCTURE_NAMES[selectedStructure]}</Text></Text>
        {fragmentCount > 0 && (
          <>
            <Text dimColor>{'│'}</Text>
            <Text color="cyan" bold>~ {fragmentCount} on ground</Text>
          </>
        )}
      </Box>
      <Text color={message.startsWith('!') ? 'red' : 'yellow'}>{message || ' '}</Text>
      <Text dimColor>{cursorInfo || ' '}</Text>
    </Box>
  );
}
