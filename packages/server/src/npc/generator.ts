import {
  type Keep,
  type PlacedStructure,
  type StructureKind,
  type UpgradeLevel,
  type GridCoord,
  GRID_SIZE,
  STARTING_RESOURCES,
  VAULT_MAX_COUNT,
} from '@codekeep/shared';
import { mulberry32, hashSeed } from '../engine/raid-sim.js';

export interface NpcDifficulty {
  level: number;
  structureCount: number;
  maxUpgradeLevel: UpgradeLevel;
  probeCount: number;
}

export const NPC_DIFFICULTIES: NpcDifficulty[] = [
  { level: 1, structureCount: 4, maxUpgradeLevel: 1, probeCount: 3 },
  { level: 2, structureCount: 8, maxUpgradeLevel: 1, probeCount: 4 },
  { level: 3, structureCount: 12, maxUpgradeLevel: 2, probeCount: 5 },
  { level: 4, structureCount: 16, maxUpgradeLevel: 2, probeCount: 6 },
  { level: 5, structureCount: 22, maxUpgradeLevel: 3, probeCount: 8 },
];

export function generateNpcKeep(seed: string, difficulty: number): Keep {
  const diff = NPC_DIFFICULTIES[Math.max(0, Math.min(difficulty - 1, NPC_DIFFICULTIES.length - 1))];
  const rng = mulberry32(hashSeed(seed));

  const structures: PlacedStructure[] = [];
  const occupied = new Set<string>();

  const treasuryCount = Math.max(1, Math.floor(diff.structureCount / 5));
  for (let i = 0; i < treasuryCount; i++) {
    const pos = findFreeInnerPos(rng, occupied);
    if (!pos) break;
    structures.push(makeStructure('treasury', pos, randomLevel(rng, diff.maxUpgradeLevel)));
    occupied.add(`${pos.x},${pos.y}`);
  }

  const wallCount = Math.floor(diff.structureCount * 0.35);
  for (let i = 0; i < wallCount; i++) {
    const pos = findFreeNearStructures(rng, occupied, structures);
    if (!pos) break;
    structures.push(makeStructure('wall', pos, randomLevel(rng, diff.maxUpgradeLevel)));
    occupied.add(`${pos.x},${pos.y}`);
  }

  const trapCount = Math.floor(diff.structureCount * 0.2);
  for (let i = 0; i < trapCount; i++) {
    const pos = findFreeNearEdge(rng, occupied);
    if (!pos) break;
    structures.push(makeStructure('trap', pos, randomLevel(rng, diff.maxUpgradeLevel)));
    occupied.add(`${pos.x},${pos.y}`);
  }

  const wardCount = Math.max(1, Math.floor(diff.structureCount * 0.15));
  for (let i = 0; i < wardCount; i++) {
    const allTreasuries = structures.filter((s) => s.kind === 'treasury');
    const treasury = allTreasuries.length > 0 ? allTreasuries[Math.floor(rng() * allTreasuries.length)] : undefined;
    if (!treasury) break;
    const adjacents: GridCoord[] = [
      { x: treasury.pos.x - 1, y: treasury.pos.y },
      { x: treasury.pos.x + 1, y: treasury.pos.y },
      { x: treasury.pos.x, y: treasury.pos.y - 1 },
      { x: treasury.pos.x, y: treasury.pos.y + 1 },
    ].filter((p) => p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE && !occupied.has(`${p.x},${p.y}`));

    if (adjacents.length > 0) {
      const pos = adjacents[Math.floor(rng() * adjacents.length)];
      structures.push(makeStructure('ward', pos, randomLevel(rng, diff.maxUpgradeLevel)));
      occupied.add(`${pos.x},${pos.y}`);
    }
  }

  const archerCount = Math.max(0, Math.floor(diff.structureCount * 0.10));
  for (let i = 0; i < archerCount; i++) {
    const pos = findFreeNearStructures(rng, occupied, structures);
    if (!pos) break;
    structures.push(makeStructure('archerTower', pos, randomLevel(rng, diff.maxUpgradeLevel)));
    occupied.add(`${pos.x},${pos.y}`);
  }

  for (let i = 0; i < VAULT_MAX_COUNT; i++) {
    const pos = findFreeInnerPos(rng, occupied);
    if (!pos) break;
    structures.push(makeStructure('vault', pos, randomLevel(rng, diff.maxUpgradeLevel)));
    occupied.add(`${pos.x},${pos.y}`);
  }

  const remaining = diff.structureCount - structures.length;
  for (let i = 0; i < remaining; i++) {
    const pos = findFreePos(rng, occupied);
    if (!pos) break;
    structures.push(makeStructure('watchtower', pos, randomLevel(rng, diff.maxUpgradeLevel)));
    occupied.add(`${pos.x},${pos.y}`);
  }

  return {
    id: `npc-${seed}-${difficulty}`,
    name: `NPC Keep (Lv.${diff.level})`,
    ownerPlayerId: 'npc',
    grid: { width: 16, height: 16, structures },
    resources: { ...STARTING_RESOURCES },
    createdAtUnixMs: Date.now(),
    updatedAtUnixMs: Date.now(),
  };
}

function makeStructure(kind: StructureKind, pos: GridCoord, level: UpgradeLevel): PlacedStructure {
  return {
    id: `${kind}-${pos.x}-${pos.y}`,
    kind,
    level,
    pos: { ...pos },
    placedAtUnixMs: Date.now(),
  };
}

function randomLevel(rng: () => number, max: UpgradeLevel): UpgradeLevel {
  const val = Math.floor(rng() * max) + 1;
  return Math.min(max, val) as UpgradeLevel;
}

function findFreeInnerPos(rng: () => number, occupied: Set<string>): GridCoord | null {
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = 4 + Math.floor(rng() * (GRID_SIZE - 8));
    const y = 4 + Math.floor(rng() * (GRID_SIZE - 8));
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
  return null;
}

function findFreeNearStructures(rng: () => number, occupied: Set<string>, structures: PlacedStructure[]): GridCoord | null {
  for (let attempts = 0; attempts < 50; attempts++) {
    const ref = structures[Math.floor(rng() * structures.length)];
    const dx = Math.floor(rng() * 3) - 1;
    const dy = Math.floor(rng() * 3) - 1;
    const x = ref.pos.x + dx;
    const y = ref.pos.y + dy;
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !occupied.has(`${x},${y}`)) {
      return { x, y };
    }
  }
  return null;
}

function findFreeNearEdge(rng: () => number, occupied: Set<string>): GridCoord | null {
  for (let attempts = 0; attempts < 50; attempts++) {
    const edge = Math.floor(rng() * 4);
    let x: number, y: number;
    if (edge === 0) { x = Math.floor(rng() * GRID_SIZE); y = Math.floor(rng() * 3); }
    else if (edge === 1) { x = Math.floor(rng() * GRID_SIZE); y = GRID_SIZE - 1 - Math.floor(rng() * 3); }
    else if (edge === 2) { x = Math.floor(rng() * 3); y = Math.floor(rng() * GRID_SIZE); }
    else { x = GRID_SIZE - 1 - Math.floor(rng() * 3); y = Math.floor(rng() * GRID_SIZE); }
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
  return null;
}

function findFreePos(rng: () => number, occupied: Set<string>): GridCoord | null {
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = Math.floor(rng() * GRID_SIZE);
    const y = Math.floor(rng() * GRID_SIZE);
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
  return null;
}
