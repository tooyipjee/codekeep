import {
  type DataFragment,
  type FragmentType,
  type GridCoord,
  type KeepGridState,
  type Resources,
  FRAGMENT_TYPES,
  FRAGMENT_MAX,
  FRAGMENT_DECAY_MS,
  FRAGMENT_TREASURY_BONUS,
  FRAGMENT_TREASURY_RANGE,
  GRID_SIZE,
  WATCHTOWER_RANGE,
} from '@codekeep/shared';

function manhattanDist(a: GridCoord, b: GridCoord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickFragmentType(rng: () => number): FragmentType {
  const types = Object.entries(FRAGMENT_TYPES) as [FragmentType, (typeof FRAGMENT_TYPES)[FragmentType]][];
  const totalWeight = types.reduce((sum, [, def]) => sum + def.weight, 0);
  let roll = rng() * totalWeight;
  for (const [type, def] of types) {
    roll -= def.weight;
    if (roll <= 0) return type;
  }
  return 'gold_nugget';
}

function isOccupied(pos: GridCoord, grid: KeepGridState, fragments: DataFragment[]): boolean {
  if (grid.structures.some((s) => s.pos.x === pos.x && s.pos.y === pos.y)) return true;
  if (fragments.some((f) => f.pos.x === pos.x && f.pos.y === pos.y)) return true;
  return false;
}

/**
 * Spawn 1-2 new fragments on empty cells. Archer towers on the grid boost spawn count.
 * Returns the updated fragments array (old + new).
 */
export function spawnFragments(
  fragments: DataFragment[],
  grid: KeepGridState,
  nowMs: number,
  rng: () => number,
): DataFragment[] {
  if (fragments.length >= FRAGMENT_MAX) return fragments;

  const archerCount = grid.structures.filter((s) => s.kind === 'archerTower').length;
  const bonusSpawns = Math.min(archerCount, 2);
  const baseSpawns = 1 + (rng() < 0.4 ? 1 : 0);
  const targetSpawns = Math.min(baseSpawns + bonusSpawns, FRAGMENT_MAX - fragments.length);

  const newFragments: DataFragment[] = [];

  for (let i = 0; i < targetSpawns; i++) {
    let pos: GridCoord | null = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = Math.floor(rng() * GRID_SIZE);
      const y = Math.floor(rng() * GRID_SIZE);
      const candidate = { x, y };
      if (!isOccupied(candidate, grid, [...fragments, ...newFragments])) {
        pos = candidate;
        break;
      }
    }
    if (!pos) break;

    newFragments.push({
      id: `frag-${nowMs}-${i}`,
      type: pickFragmentType(rng),
      pos,
      spawnedAtMs: nowMs,
    });
  }

  return [...fragments, ...newFragments];
}

/**
 * Collect fragment at the given position. Returns the yield (with treasury proximity bonus)
 * and the updated fragments array, or null if no fragment at that position.
 */
export function collectFragment(
  fragments: DataFragment[],
  pos: GridCoord,
  grid: KeepGridState,
): { yield: Resources; updatedFragments: DataFragment[]; collected: DataFragment[] } | null {
  const directIdx = fragments.findIndex((f) => f.pos.x === pos.x && f.pos.y === pos.y);
  if (directIdx === -1) return null;

  const collected: DataFragment[] = [fragments[directIdx]];

  const watchtowers = grid.structures.filter((s) => s.kind === 'watchtower');
  let maxWatchtowerRange = 0;
  for (const wt of watchtowers) {
    if (manhattanDist(wt.pos, pos) <= WATCHTOWER_RANGE[wt.level]) {
      maxWatchtowerRange = Math.max(maxWatchtowerRange, wt.level);
    }
  }
  if (maxWatchtowerRange > 0) {
    for (const f of fragments) {
      if (collected.includes(f)) continue;
      if (manhattanDist(pos, f.pos) <= maxWatchtowerRange) {
        collected.push(f);
      }
    }
  }

  const collectedIds = new Set(collected.map((f) => f.id));
  let totalYield: Resources = { gold: 0, wood: 0, stone: 0 };

  for (const f of collected) {
    const baseYield = FRAGMENT_TYPES[f.type].yield;
    let yieldMultiplier = 1;

    const nearTreasury = grid.structures.some(
      (s) => s.kind === 'treasury' && manhattanDist(s.pos, f.pos) <= FRAGMENT_TREASURY_RANGE,
    );
    if (nearTreasury) yieldMultiplier += FRAGMENT_TREASURY_BONUS;

    totalYield = {
      gold: totalYield.gold + Math.ceil(baseYield.gold * yieldMultiplier),
      wood: totalYield.wood + Math.ceil(baseYield.wood * yieldMultiplier),
      stone: totalYield.stone + Math.ceil(baseYield.stone * yieldMultiplier),
    };
  }

  return {
    yield: totalYield,
    updatedFragments: fragments.filter((f) => !collectedIds.has(f.id)),
    collected,
  };
}

export function decayFragments(fragments: DataFragment[], nowMs: number): DataFragment[] {
  return fragments.filter((f) => nowMs - f.spawnedAtMs < FRAGMENT_DECAY_MS);
}
