import React from 'react';
import { Box, Text } from 'ink';
import type { ActMap, MapNode } from '@codekeep/shared';

interface MapViewProps {
  map: ActMap;
  currentNodeId: string | null;
  reachableIds: string[];
  selectedNodeId: string | null;
}

const COL_SP = 10;
const NUM_COLS = 4;
const MAP_W = (NUM_COLS - 1) * COL_SP + 6;

function colX(col: number): number {
  return col * COL_SP + 3;
}

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

function nodeColor(node: MapNode, reachable: boolean, selected: boolean, current: boolean): string {
  if (current) return 'cyan';
  if (selected) return 'yellow';
  if (node.visited) return 'gray';
  if (!reachable) return 'gray';
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

type Seg = { text: string; color?: string; bold?: boolean; dim?: boolean };

function buildNodeLine(
  row: MapNode[],
  selectedId: string | null,
  currentId: string | null,
  reachable: Set<string>,
): Seg[] {
  const segs: Seg[] = [];
  let pos = 0;
  const sorted = [...row].sort((a, b) => a.column - b.column);

  for (const node of sorted) {
    const center = colX(node.column);
    const s = nodeSymbol(node.type);
    const isSel = node.id === selectedId;
    const isCur = node.id === currentId;
    const display = isSel ? `[${s}]` : isCur ? `(${s})` : ` ${s} `;
    const startX = center - Math.floor(display.length / 2);

    if (startX > pos) segs.push({ text: ' '.repeat(startX - pos) });

    segs.push({
      text: display,
      color: nodeColor(node, reachable.has(node.id), isSel, isCur),
      bold: isSel || isCur,
      dim: node.visited && !isCur && !isSel,
    });
    pos = startX + display.length;
  }
  return segs;
}

function buildConnLine(cur: MapNode[], next: MapNode[]): string {
  const chars: string[] = Array(MAP_W).fill(' ');
  const marks = new Map<number, Set<string>>();

  function mark(p: number, ch: string) {
    if (p < 0 || p >= MAP_W) return;
    if (!marks.has(p)) marks.set(p, new Set());
    marks.get(p)!.add(ch);
  }

  for (const node of cur) {
    const sx = colX(node.column);
    for (const connId of node.connections) {
      const target = next.find(n => n.id === connId);
      if (!target) continue;
      const tx = colX(target.column);
      if (sx === tx) {
        mark(sx, '│');
      } else {
        mark(Math.round((sx + tx) / 2), tx > sx ? '╲' : '╱');
      }
    }
  }

  for (const [p, set] of marks) {
    if (set.has('╲') && set.has('╱')) chars[p] = '╳';
    else if (set.has('│')) chars[p] = '│';
    else if (set.has('╲')) chars[p] = '╲';
    else if (set.has('╱')) chars[p] = '╱';
  }
  return chars.join('');
}

export function MapView({ map, currentNodeId, reachableIds, selectedNodeId }: MapViewProps) {
  const reachable = new Set(reachableIds);
  const maxRow = Math.max(...map.nodes.map(n => n.row));

  const rows: MapNode[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    rows.push(map.nodes.filter(n => n.row === r).sort((a, b) => a.column - b.column));
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ Act ' + map.act + ' — Choose your path'}</Text>
      <Text dimColor>{'─'.repeat(MAP_W)}</Text>
      <Text> </Text>
      {rows.map((row, r) => {
        const segs = buildNodeLine(row, selectedNodeId, currentNodeId, reachable);
        return (
          <React.Fragment key={r}>
            <Text>
              {segs.map((seg, i) => (
                <Text key={i} color={seg.color} bold={seg.bold} dimColor={seg.dim}>{seg.text}</Text>
              ))}
            </Text>
            {r < maxRow && <Text dimColor>{buildConnLine(row, rows[r + 1] ?? [])}</Text>}
          </React.Fragment>
        );
      })}
      <Text> </Text>
      <Text dimColor>{'─'.repeat(MAP_W)}</Text>
      <Box gap={2}>
        <Text dimColor>⚔ fight</Text>
        <Text dimColor color="red">★ elite</Text>
        <Text dimColor color="green">△ rest</Text>
        <Text dimColor color="yellow">$ shop</Text>
        <Text dimColor color="magenta">? event</Text>
        <Text dimColor color="red">◆ boss</Text>
      </Box>
      <Text dimColor>{'←→ select  Enter proceed  d deck  q quit'}</Text>
    </Box>
  );
}
