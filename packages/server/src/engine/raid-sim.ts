import {
  type GridCoord,
  type KeepGridState,
  type RaidReplay,
  type RaidTickEvent,
  type RaidOutcome,
  type Resources,
  type PlacedStructure,
  type UpgradeLevel,
  type ProbeType,
  type StructureKind,
  GRID_SIZE,
  TICK_RATE_HZ,
  MAX_RAID_TICKS,
  RAIDER_TYPES,
} from '@codekeep/shared';
import {
  getWallHp,
  getArcherTowerHp,
  getWatchtowerHp,
  getTrapStunTicks,
  getTrapCooldown,
  getEffectiveMitigation,
  getTreasuryCapacity,
  getArcherDamage,
  getArcherRange,
  getArcherCooldown,
  manhattanDistance,
} from './structures.js';

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return hash;
}

type Edge = 'N' | 'S' | 'E' | 'W';

interface Raider {
  id: number;
  pos: GridCoord;
  hp: number;
  raiderType: ProbeType;
  stunRemaining: number;
  targetId: string | null;
  alive: boolean;
  looted: Resources;
}

interface SolidStructure {
  structureId: string;
  kind: StructureKind;
  pos: GridCoord;
  hp: number;
  destroyed: boolean;
}

interface TrapState {
  structureId: string;
  pos: GridCoord;
  level: UpgradeLevel;
  cooldownRemaining: number;
}

interface TreasuryState {
  structureId: string;
  pos: GridCoord;
  level: UpgradeLevel;
  storedResources: number;
}

interface ArcherState {
  structureId: string;
  pos: GridCoord;
  level: UpgradeLevel;
  cooldownRemaining: number;
  destroyed: boolean;
}

interface RaidState {
  tick: number;
  raiders: Raider[];
  solids: SolidStructure[];
  traps: TrapState[];
  archers: ArcherState[];
  treasuries: TreasuryState[];
  events: RaidTickEvent[];
  grid: boolean[][];
  totalLoot: Resources;
}

function getSpawnPos(edge: Edge, offset: number): GridCoord {
  switch (edge) {
    case 'N': return { x: offset, y: 0 };
    case 'S': return { x: offset, y: GRID_SIZE - 1 };
    case 'E': return { x: GRID_SIZE - 1, y: offset };
    case 'W': return { x: 0, y: offset };
  }
}

function isPassable(state: RaidState, pos: GridCoord): boolean {
  if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) return false;
  return state.grid[pos.y][pos.x];
}

function rebuildPassability(state: RaidState): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      state.grid[y][x] = true;
    }
  }
  for (const s of state.solids) {
    if (!s.destroyed) {
      state.grid[s.pos.y][s.pos.x] = false;
    }
  }
}

function astarNextStep(
  from: GridCoord,
  to: GridCoord,
  state: RaidState,
): GridCoord | null {
  if (from.x === to.x && from.y === to.y) return null;

  const key = (c: GridCoord) => `${c.x},${c.y}`;
  const openSet = new Map<string, { pos: GridCoord; g: number; f: number; parent: string | null }>();
  const closedSet = new Set<string>();

  const h = (a: GridCoord) => Math.abs(a.x - to.x) + Math.abs(a.y - to.y);
  const startKey = key(from);
  openSet.set(startKey, { pos: from, g: 0, f: h(from), parent: null });

  const cameFrom = new Map<string, string>();

  while (openSet.size > 0) {
    let bestKey = '';
    let bestF = Infinity;
    for (const [k, v] of openSet) {
      if (v.f < bestF) {
        bestF = v.f;
        bestKey = k;
      }
    }

    const current = openSet.get(bestKey)!;
    openSet.delete(bestKey);

    if (current.pos.x === to.x && current.pos.y === to.y) {
      let traceKey = key(to);
      let prevKey = cameFrom.get(traceKey);
      while (prevKey && prevKey !== startKey) {
        traceKey = prevKey;
        prevKey = cameFrom.get(traceKey);
      }
      const [tx, ty] = traceKey.split(',').map(Number);
      return { x: tx, y: ty };
    }

    closedSet.add(bestKey);

    const neighbors: GridCoord[] = [
      { x: current.pos.x - 1, y: current.pos.y },
      { x: current.pos.x + 1, y: current.pos.y },
      { x: current.pos.x, y: current.pos.y - 1 },
      { x: current.pos.x, y: current.pos.y + 1 },
    ];

    for (const n of neighbors) {
      const nk = key(n);
      if (closedSet.has(nk)) continue;
      if (!isPassable(state, n) && !(n.x === to.x && n.y === to.y)) continue;

      const tentG = current.g + 1;
      const existing = openSet.get(nk);
      if (existing && tentG >= existing.g) continue;

      cameFrom.set(nk, bestKey);
      openSet.set(nk, { pos: n, g: tentG, f: tentG + h(n), parent: bestKey });
    }
  }

  return null;
}

function getStructureHp(kind: StructureKind, level: UpgradeLevel): number {
  switch (kind) {
    case 'wall': return getWallHp(level);
    case 'archerTower': return getArcherTowerHp(level);
    case 'watchtower': return getWatchtowerHp(level);
    default: return 0;
  }
}

const DEFENSE_KINDS: StructureKind[] = ['archerTower', 'watchtower'];

function findAdjacentSolid(state: RaidState, pos: GridCoord): SolidStructure | undefined {
  return state.solids.find(
    (s) => !s.destroyed && manhattanDistance(s.pos, pos) === 1,
  );
}

function attackSolid(state: RaidState, raider: Raider, target: SolidStructure): void {
  target.hp -= RAIDER_TYPES[raider.raiderType].damage;
  const destroyed = target.hp <= 0;
  if (destroyed) {
    target.destroyed = true;
    rebuildPassability(state);
    // Also mark archer as destroyed if it was an archer tower
    const archer = state.archers.find((a) => a.structureId === target.structureId);
    if (archer) archer.destroyed = true;
  }

  if (target.kind === 'wall') {
    state.events.push({
      t: state.tick,
      type: 'wall_damaged',
      structureId: target.structureId,
      hpRemaining: Math.max(0, target.hp),
      destroyed,
    });
  } else {
    state.events.push({
      t: state.tick,
      type: 'structure_damaged',
      structureId: target.structureId,
      structureKind: target.kind,
      hpRemaining: Math.max(0, target.hp),
      destroyed,
    });
  }
}

function moveTowardSolid(state: RaidState, raider: Raider, target: SolidStructure): boolean {
  const adjCells: GridCoord[] = [
    { x: target.pos.x - 1, y: target.pos.y },
    { x: target.pos.x + 1, y: target.pos.y },
    { x: target.pos.x, y: target.pos.y - 1 },
    { x: target.pos.x, y: target.pos.y + 1 },
  ].filter((c) => isPassable(state, c));

  const bestAdj = adjCells.sort((a, b) => {
    const da = manhattanDistance(a, raider.pos);
    const db = manhattanDistance(b, raider.pos);
    return da - db;
  })[0];

  if (!bestAdj) return false;

  if (manhattanDistance(raider.pos, bestAdj) === 0) return false;

  const step = astarNextStep(raider.pos, bestAdj, state);
  if (!step) return false;

  const from = { ...raider.pos };
  raider.pos = { ...step };
  state.events.push({
    t: state.tick,
    type: 'raider_move',
    probeId: raider.id,
    from,
    to: { ...raider.pos },
  });
  return true;
}

/**
 * Brute AI: prioritize destroying defense structures (archers > watchtowers),
 * then fall back to treasury like a normal raider.
 */
function brutePickTarget(state: RaidState, raider: Raider): SolidStructure | null {
  const defenses = state.solids
    .filter((s) => !s.destroyed && DEFENSE_KINDS.includes(s.kind))
    .sort((a, b) => {
      // Prefer archer towers over watchtowers
      const aIsArcher = a.kind === 'archerTower' ? 0 : 1;
      const bIsArcher = b.kind === 'archerTower' ? 0 : 1;
      if (aIsArcher !== bIsArcher) return aIsArcher - bIsArcher;
      return manhattanDistance(a.pos, raider.pos) - manhattanDistance(b.pos, raider.pos);
    });
  return defenses[0] ?? null;
}

/**
 * Scout AI: find the weakest blocking structure (lowest HP) to break through.
 */
function scoutPickWeakestBlocker(state: RaidState, raider: Raider): SolidStructure | null {
  const adjacent = state.solids.filter(
    (s) => !s.destroyed && manhattanDistance(s.pos, raider.pos) === 1,
  );
  if (adjacent.length === 0) return null;
  return adjacent.sort((a, b) => a.hp - b.hp)[0];
}

export interface RaidConfig {
  probeCount: number;
  keepGrid: KeepGridState;
  seed: string;
  probeTypes?: ProbeType[];
}

export function simulateRaid(config: RaidConfig): RaidReplay {
  const rng = mulberry32(hashSeed(config.seed));
  const { keepGrid } = config;

  const solidKinds: StructureKind[] = ['wall', 'archerTower', 'watchtower'];
  const solids: SolidStructure[] = keepGrid.structures
    .filter((s) => solidKinds.includes(s.kind))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      kind: s.kind,
      pos: { ...s.pos },
      hp: getStructureHp(s.kind, s.level),
      destroyed: false,
    }));

  const traps: TrapState[] = keepGrid.structures
    .filter((s) => s.kind === 'trap')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      level: s.level,
      cooldownRemaining: 0,
    }));

  const archers: ArcherState[] = keepGrid.structures
    .filter((s) => s.kind === 'archerTower')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      level: s.level,
      cooldownRemaining: 0,
      destroyed: false,
    }));

  let treasuries: TreasuryState[] = keepGrid.structures
    .filter((s) => s.kind === 'treasury')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      level: s.level,
      storedResources: getTreasuryCapacity(s.level),
    }));

  if (treasuries.length === 0) {
    treasuries = [{
      structureId: '__virtual_center_treasury',
      pos: { x: 8, y: 8 },
      level: 1,
      storedResources: getTreasuryCapacity(1),
    }];
  }

  const state: RaidState = {
    tick: 0,
    raiders: [],
    solids,
    traps,
    archers,
    treasuries,
    events: [],
    grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(true) as boolean[]),
    totalLoot: { gold: 0, wood: 0, stone: 0 },
  };

  rebuildPassability(state);

  const edges: Edge[] = ['N', 'S', 'E', 'W'];
  for (let i = 0; i < config.probeCount; i++) {
    const edge = edges[Math.floor(rng() * edges.length)];
    const offset = Math.floor(rng() * GRID_SIZE);
    const pos = getSpawnPos(edge, offset);

    let closestTreasury: TreasuryState | null = null;
    let closestDist = Infinity;
    for (const v of treasuries) {
      const d = manhattanDistance(v.pos, pos);
      if (d < closestDist) {
        closestDist = d;
        closestTreasury = v;
      }
    }

    const raiderType: ProbeType = config.probeTypes?.[i] ?? 'raider';
    state.raiders.push({
      id: i,
      pos: { ...pos },
      hp: RAIDER_TYPES[raiderType].hp,
      raiderType,
      stunRemaining: 0,
      targetId: closestTreasury?.structureId ?? null,
      alive: true,
      looted: { gold: 0, wood: 0, stone: 0 },
    });

    state.events.push({
      t: 0,
      type: 'raider_spawn',
      probeId: i,
      edge,
      pos: { ...pos },
      raiderType,
      maxHp: RAIDER_TYPES[raiderType].hp,
    });
  }

  while (state.tick < MAX_RAID_TICKS) {
    state.tick++;

    for (const tr of state.traps) {
      if (tr.cooldownRemaining > 0) tr.cooldownRemaining--;
    }

    for (const ar of state.archers) {
      if (ar.cooldownRemaining > 0) ar.cooldownRemaining--;
    }

    const aliveRaiders = state.raiders.filter((r) => r.alive).sort((a, b) => a.id - b.id);
    if (aliveRaiders.length === 0) break;

    // Archers fire (only non-destroyed archers)
    for (const ar of state.archers) {
      if (ar.destroyed || ar.cooldownRemaining > 0) continue;
      const range = getArcherRange(ar.level);
      const damage = getArcherDamage(ar.level);
      const inRange = aliveRaiders.filter(
        (r) => r.alive && manhattanDistance(ar.pos, r.pos) <= range,
      );
      const target = inRange.length === 0 ? undefined
        : inRange.sort((a, b) => {
            const aStunned = a.stunRemaining > 0 ? 0 : 1;
            const bStunned = b.stunRemaining > 0 ? 0 : 1;
            if (aStunned !== bStunned) return aStunned - bStunned;
            const aTreasury = state.treasuries.find(t => t.structureId === a.targetId);
            const bTreasury = state.treasuries.find(t => t.structureId === b.targetId);
            const aDist = aTreasury ? manhattanDistance(a.pos, aTreasury.pos) : Infinity;
            const bDist = bTreasury ? manhattanDistance(b.pos, bTreasury.pos) : Infinity;
            return aDist - bDist;
          })[0];
      if (target) {
        target.hp -= damage;
        ar.cooldownRemaining = getArcherCooldown(ar.level);
        if (target.hp <= 0) {
          target.alive = false;
          state.events.push({
            t: state.tick, type: 'arrow_hit', probeId: target.id,
            archerId: ar.structureId, damage, hpRemaining: 0,
          });
          state.events.push({
            t: state.tick, type: 'raider_destroyed', probeId: target.id, pos: { ...target.pos },
          });
        } else {
          state.events.push({
            t: state.tick, type: 'arrow_hit', probeId: target.id,
            archerId: ar.structureId, damage, hpRemaining: target.hp,
          });
        }
      }
    }

    // Each raider takes their turn
    for (const raider of aliveRaiders) {
      if (!raider.alive) continue;

      if (raider.stunRemaining > 0) {
        raider.stunRemaining--;
        continue;
      }

      const moveCount = RAIDER_TYPES[raider.raiderType].speed;
      for (let move = 0; move < moveCount; move++) {
        if (!raider.alive) break;

        // === BRUTE AI: prioritize destroying defense structures ===
        if (raider.raiderType === 'brute') {
          const defTarget = brutePickTarget(state, raider);
          if (defTarget) {
            // Adjacent? Attack it.
            if (manhattanDistance(raider.pos, defTarget.pos) === 1) {
              attackSolid(state, raider, defTarget);
              break;
            }
            // Try to pathfind toward the defense structure
            if (moveTowardSolid(state, raider, defTarget)) {
              // Check for trap at new position
              const trap = state.traps.find(
                (tr) => tr.pos.x === raider.pos.x && tr.pos.y === raider.pos.y && tr.cooldownRemaining === 0,
              );
              if (trap) {
                raider.stunRemaining = getTrapStunTicks(trap.level);
                trap.cooldownRemaining = getTrapCooldown(trap.level);
                state.events.push({
                  t: state.tick, type: 'raider_stunned', probeId: raider.id,
                  pos: { ...raider.pos }, trapId: trap.structureId, stunTicks: raider.stunRemaining,
                });
                break;
              }
              continue;
            }
            // Can't reach — attack whatever is adjacent
            const adj = findAdjacentSolid(state, raider.pos);
            if (adj) {
              attackSolid(state, raider, adj);
              break;
            }
            // Nothing adjacent and no path — fall through to treasury targeting
          }
        }

        // === COMMON: find treasury target ===
        const targetTreasury = state.treasuries.find((v) => v.structureId === raider.targetId);
        if (!targetTreasury || targetTreasury.storedResources <= 0) {
          const newTarget = state.treasuries
            .filter((v) => v.storedResources > 0)
            .sort((a, b) => {
              const da = manhattanDistance(a.pos, raider.pos);
              const db = manhattanDistance(b.pos, raider.pos);
              return da - db || a.structureId.localeCompare(b.structureId);
            })[0];

          if (!newTarget) {
            raider.alive = false;
            state.events.push({ t: state.tick, type: 'raider_destroyed', probeId: raider.id, pos: { ...raider.pos } });
            break;
          }
          raider.targetId = newTarget.structureId;
        }

        const treasuryTarget = state.treasuries.find((v) => v.structureId === raider.targetId)!;

        // At treasury? Loot it.
        if (raider.pos.x === treasuryTarget.pos.x && raider.pos.y === treasuryTarget.pos.y) {
          const mitigation = getEffectiveMitigation(keepGrid, treasuryTarget.pos);
          const lootAmount = Math.max(1, Math.floor(RAIDER_TYPES[raider.raiderType].loot * treasuryTarget.level * (1 - mitigation)));
          const actualLoot = Math.min(lootAmount, treasuryTarget.storedResources);
          treasuryTarget.storedResources -= actualLoot;

          const goldShare = Math.ceil(actualLoot * 0.4);
          const woodShare = Math.ceil(actualLoot * 0.35);
          const stoneShare = Math.max(0, actualLoot - goldShare - woodShare);
          const lootGrant: Resources = { gold: goldShare, wood: woodShare, stone: stoneShare };
          raider.looted.gold += goldShare;
          raider.looted.wood += woodShare;
          raider.looted.stone += stoneShare;
          state.totalLoot.gold += goldShare;
          state.totalLoot.wood += woodShare;
          state.totalLoot.stone += stoneShare;

          state.events.push({
            t: state.tick, type: 'treasury_breach',
            structureId: treasuryTarget.structureId, lootTaken: lootGrant,
          });
          break;
        }

        // Try to pathfind to treasury
        const nextStep = astarNextStep(raider.pos, treasuryTarget.pos, state);
        if (!nextStep) {
          // === SCOUT AI: attack weakest adjacent blocker ===
          if (raider.raiderType === 'scout') {
            const weakest = scoutPickWeakestBlocker(state, raider);
            if (weakest) {
              attackSolid(state, raider, weakest);
              break;
            }
          }

          // Standard: attack any adjacent solid
          const adj = findAdjacentSolid(state, raider.pos);
          if (adj) {
            attackSolid(state, raider, adj);
          } else {
            // Not adjacent to anything — walk toward nearest solid
            const nearest = state.solids
              .filter((s) => !s.destroyed)
              .sort((a, b) => manhattanDistance(a.pos, raider.pos) - manhattanDistance(b.pos, raider.pos))[0];
            if (nearest) {
              moveTowardSolid(state, raider, nearest);
            }
          }
          break;
        }

        // Move one step
        const from = { ...raider.pos };
        raider.pos = { ...nextStep };
        state.events.push({
          t: state.tick, type: 'raider_move', probeId: raider.id,
          from, to: { ...raider.pos },
        });

        // Check for trap
        const trap = state.traps.find(
          (tr) => tr.pos.x === raider.pos.x && tr.pos.y === raider.pos.y && tr.cooldownRemaining === 0,
        );
        if (trap) {
          const stunTicks = getTrapStunTicks(trap.level);
          raider.stunRemaining = stunTicks;
          trap.cooldownRemaining = getTrapCooldown(trap.level);
          state.events.push({
            t: state.tick, type: 'raider_stunned', probeId: raider.id,
            pos: { ...raider.pos }, trapId: trap.structureId, stunTicks,
          });
          break;
        }
      }
    }

    if (state.raiders.every((r) => !r.alive || r.stunRemaining > 100)) break;
  }

  const totalTreasuryResources = state.treasuries.reduce((sum, v) => sum + v.storedResources, 0);
  const totalOriginal = state.treasuries.reduce((sum, v) => sum + getTreasuryCapacity(v.level), 0);
  let outcome: RaidOutcome;

  const totalLooted = state.totalLoot.gold + state.totalLoot.wood + state.totalLoot.stone;
  if (totalLooted === 0) {
    outcome = 'defense_win';
  } else if (totalTreasuryResources > 0 && totalLooted < totalOriginal * 0.5) {
    outcome = 'partial_breach';
  } else {
    outcome = 'full_breach';
  }

  state.events.push({ t: state.tick, type: 'raid_end', outcome });

  return {
    tickRateHz: TICK_RATE_HZ,
    maxTicks: state.tick,
    events: state.events,
  };
}
