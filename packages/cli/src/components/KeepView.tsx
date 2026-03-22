import React from 'react';
import { Box, Text } from 'ink';
import type { KeepState } from '@codekeep/shared';
import { KEEP_STRUCTURES, getStructureLevel } from '@codekeep/server';

// Grid dimensions
const GRID_ROWS = 15;
const GRID_COLS = 44;

// Entity types on the grid
export type KeepEntityType = 'structure' | 'npc' | 'gate';
export interface KeepEntity {
  type: KeepEntityType;
  id: string;
  name: string;
  symbol: string;
  row: number;
  col: number;
  width: number;
  height: number;
}

const STRUCTURE_ENTITIES: KeepEntity[] = [
  { type: 'structure', id: 'forge',        name: 'The Forge',     symbol: '#', row: 2, col: 3,  width: 5, height: 3 },
  { type: 'structure', id: 'archive',      name: 'The Archive',   symbol: '%', row: 2, col: 15, width: 5, height: 3 },
  { type: 'structure', id: 'foundry',      name: 'The Foundry',   symbol: '&', row: 2, col: 27, width: 5, height: 3 },
  { type: 'structure', id: 'beacon_tower', name: 'Beacon Tower',  symbol: '^', row: 9, col: 3,  width: 5, height: 3 },
  { type: 'structure', id: 'sanctum_hall', name: 'Sanctum Hall',  symbol: '+', row: 9, col: 15, width: 5, height: 3 },
];

const NPC_ENTITIES: KeepEntity[] = [
  { type: 'npc', id: 'wren',         name: 'Wren',           symbol: 'W', row: 6,  col: 5,  width: 1, height: 1 },
  { type: 'npc', id: 'sable',        name: 'Sable',          symbol: 'S', row: 6,  col: 17, width: 1, height: 1 },
  { type: 'npc', id: 'duskmar',      name: 'Duskmar',        symbol: 'D', row: 6,  col: 29, width: 1, height: 1 },
  { type: 'npc', id: 'mott',         name: 'Mott',           symbol: 'M', row: 8,  col: 29, width: 1, height: 1 },
  { type: 'npc', id: 'pale_visitor', name: 'Pale Visitor',   symbol: '?', row: 12, col: 35, width: 1, height: 1 },
];

const GATE_ENTITY: KeepEntity = {
  type: 'gate', id: 'gate', name: 'The Gate', symbol: '>', row: 13, col: 19, width: 7, height: 1,
};

const ALL_ENTITIES: KeepEntity[] = [...STRUCTURE_ENTITIES, ...NPC_ENTITIES, GATE_ENTITY];

const NPC_FULL_NAMES: Record<string, string> = {
  wren: 'Wren, the Steward',
  sable: 'Sable, the Archivist',
  duskmar: 'Duskmar, First Wall',
  mott: 'Mott, the Salvager',
  pale_visitor: 'The Pale Visitor',
};

// Check if a tile is walkable (not a wall, not inside a structure body)
function isSolid(row: number, col: number): boolean {
  if (row <= 0 || row >= GRID_ROWS - 1 || col <= 0 || col >= GRID_COLS - 1) return true;

  for (const ent of STRUCTURE_ENTITIES) {
    if (row >= ent.row && row < ent.row + ent.height && col >= ent.col && col < ent.col + ent.width) {
      return true;
    }
  }

  if (row === GATE_ENTITY.row && col >= GATE_ENTITY.col && col < GATE_ENTITY.col + GATE_ENTITY.width) {
    return true;
  }

  return false;
}

export function isWalkable(row: number, col: number): boolean {
  return !isSolid(row, col);
}

export function getEntityAt(cursorRow: number, cursorCol: number): KeepEntity | null {
  for (const ent of ALL_ENTITIES) {
    const nearRow = cursorRow >= ent.row - 1 && cursorRow <= ent.row + ent.height;
    const nearCol = cursorCol >= ent.col - 1 && cursorCol <= ent.col + ent.width;
    if (nearRow && nearCol) return ent;
  }
  return null;
}

export const KEEP_START_ROW = 7;
export const KEEP_START_COL = 17;

function structureColor(level: number, maxLevel: number): string {
  if (level >= maxLevel) return 'green';
  if (level > 0) return 'yellow';
  return 'white';
}

function npcColor(tier: number): string {
  if (tier >= 4) return 'magenta';
  if (tier >= 2) return 'cyan';
  if (tier >= 1) return 'yellow';
  return 'white';
}

interface KeepViewProps {
  keep: KeepState;
  cursorRow: number;
  cursorCol: number;
  message: string;
}

export function KeepView({ keep, cursorRow, cursorCol, message }: KeepViewProps) {
  const nearby = getEntityAt(cursorRow, cursorCol);

  const grid: string[][] = [];
  const titleText = ' THE KEEP ';
  const titleStart = Math.floor((GRID_COLS - titleText.length) / 2);

  for (let r = 0; r < GRID_ROWS; r++) {
    const row: string[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      if (r === 0 && c === 0) row.push('┌');
      else if (r === 0 && c === GRID_COLS - 1) row.push('┐');
      else if (r === GRID_ROWS - 1 && c === 0) row.push('└');
      else if (r === GRID_ROWS - 1 && c === GRID_COLS - 1) row.push('┘');
      else if (r === 0 && c >= titleStart && c < titleStart + titleText.length) row.push(titleText[c - titleStart]);
      else if (r === 0 || r === GRID_ROWS - 1) row.push('─');
      else if (c === 0 || c === GRID_COLS - 1) row.push('│');
      else row.push(' ');
    }
    grid.push(row);
  }

  // Cell metadata for coloring
  type CellMeta = { color: string; bold: boolean; dim: boolean };
  const meta: CellMeta[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ color: 'white', bold: false, dim: false })),
  );

  // Draw walls and title
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (r === 0 || r === GRID_ROWS - 1 || c === 0 || c === GRID_COLS - 1) {
        meta[r][c] = { color: 'white', bold: false, dim: true };
      }
    }
  }
  for (let c = titleStart; c < titleStart + titleText.length; c++) {
    meta[0][c] = { color: 'yellow', bold: true, dim: false };
  }

  // Draw structures as box buildings
  for (const ent of STRUCTURE_ENTITIES) {
    const def = KEEP_STRUCTURES.find(s => s.id === ent.id);
    const level = getStructureLevel(keep, ent.id);
    const maxLvl = def?.maxLevel ?? 3;
    const color = structureColor(level, maxLvl);
    const bold = level >= maxLvl;
    const dim = level === 0;

    const r = ent.row;
    const c = ent.col;
    // Top: ╔═══╗
    grid[r][c] = '╔'; grid[r][c+1] = '═'; grid[r][c+2] = '═'; grid[r][c+3] = '═'; grid[r][c+4] = '╗';
    // Mid: ║ X ║
    grid[r+1][c] = '║'; grid[r+1][c+1] = ' '; grid[r+1][c+2] = ent.symbol; grid[r+1][c+3] = ' '; grid[r+1][c+4] = '║';
    // Bot: ╚═══╝
    grid[r+2][c] = '╚'; grid[r+2][c+1] = '═'; grid[r+2][c+2] = '═'; grid[r+2][c+3] = '═'; grid[r+2][c+4] = '╝';

    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 5; dc++) {
        meta[r + dr][c + dc] = { color, bold, dim };
      }
    }

    // Level stars below structure
    if (r + 3 < GRID_ROWS - 1) {
      const stars = '*'.repeat(level) + '·'.repeat(maxLvl - level);
      const labelStart = c + Math.floor((5 - stars.length) / 2);
      for (let i = 0; i < stars.length && labelStart + i < GRID_COLS - 1; i++) {
        grid[r + 3][labelStart + i] = stars[i];
        meta[r + 3][labelStart + i] = { color: stars[i] === '*' ? color : 'gray', bold: false, dim: stars[i] !== '*' };
      }
    }
  }

  // Draw NPCs
  for (const npc of NPC_ENTITIES) {
    const npcState = keep.npcs.find(n => n.id === npc.id);
    const tier = npcState?.tier ?? 0;
    const color = npcColor(tier);
    grid[npc.row][npc.col] = npc.symbol;
    meta[npc.row][npc.col] = { color, bold: tier >= 3, dim: false };
  }

  // Draw gate
  {
    const r = GATE_ENTITY.row;
    const c = GATE_ENTITY.col;
    const label = '[ RUN ]';
    for (let i = 0; i < label.length && c + i < GRID_COLS - 1; i++) {
      grid[r][c + i] = label[i];
      meta[r][c + i] = { color: 'green', bold: true, dim: false };
    }
  }

  // Draw player cursor
  if (cursorRow >= 0 && cursorRow < GRID_ROWS && cursorCol >= 0 && cursorCol < GRID_COLS) {
    grid[cursorRow][cursorCol] = '@';
    meta[cursorRow][cursorCol] = { color: 'yellow', bold: true, dim: false };
  }

  // Build proximity info
  let proximityInfo = '';
  if (nearby) {
    if (nearby.type === 'structure') {
      const def = KEEP_STRUCTURES.find(s => s.id === nearby.id);
      const level = getStructureLevel(keep, nearby.id);
      const maxLvl = def?.maxLevel ?? 3;
      if (level >= maxLvl) {
        proximityInfo = `${nearby.name} (MAX) — ${def?.description ?? ''}`;
      } else {
        const cost = def?.upgradeCost(level + 1) ?? 0;
        proximityInfo = `${nearby.name} Lv.${level}/${maxLvl} — ${def?.description ?? ''} [${cost} Echoes to upgrade]`;
      }
    } else if (nearby.type === 'npc') {
      const npcState = keep.npcs.find(n => n.id === nearby.id);
      const tier = npcState?.tier ?? 0;
      proximityInfo = `${NPC_FULL_NAMES[nearby.id] ?? nearby.id} (Tier ${tier}/5) — Press Enter to talk`;
    } else if (nearby.type === 'gate') {
      proximityInfo = 'The Gate — Press Enter to begin a new run into the Pale';
    }
  }

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between" paddingX={1}>
        <Text bold color="yellow">{'◆ The Keep'}</Text>
        <Text>
          Echoes <Text bold color="cyan">{keep.echoes}</Text>
          {'  '}Runs <Text dimColor>{keep.totalRuns}</Text>
          {'  '}Wins <Text dimColor>{keep.totalWins}</Text>
          {'  '}Asc <Text dimColor>{keep.highestAscension}</Text>
        </Text>
      </Box>

      {grid.map((row, r) => (
        <Text key={r}>
          {row.map((ch, c) => {
            const m = meta[r][c];
            return (
              <Text key={c} color={m.color} bold={m.bold} dimColor={m.dim}>
                {ch}
              </Text>
            );
          })}
        </Text>
      ))}

      {proximityInfo ? (
        <Text color="cyan">{' '}{proximityInfo}</Text>
      ) : (
        <Text dimColor>{' '}Walk near a building or NPC and press Enter</Text>
      )}

      {message ? (
        <Text color="yellow" bold>{' '}{message}</Text>
      ) : null}

      <Text dimColor>{' '}arrow/hjkl move  Enter interact  q menu</Text>
    </Box>
  );
}
