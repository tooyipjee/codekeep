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
  PROBE_BASE_HP,
  PROBE_DAMAGE_PER_TICK,
  PROBE_LOOT_PER_TICK,
  PROBE_TYPES,
  SCANNER_DAMAGE,
  SCANNER_RANGE,
  SCANNER_COOLDOWN_TICKS,
} from '@codekeep/shared';
import {
  getFirewallHp,
  getHoneypotStunTicks,
  getHoneypotCooldown,
  getEffectiveMitigation,
  getVaultCapacity,
  getScannerDamage,
  getScannerRange,
  getScannerCooldown,
  manhattanDistance,
} from './structures.js';

// Mulberry32 PRNG — deterministic 32-bit
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

interface Probe {
  id: number;
  pos: GridCoord;
  hp: number;
  probeType: ProbeType;
  stunRemaining: number;
  targetVaultId: string | null;
  alive: boolean;
  looted: Resources;
}

interface FirewallState {
  structureId: string;
  pos: GridCoord;
  hp: number;
  destroyed: boolean;
}

interface HoneypotState {
  structureId: string;
  pos: GridCoord;
  level: UpgradeLevel;
  cooldownRemaining: number;
}

interface VaultState {
  structureId: string;
  pos: GridCoord;
  level: UpgradeLevel;
  storedResources: number;
}

interface ScannerState {
  structureId: string;
  pos: GridCoord;
  level: UpgradeLevel;
  cooldownRemaining: number;
}

interface RaidState {
  tick: number;
  probes: Probe[];
  firewalls: FirewallState[];
  honeypots: HoneypotState[];
  scanners: ScannerState[];
  vaults: VaultState[];
  events: RaidTickEvent[];
  grid: boolean[][]; // passability cache
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
  for (const fw of state.firewalls) {
    if (!fw.destroyed) {
      state.grid[fw.pos.y][fw.pos.x] = false;
    }
  }
}

// Simple A* for 4-neighbor grid
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
      // Allow the target even if it's "impassable" (vault cells are passable, but check the target specifically)
      if (!isPassable(state, n) && !(n.x === to.x && n.y === to.y)) continue;

      const tentG = current.g + 1;
      const existing = openSet.get(nk);
      if (existing && tentG >= existing.g) continue;

      cameFrom.set(nk, bestKey);
      openSet.set(nk, { pos: n, g: tentG, f: tentG + h(n), parent: bestKey });
    }
  }

  return null; // no path
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

  const firewalls: FirewallState[] = keepGrid.structures
    .filter((s) => s.kind === 'firewall')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      hp: getFirewallHp(s.level),
      destroyed: false,
    }));

  const honeypots: HoneypotState[] = keepGrid.structures
    .filter((s) => s.kind === 'honeypot')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      level: s.level,
      cooldownRemaining: 0,
    }));

  const scanners: ScannerState[] = keepGrid.structures
    .filter((s) => s.kind === 'scanner')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      level: s.level,
      cooldownRemaining: 0,
    }));

  let vaults: VaultState[] = keepGrid.structures
    .filter((s) => s.kind === 'dataVault')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      structureId: s.id,
      pos: { ...s.pos },
      level: s.level,
      storedResources: getVaultCapacity(s.level),
    }));

  if (vaults.length === 0) {
    vaults = [{
      structureId: '__virtual_center_vault',
      pos: { x: 8, y: 8 },
      level: 1,
      storedResources: getVaultCapacity(1),
    }];
  }

  const state: RaidState = {
    tick: 0,
    probes: [],
    firewalls,
    honeypots,
    scanners,
    vaults,
    events: [],
    grid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(true) as boolean[]),
    totalLoot: { compute: 0, memory: 0, bandwidth: 0 },
  };

  rebuildPassability(state, keepGrid.structures);

  // Spawn probes from random edges
  const edges: Edge[] = ['N', 'S', 'E', 'W'];
  for (let i = 0; i < config.probeCount; i++) {
    const edge = edges[Math.floor(rng() * edges.length)];
    const offset = Math.floor(rng() * GRID_SIZE);
    const pos = getSpawnPos(edge, offset);

    // Pick closest vault as target
    let closestVault: VaultState | null = null;
    let closestDist = Infinity;
    for (const v of vaults) {
      const d = Math.abs(v.pos.x - pos.x) + Math.abs(v.pos.y - pos.y);
      if (d < closestDist) {
        closestDist = d;
        closestVault = v;
      }
    }

    const probeType: ProbeType = config.probeTypes?.[i] ?? 'standard';
    state.probes.push({
      id: i,
      pos: { ...pos },
      hp: PROBE_TYPES[probeType].hp,
      probeType,
      stunRemaining: 0,
      targetVaultId: closestVault?.structureId ?? null,
      alive: true,
      looted: { compute: 0, memory: 0, bandwidth: 0 },
    });

    state.events.push({
      t: 0,
      type: 'probe_spawn',
      probeId: i,
      edge,
      pos: { ...pos },
    });
  }

  // Simulation loop
  while (state.tick < MAX_RAID_TICKS) {
    state.tick++;

    // Tick honeypot cooldowns
    for (const hp of state.honeypots) {
      if (hp.cooldownRemaining > 0) hp.cooldownRemaining--;
    }

    // Tick scanner cooldowns
    for (const sc of state.scanners) {
      if (sc.cooldownRemaining > 0) sc.cooldownRemaining--;
    }

    const aliveProbes = state.probes.filter((p) => p.alive).sort((a, b) => a.id - b.id);
    if (aliveProbes.length === 0) break;

    // Scanner attacks: damage probes in range
    for (const sc of state.scanners) {
      if (sc.cooldownRemaining > 0) continue;
      const range = getScannerRange(sc.level);
      const damage = getScannerDamage(sc.level);
      const target = aliveProbes.find(
        (p) => p.alive && p.stunRemaining === 0 && manhattanDistance(sc.pos, p.pos) <= range,
      );
      if (target) {
        target.hp -= damage;
        sc.cooldownRemaining = getScannerCooldown(sc.level);
        if (target.hp <= 0) {
          target.alive = false;
          state.events.push({
            t: state.tick,
            type: 'scanner_hit',
            probeId: target.id,
            scannerId: sc.structureId,
            damage,
            hpRemaining: 0,
          });
          state.events.push({
            t: state.tick,
            type: 'probe_destroyed',
            probeId: target.id,
            pos: { ...target.pos },
          });
        } else {
          state.events.push({
            t: state.tick,
            type: 'scanner_hit',
            probeId: target.id,
            scannerId: sc.structureId,
            damage,
            hpRemaining: target.hp,
          });
        }
      }
    }

    for (const probe of aliveProbes) {
      if (!probe.alive) continue;

      if (probe.stunRemaining > 0) {
        probe.stunRemaining--;
        continue;
      }

      const moveCount = PROBE_TYPES[probe.probeType].speed;
      for (let move = 0; move < moveCount; move++) {
        if (!probe.alive) break;

        // Find target vault
        const targetVault = state.vaults.find((v) => v.structureId === probe.targetVaultId);
        if (!targetVault || targetVault.storedResources <= 0) {
          // Retarget to next vault with resources
          const newTarget = state.vaults
            .filter((v) => v.storedResources > 0)
            .sort((a, b) => {
              const da = Math.abs(a.pos.x - probe.pos.x) + Math.abs(a.pos.y - probe.pos.y);
              const db = Math.abs(b.pos.x - probe.pos.x) + Math.abs(b.pos.y - probe.pos.y);
              return da - db || a.structureId.localeCompare(b.structureId);
            })[0];

          if (!newTarget) {
            probe.alive = false;
            state.events.push({ t: state.tick, type: 'probe_destroyed', probeId: probe.id, pos: { ...probe.pos } });
            break;
          }
          probe.targetVaultId = newTarget.structureId;
        }

        const vaultTarget = state.vaults.find((v) => v.structureId === probe.targetVaultId)!;

        // Check if on vault cell — loot
        if (probe.pos.x === vaultTarget.pos.x && probe.pos.y === vaultTarget.pos.y) {
          const mitigation = getEffectiveMitigation(keepGrid, vaultTarget.pos);
          const lootAmount = Math.max(1, Math.floor(PROBE_TYPES[probe.probeType].loot * vaultTarget.level * (1 - mitigation)));
          const actualLoot = Math.min(lootAmount, vaultTarget.storedResources);
          vaultTarget.storedResources -= actualLoot;

          const lootGrant: Resources = { compute: 0, memory: actualLoot, bandwidth: 0 };
          probe.looted.memory += actualLoot;
          state.totalLoot.memory += actualLoot;

          state.events.push({
            t: state.tick,
            type: 'vault_breach',
            structureId: vaultTarget.structureId,
            lootTaken: lootGrant,
          });
          break;
        }

        // Check if adjacent to firewall blocking path — attack it
        const nextStep = astarNextStep(probe.pos, vaultTarget.pos, state);
        if (!nextStep) {
          const adjacentFw = state.firewalls.find(
            (fw) =>
              !fw.destroyed &&
              Math.abs(fw.pos.x - probe.pos.x) + Math.abs(fw.pos.y - probe.pos.y) === 1,
          );
          if (adjacentFw) {
            adjacentFw.hp -= PROBE_TYPES[probe.probeType].damage;
            const destroyed = adjacentFw.hp <= 0;
            if (destroyed) {
              adjacentFw.destroyed = true;
              rebuildPassability(state, keepGrid.structures);
            }
            state.events.push({
              t: state.tick,
              type: 'firewall_damaged',
              structureId: adjacentFw.structureId,
              hpRemaining: Math.max(0, adjacentFw.hp),
              destroyed,
            });
          }
          break;
        }

        // Move to next step
        const from = { ...probe.pos };
        probe.pos = { ...nextStep };
        state.events.push({
          t: state.tick,
          type: 'probe_move',
          probeId: probe.id,
          from,
          to: { ...probe.pos },
        });

        // Check for honeypot on new position
        const honeypot = state.honeypots.find(
          (hp) => hp.pos.x === probe.pos.x && hp.pos.y === probe.pos.y && hp.cooldownRemaining === 0,
        );
        if (honeypot) {
          const stunTicks = getHoneypotStunTicks(honeypot.level);
          probe.stunRemaining = stunTicks;
          honeypot.cooldownRemaining = getHoneypotCooldown(honeypot.level);
          state.events.push({
            t: state.tick,
            type: 'probe_stunned',
            probeId: probe.id,
            pos: { ...probe.pos },
            honeypotId: honeypot.structureId,
            stunTicks,
          });
          break;
        }
      }
    }

    // Check if all probes are done
    if (state.probes.every((p) => !p.alive || p.stunRemaining > 100)) break;
  }

  // Determine outcome
  const totalVaultResources = state.vaults.reduce((sum, v) => sum + v.storedResources, 0);
  const totalOriginal = state.vaults.reduce((sum, v) => sum + getVaultCapacity(v.level), 0);
  let outcome: RaidOutcome;

  if (state.totalLoot.memory === 0) {
    outcome = 'defense_win';
  } else if (totalVaultResources > 0 && state.totalLoot.memory < totalOriginal * 0.5) {
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
