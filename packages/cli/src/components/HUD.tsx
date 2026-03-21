import React from 'react';
import { Box, Text } from 'ink';
import type { Resources, StructureKind, PlacedStructure } from '@codekeep/shared';
import { STRUCTURE_NAMES, STRUCTURE_COSTS } from '@codekeep/shared';

interface HUDProps {
  resources: Resources;
  selectedStructure: StructureKind;
  message: string;
  compact?: boolean;
  structureAtCursor?: PlacedStructure | null;
}

const COMPACT_NAMES: Record<StructureKind, string> = {
  firewall: 'FW',
  honeypot: 'HP',
  dataVault: 'DV',
  encryptionNode: 'EN',
  relayTower: 'RT',
  scanner: 'SC',
};

export function HUD({ resources, selectedStructure, message, compact, structureAtCursor }: HUDProps) {
  if (compact) {
    const name = COMPACT_NAMES[selectedStructure];
    return (
      <Box flexDirection="column" marginBottom={0}>
        <Text>
          <Text bold color="yellow">{'◆'}</Text>
          <Text dimColor>{' │ '}</Text>
          <Text color="red">C:{resources.compute}</Text>
          <Text> </Text>
          <Text color="blue">M:{resources.memory}</Text>
          <Text> </Text>
          <Text color="green">B:{resources.bandwidth}</Text>
          <Text dimColor>{' │ '}</Text>
          <Text bold>{name}</Text>
          {message ? <Text dimColor>{' │ '}</Text> : null}
          {message ? <Text color={message.startsWith('!') ? 'red' : 'yellow'}>{message}</Text> : null}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color="yellow">{'◆ CodeKeep'}</Text>
        <Text dimColor>{'│'}</Text>
        <Text color="red">C:{resources.compute}</Text>
        <Text color="blue">M:{resources.memory}</Text>
        <Text color="green">B:{resources.bandwidth}</Text>
        <Text dimColor>{'│'}</Text>
        <Text>Sel: <Text bold>{STRUCTURE_NAMES[selectedStructure]}</Text></Text>
      </Box>
      {message && (
        <Text color={message.startsWith('!') ? 'red' : 'yellow'}>{message}</Text>
      )}
      {structureAtCursor && (
        <Text dimColor>
          {STRUCTURE_NAMES[structureAtCursor.kind]} Lv.{structureAtCursor.level}
          {structureAtCursor.level < 3 ? (() => {
            const nextCost = STRUCTURE_COSTS[structureAtCursor.kind][(structureAtCursor.level + 1) as 1 | 2 | 3];
            return ` → Lv.${structureAtCursor.level + 1}: C${nextCost.compute} M${nextCost.memory} B${nextCost.bandwidth}`;
          })() : ' (MAX)'}
        </Text>
      )}
    </Box>
  );
}
