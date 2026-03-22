import React from 'react';
import { Box, Text } from 'ink';
import type { KeepState } from '@codekeep/shared';
import { KEEP_STRUCTURES, getStructureLevel } from '@codekeep/server';

const GRID_ROWS = 17;
const GRID_COLS = 56;
const WALL_TOP = 1;
const WALL_BOT = 15;
const WALL_LEFT = 3;
const WALL_RIGHT = 52;

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
  { type: 'structure', id: 'forge',        name: 'Forge',   symbol: '#', row: 3,  col: 6,  width: 11, height: 3 },
  { type: 'structure', id: 'archive',      name: 'Archive', symbol: '%', row: 3,  col: 20, width: 11, height: 3 },
  { type: 'structure', id: 'foundry',      name: 'Foundry', symbol: '&', row: 3,  col: 34, width: 11, height: 3 },
  { type: 'structure', id: 'beacon_tower', name: 'Beacon',  symbol: '^', row: 10, col: 6,  width: 11, height: 3 },
  { type: 'structure', id: 'sanctum_hall', name: 'Sanctum', symbol: '+', row: 10, col: 20, width: 11, height: 3 },
];

const NPC_ENTITIES: KeepEntity[] = [
  { type: 'npc', id: 'wren',         name: 'Wren',         symbol: 'W', row: 8,  col: 11, width: 1, height: 1 },
  { type: 'npc', id: 'sable',        name: 'Sable',        symbol: 'S', row: 8,  col: 25, width: 1, height: 1 },
  { type: 'npc', id: 'duskmar',      name: 'Duskmar',      symbol: 'D', row: 8,  col: 39, width: 1, height: 1 },
  { type: 'npc', id: 'mott',         name: 'Mott',         symbol: 'M', row: 9,  col: 44, width: 1, height: 1 },
  { type: 'npc', id: 'pale_visitor', name: 'Pale Visitor', symbol: '?', row: 13, col: 46, width: 1, height: 1 },
];

const GATE_ENTITY: KeepEntity = {
  type: 'gate', id: 'gate', name: 'The Gate', symbol: '>', row: WALL_BOT, col: 19, width: 18, height: 1,
};

const ALL_ENTITIES: KeepEntity[] = [...STRUCTURE_ENTITIES, ...NPC_ENTITIES, GATE_ENTITY];

const NPC_FULL_NAMES: Record<string, string> = {
  wren: 'Wren, the Steward',
  sable: 'Sable, the Archivist',
  duskmar: 'Duskmar, First Wall',
  mott: 'Mott, the Salvager',
  pale_visitor: 'The Pale Visitor',
};

const NPC_FLAVOR: Record<string, string> = {
  wren: 'Tends the Keep with quiet devotion',
  sable: 'Remembers what the Pale erases',
  duskmar: 'The wall that never fell',
  mott: 'Finds treasure in the wreckage',
  pale_visitor: 'Speaks in riddles from beyond',
};

function isSolid(row: number, col: number): boolean {
  if (row <= WALL_TOP || row >= WALL_BOT) return true;
  if (col <= WALL_LEFT || col >= WALL_RIGHT) return true;

  for (const ent of STRUCTURE_ENTITIES) {
    if (row >= ent.row && row < ent.row + ent.height &&
        col >= ent.col && col < ent.col + ent.width) return true;
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

export const KEEP_START_ROW = 9;
export const KEEP_START_COL = 25;

function structureColor(level: number, maxLevel: number): string {
  if (level >= maxLevel) return 'green';
  if (level >= 2) return 'cyan';
  if (level >= 1) return 'yellow';
  return 'white';
}

function npcColor(tier: number): string {
  if (tier >= 4) return 'magenta';
  if (tier >= 2) return 'cyan';
  if (tier >= 1) return 'yellow';
  return 'white';
}

function levelBar(level: number, max: number, color: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < max; i++) {
    nodes.push(i < level
      ? <Text key={i} color={color} bold>{'◆'}</Text>
      : <Text key={i} dimColor>{'◇'}</Text>);
  }
  return nodes;
}

interface KeepViewProps {
  keep: KeepState;
  cursorRow: number;
  cursorCol: number;
  message: string;
}

export function KeepView({ keep, cursorRow, cursorCol, message }: KeepViewProps) {
  const nearby = getEntityAt(cursorRow, cursorCol);

  type CellMeta = { color: string; bold: boolean; dim: boolean };
  const grid: string[][] = [];
  const meta: CellMeta[][] = [];

  // --- 1. Fill everything with Pale mist ---
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: string[] = [];
    const mrow: CellMeta[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push((r + c) % 2 === 0 ? '~' : ' ');
      mrow.push({ color: 'white', bold: false, dim: true });
    }
    grid.push(row);
    meta.push(mrow);
  }

  // Embed "the pale" in the mist bands
  const paleStr = 'the  pale';
  const paleStart = Math.floor((GRID_COLS - paleStr.length) / 2);
  for (let i = 0; i < paleStr.length; i++) {
    grid[0][paleStart + i] = paleStr[i];
    grid[GRID_ROWS - 1][paleStart + i] = paleStr[i];
  }

  // --- 2. Draw fortress walls (double-line) ---
  grid[WALL_TOP][WALL_LEFT] = '╔';
  grid[WALL_TOP][WALL_RIGHT] = '╗';
  grid[WALL_BOT][WALL_LEFT] = '╚';
  grid[WALL_BOT][WALL_RIGHT] = '╝';

  for (let c = WALL_LEFT + 1; c < WALL_RIGHT; c++) {
    grid[WALL_TOP][c] = '═';
    grid[WALL_BOT][c] = '═';
    meta[WALL_TOP][c] = { color: 'white', bold: false, dim: true };
    meta[WALL_BOT][c] = { color: 'white', bold: false, dim: true };
  }
  for (let r = WALL_TOP + 1; r < WALL_BOT; r++) {
    grid[r][WALL_LEFT] = '║';
    grid[r][WALL_RIGHT] = '║';
    meta[r][WALL_LEFT] = { color: 'white', bold: false, dim: true };
    meta[r][WALL_RIGHT] = { color: 'white', bold: false, dim: true };
  }
  meta[WALL_TOP][WALL_LEFT] = { color: 'white', bold: false, dim: true };
  meta[WALL_TOP][WALL_RIGHT] = { color: 'white', bold: false, dim: true };
  meta[WALL_BOT][WALL_LEFT] = { color: 'white', bold: false, dim: true };
  meta[WALL_BOT][WALL_RIGHT] = { color: 'white', bold: false, dim: true };

  // Battlements (▲) along the walls
  const topBattlements = [WALL_LEFT + 1, 8, 14, 38, 44, WALL_RIGHT - 1];
  const botBattlements = [WALL_LEFT + 1, 8, 14, 42, 48, WALL_RIGHT - 1];

  for (const bc of topBattlements) {
    if (bc > WALL_LEFT && bc < WALL_RIGHT) {
      grid[WALL_TOP][bc] = '▲';
      meta[WALL_TOP][bc] = { color: 'white', bold: true, dim: false };
    }
  }
  for (const bc of botBattlements) {
    if (bc > WALL_LEFT && bc < WALL_RIGHT && grid[WALL_BOT][bc] === '═') {
      grid[WALL_BOT][bc] = '▲';
      meta[WALL_BOT][bc] = { color: 'white', bold: true, dim: false };
    }
  }

  // Title banner in top wall
  const title = ' THE KEEP ';
  const titleStart = WALL_LEFT + 1 + Math.floor(((WALL_RIGHT - WALL_LEFT - 1) - title.length) / 2);
  for (let i = 0; i < title.length; i++) {
    grid[WALL_TOP][titleStart + i] = title[i];
    meta[WALL_TOP][titleStart + i] = { color: 'yellow', bold: true, dim: false };
  }

  // --- 3. Clear interior to courtyard floor ---
  for (let r = WALL_TOP + 1; r < WALL_BOT; r++) {
    for (let c = WALL_LEFT + 1; c < WALL_RIGHT; c++) {
      grid[r][c] = ' ';
      meta[r][c] = { color: 'white', bold: false, dim: false };
    }
  }

  // --- 4. Wall torches (flames in the corners) ---
  const torches = [
    [WALL_TOP + 1, WALL_LEFT + 1],
    [WALL_TOP + 1, WALL_RIGHT - 1],
    [WALL_BOT - 1, WALL_LEFT + 1],
    [WALL_BOT - 1, WALL_RIGHT - 1],
  ];
  for (const [tr, tc] of torches) {
    grid[tr][tc] = '*';
    meta[tr][tc] = { color: 'yellow', bold: true, dim: false };
  }

  // --- 5. Courtyard cobblestone paths ---
  // Main horizontal path through the courtyard
  for (let c = WALL_LEFT + 2; c < WALL_RIGHT - 1; c++) {
    if (grid[8][c] === ' ') {
      grid[8][c] = '·';
      meta[8][c] = { color: 'white', bold: false, dim: true };
    }
  }

  // Vertical paths connecting upper & lower buildings
  for (const vc of [11, 25, 39]) {
    for (let r = 6; r <= (vc === 39 ? 8 : 10); r++) {
      if (grid[r][vc] === ' ') {
        grid[r][vc] = '·';
        meta[r][vc] = { color: 'white', bold: false, dim: true };
      }
    }
  }

  // Gate approach road (center path to the gate)
  for (let r = 9; r < WALL_BOT; r++) {
    if (grid[r][28] === ' ') {
      grid[r][28] = '·';
      meta[r][28] = { color: 'white', bold: false, dim: true };
    }
  }

  // Scattered courtyard stones for atmosphere
  const stones = [
    [7, 16], [7, 34], [7, 48],
    [9, 8], [9, 18], [9, 36],
    [13, 8], [13, 18], [13, 36],
  ];
  for (const [sr, sc] of stones) {
    if (sr > WALL_TOP && sr < WALL_BOT && grid[sr][sc] === ' ') {
      grid[sr][sc] = '·';
      meta[sr][sc] = { color: 'white', bold: false, dim: true };
    }
  }

  // --- 6. Draw buildings ---
  for (const ent of STRUCTURE_ENTITIES) {
    const def = KEEP_STRUCTURES.find(s => s.id === ent.id);
    const level = getStructureLevel(keep, ent.id);
    const maxLvl = def?.maxLevel ?? 3;
    const color = structureColor(level, maxLvl);
    const bold = level >= maxLvl;
    const dim = level === 0;

    const r = ent.row;
    const c = ent.col;
    const w = ent.width;
    const inner = w - 2;

    // Name centered in the top border with ─ padding
    const padL = Math.ceil((inner - ent.name.length) / 2);
    const padR = inner - ent.name.length - padL;

    grid[r][c] = '┌';
    let p = c + 1;
    for (let i = 0; i < padL; i++) { grid[r][p] = '─'; p++; }
    for (let i = 0; i < ent.name.length; i++) { grid[r][p] = ent.name[i]; p++; }
    for (let i = 0; i < padR; i++) { grid[r][p] = '─'; p++; }
    grid[r][c + w - 1] = '┐';

    // Middle row: │    sym    │
    grid[r + 1][c] = '│';
    for (let i = 1; i < w - 1; i++) grid[r + 1][c + i] = ' ';
    grid[r + 1][c + Math.floor(w / 2)] = ent.symbol;
    grid[r + 1][c + w - 1] = '│';

    // Bottom border
    grid[r + 2][c] = '└';
    for (let i = 1; i < w - 1; i++) grid[r + 2][c + i] = '─';
    grid[r + 2][c + w - 1] = '┘';

    // Color all building cells
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < w; dc++) {
        meta[r + dr][c + dc] = { color, bold, dim };
      }
    }

    // Level pips below building
    const pipRow = r + 3;
    if (pipRow > WALL_TOP && pipRow < WALL_BOT) {
      const pipStart = c + Math.floor((w - maxLvl) / 2);
      for (let i = 0; i < maxLvl; i++) {
        grid[pipRow][pipStart + i] = i < level ? '◆' : '◇';
        meta[pipRow][pipStart + i] = {
          color: i < level ? color : 'white',
          bold: i < level,
          dim: i >= level,
        };
      }
    }
  }

  // --- 7. Draw NPCs ---
  for (const npc of NPC_ENTITIES) {
    const npcState = keep.npcs.find(n => n.id === npc.id);
    const tier = npcState?.tier ?? 0;
    const color = npcColor(tier);
    grid[npc.row][npc.col] = npc.symbol;
    meta[npc.row][npc.col] = { color, bold: tier >= 3, dim: false };
  }

  // --- 8. Gate inscription on the bottom wall ---
  const gateLabel = '╡ ENTER THE PALE ╞';
  const gateStart = WALL_LEFT + 1 + Math.floor(((WALL_RIGHT - WALL_LEFT - 1) - gateLabel.length) / 2);
  for (let i = 0; i < gateLabel.length; i++) {
    grid[WALL_BOT][gateStart + i] = gateLabel[i];
    meta[WALL_BOT][gateStart + i] = { color: 'green', bold: true, dim: false };
  }

  // --- 9. The Pale creeping at the right edge (atmospheric mist inside) ---
  for (let r = 11; r <= 14; r++) {
    for (let c = 48; c < WALL_RIGHT; c++) {
      if (grid[r][c] === ' ') {
        grid[r][c] = '~';
        meta[r][c] = { color: 'white', bold: false, dim: true };
      }
    }
  }

  // --- 10. Draw player cursor ---
  if (cursorRow > 0 && cursorRow < GRID_ROWS && cursorCol > 0 && cursorCol < GRID_COLS) {
    grid[cursorRow][cursorCol] = '@';
    meta[cursorRow][cursorCol] = { color: 'yellow', bold: true, dim: false };
  }

  // --- Build proximity info ---
  let infoName = '';
  let infoDetail = '';
  let infoColor = 'cyan';
  let infoLevel: React.ReactNode | null = null;

  if (nearby) {
    if (nearby.type === 'structure') {
      const def = KEEP_STRUCTURES.find(s => s.id === nearby.id);
      const level = getStructureLevel(keep, nearby.id);
      const maxLvl = def?.maxLevel ?? 3;
      infoColor = structureColor(level, maxLvl);
      infoName = nearby.name;
      if (level >= maxLvl) {
        infoDetail = `${def?.description ?? ''} (fully upgraded)`;
      } else {
        const cost = def?.upgradeCost(level + 1) ?? 0;
        infoDetail = `${def?.description ?? ''} — ${cost} Echoes to upgrade`;
      }
      infoLevel = <Text>{' '}{levelBar(level, maxLvl, infoColor)}</Text>;
    } else if (nearby.type === 'npc') {
      const npcState = keep.npcs.find(n => n.id === nearby.id);
      const tier = npcState?.tier ?? 0;
      infoColor = npcColor(tier);
      infoName = NPC_FULL_NAMES[nearby.id] ?? nearby.id;
      infoDetail = NPC_FLAVOR[nearby.id] ?? '';
      infoLevel = <Text>{' '}{levelBar(tier, 5, infoColor)}</Text>;
    } else if (nearby.type === 'gate') {
      infoColor = 'green';
      infoName = 'The Gate';
      infoDetail = 'Step beyond the walls. Face the Pale.';
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
          {'  '}Ascension <Text dimColor>{keep.highestAscension}</Text>
        </Text>
      </Box>

      <Box flexDirection="column">
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
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {nearby ? (
          <Box flexDirection="column">
            <Box>
              <Text bold color={infoColor}>{infoName}</Text>
              {infoLevel}
            </Box>
            <Text dimColor>{infoDetail}</Text>
          </Box>
        ) : (
          <Text dimColor italic>Explore the Keep. Walk near a building or NPC.</Text>
        )}
        {message ? <Text color="yellow" bold>{message}</Text> : null}
        <Text dimColor>{'arrow/hjkl move  Enter interact  q menu'}</Text>
      </Box>
    </Box>
  );
}
