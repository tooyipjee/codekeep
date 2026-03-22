import type { KeepGridState, GridCoord, PlacedStructure } from '@codekeep/shared';
import { GRID_SIZE } from '@codekeep/shared';
import { manhattanDistance } from './structures.js';

export interface ActiveSynergy {
  id: string;
  name: string;
  affectedStructureIds: string[];
}

function chebyshev(a: GridCoord, b: GridCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function evaluateSynergies(grid: KeepGridState): ActiveSynergy[] {
  const synergies: ActiveSynergy[] = [];
  const structures = grid.structures;

  const traps = structures.filter((s) => s.kind === 'trap');
  const archers = structures.filter((s) => s.kind === 'archerTower');
  const walls = structures.filter((s) => s.kind === 'wall');
  const wards = structures.filter((s) => s.kind === 'ward');
  const treasuries = structures.filter((s) => s.kind === 'treasury');
  const watchtowers = structures.filter((s) => s.kind === 'watchtower');

  // Killbox: Trap + Archer Tower adjacent (chebyshev <= 1)
  for (const trap of traps) {
    for (const archer of archers) {
      if (chebyshev(trap.pos, archer.pos) <= 1) {
        const existing = synergies.find((s) => s.id === 'killbox' && s.affectedStructureIds.includes(archer.id));
        if (existing) {
          if (!existing.affectedStructureIds.includes(trap.id)) existing.affectedStructureIds.push(trap.id);
        } else {
          synergies.push({ id: 'killbox', name: 'Killbox', affectedStructureIds: [trap.id, archer.id] });
        }
      }
    }
  }

  // Fortress: 3+ walls in a horizontal or vertical line
  const wallSet = new Set(walls.map((w) => `${w.pos.x},${w.pos.y}`));
  const wallById = new Map(walls.map((w) => [`${w.pos.x},${w.pos.y}`, w]));
  const usedInFortress = new Set<string>();

  for (const wall of walls) {
    if (usedInFortress.has(wall.id)) continue;
    // Check horizontal
    const hLine: PlacedStructure[] = [wall];
    for (let dx = 1; wallSet.has(`${wall.pos.x + dx},${wall.pos.y}`); dx++) {
      hLine.push(wallById.get(`${wall.pos.x + dx},${wall.pos.y}`)!);
    }
    if (hLine.length >= 3) {
      const ids = hLine.map((w) => w.id);
      ids.forEach((id) => usedInFortress.add(id));
      synergies.push({ id: 'fortress', name: 'Fortress', affectedStructureIds: ids });
    }

    // Check vertical
    const vLine: PlacedStructure[] = [wall];
    for (let dy = 1; wallSet.has(`${wall.pos.x},${wall.pos.y + dy}`); dy++) {
      vLine.push(wallById.get(`${wall.pos.x},${wall.pos.y + dy}`)!);
    }
    if (vLine.length >= 3) {
      const ids = vLine.map((w) => w.id);
      ids.forEach((id) => usedInFortress.add(id));
      synergies.push({ id: 'fortress', name: 'Fortress', affectedStructureIds: ids });
    }
  }

  // Sanctum: Ward + Treasury + Watchtower all adjacent to each other
  for (const ward of wards) {
    const adjTreasuries = treasuries.filter((t) => chebyshev(ward.pos, t.pos) <= 1);
    const adjWatchtowers = watchtowers.filter((w) => chebyshev(ward.pos, w.pos) <= 1);
    if (adjTreasuries.length > 0 && adjWatchtowers.length > 0) {
      const ids = [ward.id, ...adjTreasuries.map((t) => t.id), ...adjWatchtowers.map((w) => w.id)];
      synergies.push({ id: 'sanctum', name: 'Sanctum', affectedStructureIds: [...new Set(ids)] });
    }
  }

  // Gauntlet: 2+ traps within manhattan distance 3
  for (let i = 0; i < traps.length; i++) {
    const nearby = traps.filter((t, j) => j !== i && manhattanDistance(traps[i].pos, t.pos) <= 3);
    if (nearby.length >= 1) {
      const ids = [traps[i].id, ...nearby.map((t) => t.id)];
      const uniqueIds = [...new Set(ids)].sort();
      const key = uniqueIds.join(',');
      if (!synergies.some((s) => s.id === 'gauntlet' && s.affectedStructureIds.sort().join(',') === key)) {
        synergies.push({ id: 'gauntlet', name: 'Gauntlet', affectedStructureIds: uniqueIds });
      }
    }
  }

  return synergies;
}
