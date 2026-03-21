import React from 'react';
import { Box, Text } from 'ink';
import type { KeepGridState, GridCoord, StructureKind, DataFragment, PlacedStructure } from '@codekeep/shared';
import {
  GRID_SIZE, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL, FRAGMENT_TYPES,
  ARCHER_RANGE, WATCHTOWER_RANGE, WARD_MITIGATION,
} from '@codekeep/shared';

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

function manhattanDist(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function chebyshevDist(a: GridCoord, b: GridCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function computeRangeOverlay(
  structure: PlacedStructure,
  allStructures: PlacedStructure[],
): { tiles: Set<string>; color: string } | null {
  const tiles = new Set<string>();

  if (structure.kind === 'archerTower') {
    const range = ARCHER_RANGE[structure.level];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (manhattanDist(structure.pos, { x, y }) <= range && !(x === structure.pos.x && y === structure.pos.y)) {
          tiles.add(`${x},${y}`);
        }
      }
    }
    return { tiles, color: 'red' };
  }

  if (structure.kind === 'watchtower') {
    const range = WATCHTOWER_RANGE[structure.level];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (chebyshevDist(structure.pos, { x, y }) <= range && !(x === structure.pos.x && y === structure.pos.y)) {
          tiles.add(`${x},${y}`);
        }
      }
    }
    return { tiles, color: 'green' };
  }

  if (structure.kind === 'ward') {
    let effectiveRange = 1;
    const watchtowers = allStructures.filter(s => s.kind === 'watchtower');
    for (const wt of watchtowers) {
      if (chebyshevDist(structure.pos, wt.pos) <= 1) {
        effectiveRange = Math.max(effectiveRange, 1 + WATCHTOWER_RANGE[wt.level]);
      }
    }
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (chebyshevDist(structure.pos, { x, y }) <= effectiveRange && !(x === structure.pos.x && y === structure.pos.y)) {
          tiles.add(`${x},${y}`);
        }
      }
    }
    return { tiles, color: 'cyan' };
  }

  return null;
}

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

  const cursorStructure = structureMap.get(`${cursor.x},${cursor.y}`);
  const rangeOverlay = cursorStructure
    ? computeRangeOverlay(cursorStructure, grid.structures)
    : null;

  const rows: React.ReactNode[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    const rowLabel = compact
      ? y.toString(16).toUpperCase()
      : ' ' + y.toString(16).toUpperCase();
    const cells: React.ReactNode[] = [];

    for (let x = 0; x < GRID_SIZE; x++) {
      const isCursor = cursor.x === x && cursor.y === y;
      const structure = structureMap.get(`${x},${y}`);
      const cellKey = `${x},${y}`;
      const inRange = rangeOverlay?.tiles.has(cellKey) ?? false;

      let char: string;
      let color: string | undefined;
      let bold = false;

      const fragment = fragmentMap.get(cellKey);

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
      } else if (inRange && !structure && !fragment) {
        cells.push(
          <Text key={x} color={rangeOverlay!.color} dimColor>
            {'░' + (compact ? '' : ' ')}
          </Text>
        );
      } else if (inRange && structure) {
        cells.push(
          <Text key={x} color={color} bold={bold} backgroundColor={rangeOverlay!.color === 'red' ? 'red' : undefined}>
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
