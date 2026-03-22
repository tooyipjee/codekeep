import React from 'react';
import { Box, Text } from 'ink';
import type { ActMap, MapNode } from '@codekeep/shared';

interface MapViewProps {
  map: ActMap;
  currentNodeId: string | null;
  reachableIds: string[];
  selectedNodeId: string | null;
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

function renderConnectionRow(currentRow: MapNode[], nextRow: MapNode[], columnCount: number): string {
  const chars = Array(columnCount).fill('   ');
  for (const node of currentRow) {
    for (const connId of node.connections) {
      const target = nextRow.find(n => n.id === connId);
      if (!target) continue;
      if (target.column === node.column) {
        chars[node.column] = ' │ ';
      } else if (target.column > node.column) {
        chars[node.column] = chars[node.column] === ' │ ' ? ' │╲' : '  ╲';
      } else {
        chars[node.column] = chars[node.column] === ' │ ' ? '╱│ ' : '╱  ';
      }
    }
  }
  return chars.join('  ');
}

export function MapView({ map, currentNodeId, reachableIds, selectedNodeId }: MapViewProps) {
  const reachableSet = new Set(reachableIds);
  const maxRow = Math.max(...map.nodes.map((n) => n.row));

  const rows: MapNode[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    rows.push(map.nodes.filter((n) => n.row === r).sort((a, b) => a.column - b.column));
  }

  const columnCount = 4;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">◆ Act {map.act} Map</Text>
      <Text> </Text>
      {rows.map((row, r) => (
        <React.Fragment key={r}>
          <Box>
            <Text dimColor>{String(r).padStart(2, ' ')} </Text>
            <Box gap={2}>
              {[0, 1, 2, 3].map((col) => {
                const node = row.find((n) => n.column === col);
                if (!node) return <Text key={col}>{'     '}</Text>;
                const isCurrent = node.id === currentNodeId;
                const isReachable = reachableSet.has(node.id);
                const isSelected = node.id === selectedNodeId;
                const color = nodeColor(node, isReachable, isSelected, isCurrent);
                const sym = nodeSymbol(node.type);
                const bracket = isSelected ? `[${sym}]` : isCurrent ? `(${sym})` : ` ${sym} `;
                return (
                  <Text key={col} color={color} bold={isSelected || isCurrent} dimColor={node.visited && !isCurrent}>
                    {bracket}
                  </Text>
                );
              })}
            </Box>
          </Box>
          {r < maxRow && (
            <Box>
              <Text dimColor>{'   '}{renderConnectionRow(row, rows[r + 1] ?? [], columnCount)}</Text>
            </Box>
          )}
        </React.Fragment>
      ))}
      <Text> </Text>
      <Text dimColor>⚔=fight ★=elite △=rest $=shop ?=event ◆=boss</Text>
      <Text dimColor>↑↓ select  Enter proceed  d=deck  q=quit</Text>
    </Box>
  );
}
