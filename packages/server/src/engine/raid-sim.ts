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
  GRID_SIZE,
  TICK_RATE_HZ,
  MAX_RAID_TICKS,
  RAIDER_BASE_HP,
  RAIDER_DAMAGE_PER_TICK,
  RAIDER_LOOT_PER_TICK,
  RAIDER_TYPES,
  ARCHER_DAMAGE,
  ARCHER_RANGE,
  ARCHER_COOLDOWN_TICKS,
} from '@codekeep/shared';
import {
  getWallHp,
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
  targetTreasuryId: string | null;
  alive: boolean;
  looted: Resources;
}

interface WallState {
  structureId: string;
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
}

interface RaidState {
  tick: number;
  raiders: Raider[];
  walls: WallState[];
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

function rebuildPassability(state: RaidState, allStructures: PlacedStructure[]): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      state.grid[y][x] = true;
    }
  }
  for (const w of state.walls) {
    if (!w.destroyed) {
      state.grid[w.pos.y][w.pos.x] = false;
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

export interface RaidConfig {
  probeCount: number;
  keepGrid: KeepGridState;
  seed: string;
  probeTypes?: ProbeType[];
}

export function simulateRaid(config: RaidConfig): RaidReplay {
  const rng = mulberry32(hashSeed(config.seed));
  const { keepGrid } = config;

  const walls: WallState[] = keepGrid.structures
    .filter((s) => s.kind === 'wall')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      hp: getWallHp(s.level),
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
    walls,
    traps,
    archers,
    treasuries,
    events: [],
    grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(true) as boolean[]),
    totalLoot: { gold: 0, wood: 0, stone: 0 },
  };

  rebuildPassability(state, keepGrid.structures);

  const edges: Edge[] = ['N', 'S', 'E', 'W'];
  for (let i = 0; i < config.probeCount; i++) {
    const edge = edges[Math.floor(rng() * edges.length)];
    const offset = Math.floor(rng() * GRID_SIZE);
    const pos = getSpawnPos(edge, offset);

    let closestTreasury: TreasuryState | null = null;
    let closestDist = Infinity;
    for (const v of treasuries) {
      const d = Math.abs(v.pos.x - pos.x) + Math.abs(v.pos.y - pos.y);
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
      targetTreasuryId: closestTreasury?.structureId ?? null,
      alive: true,
      looted: { gold: 0, wood: 0, stone: 0 },
    });

    state.events.push({
      t: 0,
      type: 'raider_spawn',
      probeId: i,
      edge,
      pos: { ...pos },
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

    for (const ar of state.archers) {
      if (ar.cooldownRemaining > 0) continue;
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
            const aTreasury = state.treasuries.find(t => t.structureId === a.targetTreasuryId);
            const bTreasury = state.treasuries.find(t => t.structureId === b.targetTreasuryId);
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
            t: state.tick,
            type: 'arrow_hit',
            probeId: target.id,
            archerId: ar.structureId,
            damage,
            hpRemaining: 0,
          });
          state.events.push({
            t: state.tick,
            type: 'raider_destroyed',
            probeId: target.id,
            pos: { ...target.pos },
          });
        } else {
          state.events.push({
            t: state.tick,
            type: 'arrow_hit',
            probeId: target.id,
            archerId: ar.structureId,
            damage,
            hpRemaining: target.hp,
          });
        }
      }
    }

    for (const raider of aliveRaiders) {
      if (!raider.alive) continue;

      if (raider.stunRemaining > 0) {
        raider.stunRemaining--;
        continue;
      }

      const moveCount = RAIDER_TYPES[raider.raiderType].speed;
      for (let move = 0; move < moveCount; move++) {
        if (!raider.alive) break;

        const targetTreasury = state.treasuries.find((v) => v.structureId === raider.targetTreasuryId);
        if (!targetTreasury || targetTreasury.storedResources <= 0) {
          const newTarget = state.treasuries
            .filter((v) => v.storedResources > 0)
            .sort((a, b) => {
              const da = Math.abs(a.pos.x - raider.pos.x) + Math.abs(a.pos.y - raider.pos.y);
              const db = Math.abs(b.pos.x - raider.pos.x) + Math.abs(b.pos.y - raider.pos.y);
              return da - db || a.structureId.localeCompare(b.structureId);
            })[0];

          if (!newTarget) {
            raider.alive = false;
            state.events.push({ t: state.tick, type: 'raider_destroyed', probeId: raider.id, pos: { ...raider.pos } });
            break;
          }
          raider.targetTreasuryId = newTarget.structureId;
        }

        const treasuryTarget = state.treasuries.find((v) => v.structureId === raider.targetTreasuryId)!;

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
            t: state.tick,
            type: 'treasury_breach',
            structureId: treasuryTarget.structureId,
            lootTaken: lootGrant,
          });
          break;
        }

        const nextStep = astarNextStep(raider.pos, treasuryTarget.pos, state);
        if (!nextStep) {
          const adjacentWall = state.walls.find(
            (w) =>
              !w.destroyed &&
              Math.abs(w.pos.x - raider.pos.x) + Math.abs(w.pos.y - raider.pos.y) === 1,
          );
          if (adjacentWall) {
            adjacentWall.hp -= RAIDER_TYPES[raider.raiderType].damage;
            const destroyed = adjacentWall.hp <= 0;
            if (destroyed) {
              adjacentWall.destroyed = true;
              rebuildPassability(state, keepGrid.structures);
            }
            state.events.push({
              t: state.tick,
              type: 'wall_damaged',
              structureId: adjacentWall.structureId,
              hpRemaining: Math.max(0, adjacentWall.hp),
              destroyed,
            });
          }
          break;
        }

        const from = { ...raider.pos };
        raider.pos = { ...nextStep };
        state.events.push({
          t: state.tick,
          type: 'raider_move',
          probeId: raider.id,
          from,
          to: { ...raider.pos },
        });

        const trap = state.traps.find(
          (tr) => tr.pos.x === raider.pos.x && tr.pos.y === raider.pos.y && tr.cooldownRemaining === 0,
        );
        if (trap) {
          const stunTicks = getTrapStunTicks(trap.level);
          raider.stunRemaining = stunTicks;
          trap.cooldownRemaining = getTrapCooldown(trap.level);
          state.events.push({
            t: state.tick,
            type: 'raider_stunned',
            probeId: raider.id,
            pos: { ...raider.pos },
            trapId: trap.structureId,
            stunTicks,
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
