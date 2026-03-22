import React from 'react';
import { Box, Text } from 'ink';
import type { ActMap, MapNode } from '@codekeep/shared';

interface MapViewProps {
  map: ActMap;
  currentNodeId: string | null;
  reachableIds: string[];
  selectedNodeId: string | null;
}

const COL_W = 5;
const GAP = '  ';
const COL_COUNT = 4;

function nodeSymbol(type: MapNode['type']): string {
  switch (type) {
    case 'combat': return '⚔';
    case 'elite': return '★';
    case 'rest': return '△';
    case 'shop': return '$';
    case 'event': return '?';
    case 'boss': return '◆';
    default: return '·';
  }
}

function nodeColor(node: MapNode, isReachable: boolean, isSelected: boolean, isCurrent: boolean): string {
  if (isCurrent) return 'cyan';
  if (isSelected) return 'yellow';
  if (node.visited) return 'gray';
  if (!isReachable) return 'gray';
  switch (node.type) {
    case 'combat': return 'white';
    case 'elite': return 'red';
    case 'rest': return 'green';
    case 'shop': return 'yellow';
    case 'event': return 'magenta';
    case 'boss': return 'red';
    default: return 'white';
  }
}

function renderConnectionRow(currentRow: MapNode[], nextRow: MapNode[]): string {
  type Dirs = { straight: boolean; left: boolean; right: boolean };
  const dirs: Record<number, Dirs> = {};

  for (const node of currentRow) {
    if (!dirs[node.column]) dirs[node.column] = { straight: false, left: false, right: false };
    for (const connId of node.connections) {
      const target = nextRow.find(n => n.id === connId);
      if (!target) continue;
      if (target.column === node.column) dirs[node.column].straight = true;
      else if (target.column > node.column) dirs[node.column].right = true;
      else dirs[node.column].left = true;
    }
  }

  const cells: string[] = [];
  for (let c = 0; c < COL_COUNT; c++) {
    const d = dirs[c];
    if (!d) { cells.push(' '.repeat(COL_W)); continue; }
    if (d.left && d.straight && d.right) cells.push(' ╱│╲ ');
    else if (d.left && d.right)          cells.push(' ╱ ╲ ');
    else if (d.left && d.straight)       cells.push(' ╱│  ');
    else if (d.straight && d.right)      cells.push('  │╲ ');
    else if (d.left)                     cells.push(' ╱   ');
    else if (d.right)                    cells.push('   ╲ ');
    else if (d.straight)                 cells.push('  │  ');
    else                                 cells.push(' '.repeat(COL_W));
  }
  return cells.join(GAP);
}

export function MapView({ map, currentNodeId, reachableIds, selectedNodeId }: MapViewProps) {
  const reachableSet = new Set(reachableIds);
  const maxRow = Math.max(...map.nodes.map((n) => n.row));

  const rows: MapNode[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    rows.push(map.nodes.filter((n) => n.row === r).sort((a, b) => a.column - b.column));
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Act ' + map.act + ' — Choose your path'}</Text>
      <Text dimColor>{'─'.repeat(COL_W * COL_COUNT + GAP.length * (COL_COUNT - 1))}</Text>
      <Text> </Text>
      {rows.map((row, r) => (
        <React.Fragment key={r}>
          <Text>
            {Array.from({ length: COL_COUNT }, (_, col) => {
              const node = row.find((n) => n.column === col);
              const sep = col > 0 ? GAP : '';

              if (!node) {
                return <Text key={col}>{sep}{' '.repeat(COL_W)}</Text>;
              }

              const isCurrent = node.id === currentNodeId;
              const isReachable = reachableSet.has(node.id);
              const isSelected = node.id === selectedNodeId;
              const color = nodeColor(node, isReachable, isSelected, isCurrent);
              const sym = nodeSymbol(node.type);
              const display = isSelected ? `[${sym}]` : isCurrent ? `(${sym})` : ` ${sym} `;
              const padded = display.length >= COL_W
                ? display.slice(0, COL_W)
                : display.padStart(Math.ceil((COL_W + display.length) / 2)).padEnd(COL_W);

              return (
                <Text key={col} color={color} bold={isSelected || isCurrent} dimColor={node.visited && !isCurrent}>
                  {sep}{padded}
                </Text>
              );
            })}
          </Text>
          {r < maxRow && (
            <Text dimColor>{renderConnectionRow(row, rows[r + 1] ?? [])}</Text>
          )}
        </React.Fragment>
      ))}
      <Text> </Text>
      <Text dimColor>{'─'.repeat(COL_W * COL_COUNT + GAP.length * (COL_COUNT - 1))}</Text>
      <Box gap={2}>
        <Text dimColor>⚔ fight</Text>
        <Text dimColor color="red">★ elite</Text>
        <Text dimColor color="green">△ rest</Text>
        <Text dimColor color="yellow">$ shop</Text>
        <Text dimColor color="magenta">? event</Text>
        <Text dimColor color="red">◆ boss</Text>
      </Box>
      <Text dimColor>{'↑↓ select  Enter proceed  d deck  q quit'}</Text>
    </Box>
  );
}
