import { describe, it, expect } from 'vitest';
import { generateActMap, getReachableNodes, getNodeById } from '../src/engine/map.js';

describe('map generation', () => {
  it('generates a map with nodes', () => {
    const map = generateActMap(1, 42);
    expect(map.act).toBe(1);
    expect(map.nodes.length).toBeGreaterThan(5);
  });

  it('first row has exactly one starting node', () => {
    const map = generateActMap(1, 42);
    const startNodes = map.nodes.filter((n) => n.row === 0);
    expect(startNodes.length).toBe(1);
  });

  it('last row has a boss node', () => {
    const map = generateActMap(1, 42);
    const maxRow = Math.max(...map.nodes.map((n) => n.row));
    const bossNodes = map.nodes.filter((n) => n.row === maxRow);
    expect(bossNodes.length).toBe(1);
    expect(bossNodes[0].type).toBe('boss');
  });

  it('all non-last-row nodes have connections', () => {
    const map = generateActMap(1, 42);
    const maxRow = Math.max(...map.nodes.map((n) => n.row));
    const nonLastRow = map.nodes.filter((n) => n.row < maxRow);
    for (const node of nonLastRow) {
      expect(node.connections.length).toBeGreaterThan(0);
    }
  });

  it('getReachableNodes returns first row when no current node', () => {
    const map = generateActMap(1, 42);
    const reachable = getReachableNodes(map, null);
    expect(reachable.length).toBeGreaterThan(0);
    expect(reachable.every((n) => n.row === 0)).toBe(true);
  });

  it('deterministic: same seed produces same map', () => {
    const map1 = generateActMap(1, 42);
    const map2 = generateActMap(1, 42);
    expect(map1.nodes.length).toBe(map2.nodes.length);
    expect(map1.nodes.map((n) => n.id)).toEqual(map2.nodes.map((n) => n.id));
  });
});
