import React from 'react';
import { Box, Text } from 'ink';
import type { KeepState } from '@codekeep/shared';
import { KEEP_STRUCTURES, getStructureLevel } from '@codekeep/server';

export type KeepEntityType = 'structure' | 'npc' | 'gate';
export interface KeepEntity {
  type: KeepEntityType;
  id: string;
  name: string;
  symbol: string;
}

const STRUCTURE_ENTITIES: KeepEntity[] = [
  { type: 'structure', id: 'forge',        name: 'Forge',   symbol: '#' },
  { type: 'structure', id: 'archive',      name: 'Archive', symbol: '%' },
  { type: 'structure', id: 'foundry',      name: 'Foundry', symbol: '&' },
  { type: 'structure', id: 'beacon_tower', name: 'Beacon',  symbol: '^' },
  { type: 'structure', id: 'sanctum_hall', name: 'Sanctum', symbol: '+' },
];

const NPC_ENTITIES: KeepEntity[] = [
  { type: 'npc', id: 'wren',         name: 'Wren',         symbol: 'W' },
  { type: 'npc', id: 'sable',        name: 'Sable',        symbol: 'S' },
  { type: 'npc', id: 'duskmar',      name: 'Duskmar',      symbol: 'D' },
  { type: 'npc', id: 'mott',         name: 'Mott',         symbol: 'M' },
  { type: 'npc', id: 'pale_visitor', name: 'Pale Visitor', symbol: '?' },
];

const GATE_ENTITY: KeepEntity = {
  type: 'gate', id: 'gate', name: 'The Gate', symbol: '>',
};

export const KEEP_ENTITIES: KeepEntity[] = [...STRUCTURE_ENTITIES, ...NPC_ENTITIES, GATE_ENTITY];

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

// Grid positions for rendering only
const GRID_ROWS = 17;
const GRID_COLS = 56;
const WALL_TOP = 1;
const WALL_BOT = 15;
const WALL_LEFT = 3;
const WALL_RIGHT = 52;

type BuildingPos = { row: number; col: number; width: number };
const BUILDING_POS: Record<string, BuildingPos> = {
  forge:        { row: 3,  col: 6,  width: 11 },
  archive:      { row: 3,  col: 20, width: 11 },
  foundry:      { row: 3,  col: 34, width: 11 },
  beacon_tower: { row: 10, col: 6,  width: 11 },
  sanctum_hall: { row: 10, col: 20, width: 11 },
};

type NpcPos = { row: number; col: number };
const NPC_POS: Record<string, NpcPos> = {
  wren:         { row: 8,  col: 11 },
  sable:        { row: 8,  col: 25 },
  duskmar:      { row: 8,  col: 39 },
  mott:         { row: 9,  col: 44 },
  pale_visitor: { row: 13, col: 46 },
};

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
  selectedId: string;
  message: string;
}

export function KeepView({ keep, selectedId, message }: KeepViewProps) {
  type CellMeta = { color: string; bold: boolean; dim: boolean };
  const grid: string[][] = [];
  const meta: CellMeta[][] = [];

  // --- 1. Fill with Pale mist ---
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

  const paleStr = 'the  pale';
  const paleStart = Math.floor((GRID_COLS - paleStr.length) / 2);
  for (let i = 0; i < paleStr.length; i++) {
    grid[0][paleStart + i] = paleStr[i];
    grid[GRID_ROWS - 1][paleStart + i] = paleStr[i];
  }

  // --- 2. Fortress walls ---
  grid[WALL_TOP][WALL_LEFT] = '╔'; grid[WALL_TOP][WALL_RIGHT] = '╗';
  grid[WALL_BOT][WALL_LEFT] = '╚'; grid[WALL_BOT][WALL_RIGHT] = '╝';
  for (let c = WALL_LEFT + 1; c < WALL_RIGHT; c++) {
    grid[WALL_TOP][c] = '═'; grid[WALL_BOT][c] = '═';
    meta[WALL_TOP][c] = { color: 'white', bold: false, dim: true };
    meta[WALL_BOT][c] = { color: 'white', bold: false, dim: true };
  }
  for (let r = WALL_TOP + 1; r < WALL_BOT; r++) {
    grid[r][WALL_LEFT] = '║'; grid[r][WALL_RIGHT] = '║';
    meta[r][WALL_LEFT] = { color: 'white', bold: false, dim: true };
    meta[r][WALL_RIGHT] = { color: 'white', bold: false, dim: true };
  }
  for (const corner of [[WALL_TOP, WALL_LEFT], [WALL_TOP, WALL_RIGHT], [WALL_BOT, WALL_LEFT], [WALL_BOT, WALL_RIGHT]]) {
    meta[corner[0]][corner[1]] = { color: 'white', bold: false, dim: true };
  }

  // Battlements
  for (const bc of [WALL_LEFT + 1, 8, 14, 38, 44, WALL_RIGHT - 1]) {
    if (bc > WALL_LEFT && bc < WALL_RIGHT) {
      grid[WALL_TOP][bc] = '▲';
      meta[WALL_TOP][bc] = { color: 'white', bold: true, dim: false };
    }
  }
  for (const bc of [WALL_LEFT + 1, 8, 14, 42, 48, WALL_RIGHT - 1]) {
    if (bc > WALL_LEFT && bc < WALL_RIGHT && grid[WALL_BOT][bc] === '═') {
      grid[WALL_BOT][bc] = '▲';
      meta[WALL_BOT][bc] = { color: 'white', bold: true, dim: false };
    }
  }

  // Title
  const title = ' THE KEEP ';
  const titleStart = WALL_LEFT + 1 + Math.floor(((WALL_RIGHT - WALL_LEFT - 1) - title.length) / 2);
  for (let i = 0; i < title.length; i++) {
    grid[WALL_TOP][titleStart + i] = title[i];
    meta[WALL_TOP][titleStart + i] = { color: 'yellow', bold: true, dim: false };
  }

  // --- 3. Clear interior ---
  for (let r = WALL_TOP + 1; r < WALL_BOT; r++) {
    for (let c = WALL_LEFT + 1; c < WALL_RIGHT; c++) {
      grid[r][c] = ' ';
      meta[r][c] = { color: 'white', bold: false, dim: false };
    }
  }

  // --- 4. Torches ---
  for (const [tr, tc] of [[WALL_TOP + 1, WALL_LEFT + 1], [WALL_TOP + 1, WALL_RIGHT - 1], [WALL_BOT - 1, WALL_LEFT + 1], [WALL_BOT - 1, WALL_RIGHT - 1]]) {
    grid[tr][tc] = '*';
    meta[tr][tc] = { color: 'yellow', bold: true, dim: false };
  }

  // --- 5. Paths ---
  for (let c = WALL_LEFT + 2; c < WALL_RIGHT - 1; c++) {
    if (grid[8][c] === ' ') { grid[8][c] = '·'; meta[8][c] = { color: 'white', bold: false, dim: true }; }
  }
  for (const vc of [11, 25, 39]) {
    for (let r = 6; r <= (vc === 39 ? 8 : 10); r++) {
      if (grid[r][vc] === ' ') { grid[r][vc] = '·'; meta[r][vc] = { color: 'white', bold: false, dim: true }; }
    }
  }
  for (let r = 9; r < WALL_BOT; r++) {
    if (grid[r][28] === ' ') { grid[r][28] = '·'; meta[r][28] = { color: 'white', bold: false, dim: true }; }
  }
  for (const [sr, sc] of [[7, 16], [7, 34], [7, 48], [9, 8], [9, 18], [9, 36], [13, 8], [13, 18], [13, 36]]) {
    if (sr > WALL_TOP && sr < WALL_BOT && grid[sr][sc] === ' ') {
      grid[sr][sc] = '·'; meta[sr][sc] = { color: 'white', bold: false, dim: true };
    }
  }

  // --- 6. Buildings ---
  for (const ent of STRUCTURE_ENTITIES) {
    const pos = BUILDING_POS[ent.id];
    if (!pos) continue;
    const def = KEEP_STRUCTURES.find(s => s.id === ent.id);
    const level = getStructureLevel(keep, ent.id);
    const maxLvl = def?.maxLevel ?? 3;
    const isSelected = ent.id === selectedId;
    const color = isSelected ? 'yellow' : structureColor(level, maxLvl);
    const bold = isSelected || level >= maxLvl;
    const dim = !isSelected && level === 0;

    const r = pos.row;
    const c = pos.col;
    const w = pos.width;
    const inner = w - 2;
    const padL = Math.ceil((inner - ent.name.length) / 2);
    const padR = inner - ent.name.length - padL;

    grid[r][c] = isSelected ? '┏' : '┌';
    let p = c + 1;
    for (let i = 0; i < padL; i++) { grid[r][p] = isSelected ? '━' : '─'; p++; }
    for (let i = 0; i < ent.name.length; i++) { grid[r][p] = ent.name[i]; p++; }
    for (let i = 0; i < padR; i++) { grid[r][p] = isSelected ? '━' : '─'; p++; }
    grid[r][c + w - 1] = isSelected ? '┓' : '┐';

    grid[r + 1][c] = isSelected ? '┃' : '│';
    for (let i = 1; i < w - 1; i++) grid[r + 1][c + i] = ' ';
    grid[r + 1][c + Math.floor(w / 2)] = ent.symbol;
    grid[r + 1][c + w - 1] = isSelected ? '┃' : '│';

    grid[r + 2][c] = isSelected ? '┗' : '└';
    for (let i = 1; i < w - 1; i++) grid[r + 2][c + i] = isSelected ? '━' : '─';
    grid[r + 2][c + w - 1] = isSelected ? '┛' : '┘';

    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < w; dc++) {
        meta[r + dr][c + dc] = { color, bold, dim };
      }
    }

    // Level pips
    const pipRow = r + 3;
    if (pipRow > WALL_TOP && pipRow < WALL_BOT) {
      const pipStart = c + Math.floor((w - maxLvl) / 2);
      for (let i = 0; i < maxLvl; i++) {
        grid[pipRow][pipStart + i] = i < level ? '◆' : '◇';
        meta[pipRow][pipStart + i] = {
          color: i < level ? (isSelected ? 'yellow' : structureColor(level, maxLvl)) : 'white',
          bold: i < level,
          dim: i >= level,
        };
      }
    }
  }

  // --- 7. NPCs ---
  for (const npc of NPC_ENTITIES) {
    const pos = NPC_POS[npc.id];
    if (!pos) continue;
    const npcState = keep.npcs.find(n => n.id === npc.id);
    const tier = npcState?.tier ?? 0;
    const isSelected = npc.id === selectedId;
    const color = isSelected ? 'yellow' : npcColor(tier);

    if (isSelected) {
      // Draw selection brackets around NPC
      if (pos.col - 1 > WALL_LEFT) {
        grid[pos.row][pos.col - 1] = '[';
        meta[pos.row][pos.col - 1] = { color: 'yellow', bold: true, dim: false };
      }
      if (pos.col + 1 < WALL_RIGHT) {
        grid[pos.row][pos.col + 1] = ']';
        meta[pos.row][pos.col + 1] = { color: 'yellow', bold: true, dim: false };
      }
    }

    grid[pos.row][pos.col] = npc.symbol;
    meta[pos.row][pos.col] = { color, bold: isSelected || tier >= 3, dim: false };
  }

  // --- 8. Gate ---
  {
    const isSelected = selectedId === 'gate';
    const gateLabel = isSelected ? '┤ ENTER THE PALE ├' : '╡ ENTER THE PALE ╞';
    const gateStart = WALL_LEFT + 1 + Math.floor(((WALL_RIGHT - WALL_LEFT - 1) - gateLabel.length) / 2);
    for (let i = 0; i < gateLabel.length; i++) {
      grid[WALL_BOT][gateStart + i] = gateLabel[i];
      meta[WALL_BOT][gateStart + i] = { color: isSelected ? 'yellow' : 'green', bold: true, dim: false };
    }
  }

  // --- 9. Pale creep on right side ---
  for (let r = 11; r <= 14; r++) {
    for (let c = 48; c < WALL_RIGHT; c++) {
      if (grid[r][c] === ' ' || grid[r][c] === '·') {
        grid[r][c] = '~';
        meta[r][c] = { color: 'white', bold: false, dim: true };
      }
    }
  }

  // --- Build info panel for selected entity ---
  const selected = KEEP_ENTITIES.find(e => e.id === selectedId);
  let infoName = '';
  let infoDetail = '';
  let infoColor = 'cyan';
  let infoLevel: React.ReactNode | null = null;

  if (selected) {
    if (selected.type === 'structure') {
      const def = KEEP_STRUCTURES.find(s => s.id === selected.id);
      const level = getStructureLevel(keep, selected.id);
      const maxLvl = def?.maxLevel ?? 3;
      infoColor = structureColor(level, maxLvl);
      infoName = selected.name;
      if (level >= maxLvl) {
        infoDetail = `${def?.description ?? ''} (fully upgraded)`;
      } else {
        const cost = def?.upgradeCost(level + 1) ?? 0;
        infoDetail = `${def?.description ?? ''} — ${cost} Echoes to upgrade`;
      }
      infoLevel = <Text>{' '}{levelBar(level, maxLvl, infoColor)}</Text>;
    } else if (selected.type === 'npc') {
      const npcState = keep.npcs.find(n => n.id === selected.id);
      const tier = npcState?.tier ?? 0;
      infoColor = npcColor(tier);
      infoName = NPC_FULL_NAMES[selected.id] ?? selected.id;
      infoDetail = NPC_FLAVOR[selected.id] ?? '';
      infoLevel = <Text>{' '}{levelBar(tier, 5, infoColor)}</Text>;
    } else if (selected.type === 'gate') {
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
        {selected ? (
          <Box flexDirection="column">
            <Box>
              <Text bold color={infoColor}>{infoName}</Text>
              {infoLevel}
            </Box>
            <Text dimColor>{infoDetail}</Text>
          </Box>
        ) : (
          <Text dimColor italic>Select a building or NPC.</Text>
        )}
        {message ? <Text color="yellow" bold>{message}</Text> : null}
        <Text dimColor>{'←→ select  Enter interact  q menu'}</Text>
      </Box>
    </Box>
  );
}
