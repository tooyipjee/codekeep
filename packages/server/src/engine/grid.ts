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
    resources.gold >= cost.gold &&
    resources.wood >= cost.wood &&
    resources.stone >= cost.stone
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
  let totalGold = 0;
  let totalWood = 0;
  let totalStone = 0;
  for (let lvl = 1; lvl <= structure.level; lvl++) {
    const cost = STRUCTURE_COSTS[structure.kind][lvl as UpgradeLevel];
    totalGold += cost.gold;
    totalWood += cost.wood;
    totalStone += cost.stone;
  }
  return {
    gold: Math.floor(totalGold * 0.5),
    wood: Math.floor(totalWood * 0.5),
    stone: Math.floor(totalStone * 0.5),
  };
}

function shortageMessage(have: Resources, cost: Resources): string {
  const parts: string[] = [];
  if (cost.gold > have.gold) parts.push(`${cost.gold - have.gold} more gold`);
  if (cost.wood > have.wood) parts.push(`${cost.wood - have.wood} more wood`);
  if (cost.stone > have.stone) parts.push(`${cost.stone - have.stone} more stone`);
  return parts.length > 0 ? `Need ${parts.join(', ')}` : 'Not enough resources';
}

export function subtractResources(a: Resources, b: Resources): Resources {
  return {
    gold: a.gold - b.gold,
    wood: a.wood - b.wood,
    stone: a.stone - b.stone,
  };
}

export function addResources(a: Resources, b: Resources): Resources {
  return {
    gold: a.gold + b.gold,
    wood: a.wood + b.wood,
    stone: a.stone + b.stone,
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
