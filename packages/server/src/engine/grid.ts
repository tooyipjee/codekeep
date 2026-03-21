import {
  type GridCoord,
  type Keep,
  type KeepGridState,
  type PlacedStructure,
  type StructureKind,
  type UpgradeLevel,
  type Resources,
  GRID_SIZE,
  STRUCTURE_COSTS,
  STARTING_RESOURCES,
} from '@codekeep/shared';

export function isInBounds(pos: GridCoord): boolean {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE;
}

export function getStructureAt(grid: KeepGridState, pos: GridCoord): PlacedStructure | undefined {
  return grid.structures.find((s) => s.pos.x === pos.x && s.pos.y === pos.y);
}

export function canPlaceStructure(
  grid: KeepGridState,
  pos: GridCoord,
  _kind: StructureKind,
): { ok: boolean; reason?: string } {
  if (!isInBounds(pos)) {
    return { ok: false, reason: 'Out of bounds' };
  }
  if (getStructureAt(grid, pos)) {
    return { ok: false, reason: 'Cell is occupied' };
  }
  return { ok: true };
}

export function canAfford(resources: Resources, cost: Resources): boolean {
  return (
    resources.compute >= cost.compute &&
    resources.memory >= cost.memory &&
    resources.bandwidth >= cost.bandwidth
  );
}

export function placeStructure(
  keep: Keep,
  pos: GridCoord,
  kind: StructureKind,
): { ok: boolean; keep?: Keep; reason?: string } {
  const check = canPlaceStructure(keep.grid, pos, kind);
  if (!check.ok) return { ok: false, reason: check.reason };

  const cost = STRUCTURE_COSTS[kind][1];
  if (!canAfford(keep.resources, cost)) {
    return { ok: false, reason: shortageMessage(keep.resources, cost) };
  }

  const structure: PlacedStructure = {
    id: `${kind}-${pos.x}-${pos.y}-${Date.now()}`,
    kind,
    level: 1,
    pos: { ...pos },
    placedAtUnixMs: Date.now(),
  };

  return {
    ok: true,
    keep: {
      ...keep,
      resources: subtractResources(keep.resources, cost),
      grid: {
        ...keep.grid,
        structures: [...keep.grid.structures, structure],
      },
      updatedAtUnixMs: Date.now(),
    },
  };
}

export function upgradeStructure(
  keep: Keep,
  pos: GridCoord,
): { ok: boolean; keep?: Keep; reason?: string } {
  const structure = getStructureAt(keep.grid, pos);
  if (!structure) {
    return { ok: false, reason: 'No structure at this position' };
  }
  if (structure.level >= 3) {
    return { ok: false, reason: 'Already at max level' };
  }

  const nextLevel = (structure.level + 1) as UpgradeLevel;
  const cost = STRUCTURE_COSTS[structure.kind][nextLevel];
  if (!canAfford(keep.resources, cost)) {
    return { ok: false, reason: shortageMessage(keep.resources, cost) };
  }

  const upgraded: PlacedStructure = { ...structure, level: nextLevel };
  return {
    ok: true,
    keep: {
      ...keep,
      resources: subtractResources(keep.resources, cost),
      grid: {
        ...keep.grid,
        structures: keep.grid.structures.map((s) => (s.id === structure.id ? upgraded : s)),
      },
      updatedAtUnixMs: Date.now(),
    },
  };
}

export function demolishStructure(
  keep: Keep,
  pos: GridCoord,
): { ok: boolean; keep?: Keep; reason?: string } {
  const structure = getStructureAt(keep.grid, pos);
  if (!structure) {
    return { ok: false, reason: 'No structure at this position' };
  }

  const refund = getRefund(structure);
  return {
    ok: true,
    keep: {
      ...keep,
      resources: addResources(keep.resources, refund),
      grid: {
        ...keep.grid,
        structures: keep.grid.structures.filter((s) => s.id !== structure.id),
      },
      updatedAtUnixMs: Date.now(),
    },
  };
}

function getRefund(structure: PlacedStructure): Resources {
  let totalCompute = 0;
  let totalMemory = 0;
  let totalBandwidth = 0;
  for (let lvl = 1; lvl <= structure.level; lvl++) {
    const cost = STRUCTURE_COSTS[structure.kind][lvl as UpgradeLevel];
    totalCompute += cost.compute;
    totalMemory += cost.memory;
    totalBandwidth += cost.bandwidth;
  }
  return {
    compute: Math.floor(totalCompute * 0.5),
    memory: Math.floor(totalMemory * 0.5),
    bandwidth: Math.floor(totalBandwidth * 0.5),
  };
}

function shortageMessage(have: Resources, cost: Resources): string {
  const parts: string[] = [];
  if (cost.compute > have.compute) parts.push(`${cost.compute - have.compute} more compute`);
  if (cost.memory > have.memory) parts.push(`${cost.memory - have.memory} more memory`);
  if (cost.bandwidth > have.bandwidth) parts.push(`${cost.bandwidth - have.bandwidth} more bandwidth`);
  return parts.length > 0 ? `Need ${parts.join(', ')}` : 'Not enough resources';
}

export function subtractResources(a: Resources, b: Resources): Resources {
  return {
    compute: a.compute - b.compute,
    memory: a.memory - b.memory,
    bandwidth: a.bandwidth - b.bandwidth,
  };
}

export function addResources(a: Resources, b: Resources): Resources {
  return {
    compute: a.compute + b.compute,
    memory: a.memory + b.memory,
    bandwidth: a.bandwidth + b.bandwidth,
  };
}

export function createEmptyKeep(playerId: string, name: string): Keep {
  return {
    id: `keep-${playerId}-${Date.now()}`,
    name,
    ownerPlayerId: playerId,
    grid: { width: 16, height: 16, structures: [] },
    resources: { ...STARTING_RESOURCES },
    createdAtUnixMs: Date.now(),
    updatedAtUnixMs: Date.now(),
  };
}
