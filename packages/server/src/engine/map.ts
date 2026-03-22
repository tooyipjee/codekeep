import type { ActMap, MapNode, NodeType } from '@codekeep/shared';
import { mulberry32 } from './rng.js';

const MAP_ROWS = 12;
const COLUMNS_PER_ROW = 4;

function nodeTypeForRow(row: number, totalRows: number, rng: () => number): NodeType {
  if (row === 0) return 'combat';
  if (row === totalRows - 1) return 'boss';

  const roll = rng();
  if (row === Math.floor(totalRows / 2)) {
    return roll < 0.5 ? 'rest' : 'shop';
  }
  if (roll < 0.50) return 'combat';
  if (roll < 0.65) return 'elite';
  if (roll < 0.78) return 'event';
  if (roll < 0.88) return 'rest';
  return 'shop';
}

export function generateActMap(act: number, seed: number): ActMap {
  const rng = mulberry32(seed);
  const nodes: MapNode[] = [];

  const grid: (MapNode | null)[][] = [];

  for (let r = 0; r < MAP_ROWS; r++) {
    const row: (MapNode | null)[] = [];
    const numNodes = r === 0 || r === MAP_ROWS - 1
      ? 1
      : Math.floor(rng() * 2) + 2; // 2-3 nodes per row

    const positions = new Set<number>();
    while (positions.size < numNodes) {
      positions.add(Math.floor(rng() * COLUMNS_PER_ROW));
    }

    for (let c = 0; c < COLUMNS_PER_ROW; c++) {
      if (positions.has(c)) {
        const type = nodeTypeForRow(r, MAP_ROWS, rng);
        const node: MapNode = {
          id: `node-${act}-${r}-${c}`,
          type,
          row: r,
          column: c,
          connections: [],
          visited: false,
        };
        row.push(node);
        nodes.push(node);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }

  // Connect nodes: each node connects to 1-2 nodes in the next row
  for (let r = 0; r < MAP_ROWS - 1; r++) {
    const currentRow = grid[r].filter((n): n is MapNode => n !== null);
    const nextRow = grid[r + 1].filter((n): n is MapNode => n !== null);
    if (nextRow.length === 0) continue;

    for (const node of currentRow) {
      const nearest = nextRow
        .map((n) => ({ node: n, dist: Math.abs(n.column - node.column) }))
        .sort((a, b) => a.dist - b.dist);

      node.connections.push(nearest[0].node.id);
      if (nearest.length > 1 && rng() < 0.4) {
        node.connections.push(nearest[1].node.id);
      }
    }

    // Ensure all next-row nodes are reachable
    for (const next of nextRow) {
      const isReachable = currentRow.some((n) => n.connections.includes(next.id));
      if (!isReachable && currentRow.length > 0) {
        const closest = currentRow
          .map((n) => ({ node: n, dist: Math.abs(n.column - next.column) }))
          .sort((a, b) => a.dist - b.dist)[0];
        closest.node.connections.push(next.id);
      }
    }
  }

  return { act, nodes };
}

export function getNodeById(map: ActMap, id: string): MapNode | undefined {
  return map.nodes.find((n) => n.id === id);
}

export function getReachableNodes(map: ActMap, currentNodeId: string | null): MapNode[] {
  if (!currentNodeId) {
    return map.nodes.filter((n) => n.row === 0);
  }
  const current = getNodeById(map, currentNodeId);
  if (!current) return [];
  return current.connections.map((id) => getNodeById(map, id)).filter((n): n is MapNode => !!n);
}
