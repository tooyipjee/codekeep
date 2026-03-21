import React from 'react';
import { Box, Text } from 'ink';
import type { KeepGridState, GridCoord, StructureKind, DataFragment } from '@codekeep/shared';
import { GRID_SIZE, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL, FRAGMENT_TYPES } from '@codekeep/shared';

interface KeepGridProps {
  grid: KeepGridState;
  cursor: GridCoord;
  asciiMode?: boolean;
  compact?: boolean;
  fragments?: DataFragment[];
}

const STRUCTURE_COLORS: Record<StructureKind, string> = {
  wall: 'white',
  trap: 'magenta',
  treasury: 'yellow',
  ward: 'cyan',
  watchtower: 'green',
  archerTower: 'redBright',
};

const BRIGHT_COLORS: Record<StructureKind, string> = {
  wall: 'whiteBright',
  trap: 'magentaBright',
  treasury: 'yellowBright',
  ward: 'cyanBright',
  watchtower: 'greenBright',
  archerTower: 'redBright',
};

const FRAGMENT_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(FRAGMENT_TYPES).map(([k, v]) => [k, v.color]),
);

export function KeepGrid({ grid, cursor, asciiMode, compact, fragments = [] }: KeepGridProps) {
  const h = asciiMode ? '-' : '─';
  const v = asciiMode ? '|' : '│';
  const tl = asciiMode ? '+' : '┌';
  const tr = asciiMode ? '+' : '┐';
  const bl = asciiMode ? '+' : '└';
  const br = asciiMode ? '+' : '┘';

  const cellWidth = compact ? 1 : 2;
  const colNumbers = (compact ? '  ' : '   ') + Array.from({ length: GRID_SIZE }, (_, i) =>
    compact ? i.toString(16).toUpperCase() : i.toString(16).toUpperCase() + ' '
  ).join('');

  const topBorder = (compact ? ' ' : '  ') + tl + h.repeat(GRID_SIZE * cellWidth) + tr;
  const bottomBorder = (compact ? ' ' : '  ') + bl + h.repeat(GRID_SIZE * cellWidth) + br;

  const structureMap = new Map<string, typeof grid.structures[number]>();
  for (const s of grid.structures) {
    structureMap.set(`${s.pos.x},${s.pos.y}`, s);
  }

  const fragmentMap = new Map<string, DataFragment>();
  for (const f of fragments) {
    fragmentMap.set(`${f.pos.x},${f.pos.y}`, f);
  }

  const rows: React.ReactNode[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    const rowLabel = compact
      ? (y % 16).toString(16).toUpperCase()
      : (y % 10).toString().padStart(2, ' ');
    const cells: React.ReactNode[] = [];

    for (let x = 0; x < GRID_SIZE; x++) {
      const isCursor = cursor.x === x && cursor.y === y;
      const structure = structureMap.get(`${x},${y}`);

      let char: string;
      let color: string | undefined;
      let bold = false;

      const fragment = fragmentMap.get(`${x},${y}`);

      if (structure) {
        char = STRUCTURE_SYMBOLS[structure.kind];
        color = STRUCTURE_COLORS[structure.kind];
        if (structure.level >= 2) bold = true;
        if (structure.level === 3) color = BRIGHT_COLORS[structure.kind];
      } else if (fragment) {
        char = '~';
        color = FRAGMENT_COLORS[fragment.type] ?? 'cyan';
        bold = true;
      } else {
        char = EMPTY_CELL_SYMBOL;
        color = undefined;
      }

      const suffix = compact ? '' : (structure && structure.level > 1 ? String(structure.level) : ' ');

      if (isCursor) {
        cells.push(
          <Text key={x} backgroundColor="white" color="black" bold>
            {char + suffix}
          </Text>
        );
      } else if (color) {
        cells.push(
          <Text key={x} color={color} bold={bold}>
            {char + suffix}
          </Text>
        );
      } else {
        cells.push(
          <Text key={x} dimColor>
            {char + (compact ? '' : ' ')}
          </Text>
        );
      }
    }

    rows.push(
      <Box key={y}>
        <Text dimColor>{rowLabel}</Text>
        <Text dimColor>{v}</Text>
        {cells}
        <Text dimColor>{v}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>{colNumbers}</Text>
      <Text dimColor>{topBorder}</Text>
      {rows}
      <Text dimColor>{bottomBorder}</Text>
    </Box>
  );
}
