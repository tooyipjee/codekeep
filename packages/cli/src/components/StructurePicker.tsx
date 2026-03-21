import React from 'react';
import { Box, Text } from 'ink';
import type { StructureKind } from '@codekeep/shared';
import {
  ALL_STRUCTURE_KINDS,
  STRUCTURE_NAMES,
  STRUCTURE_SYMBOLS,
  STRUCTURE_COSTS,
} from '@codekeep/shared';

interface StructurePickerProps {
  selected: StructureKind;
}

const COLORS: Record<StructureKind, string> = {
  wall: 'white',
  trap: 'magenta',
  treasury: 'yellow',
  ward: 'cyan',
  watchtower: 'green',
  archerTower: 'redBright',
};

export function StructurePicker({ selected }: StructurePickerProps) {
  return (
    <Box flexDirection="column">
      <Text bold>Structures [ ]</Text>
      {ALL_STRUCTURE_KINDS.map((kind, idx) => {
        const isSelected = kind === selected;
        const cost = STRUCTURE_COSTS[kind][1];
        const costStr = `G${cost.gold} W${cost.wood} S${cost.stone}`;

        return (
          <Box key={kind}>
            <Text
              color={isSelected ? COLORS[kind] : undefined}
              bold={isSelected}
              dimColor={!isSelected}
            >
              {isSelected ? '▸' : ' '} {idx + 1} {STRUCTURE_SYMBOLS[kind]} {STRUCTURE_NAMES[kind]}
            </Text>
            {isSelected && (
              <Text dimColor> {costStr}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
