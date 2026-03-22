import type { Keep, Resources, RaidReplay, KeepGridState, PlacedStructure, GridCoord, StructureKind, UpgradeLevel } from '@codekeep/shared';
import { GRID_SIZE, STARTING_RESOURCES, STRUCTURE_COSTS } from '@codekeep/shared';
import { simulateRaid, hashSeed, mulberry32, addResources, capResources } from '@codekeep/server';
import { raidDifficulty, buildProbeTypes, simpleRng } from './game-logic.js';

export interface DailyChallengeState {
  dateKey: string;
  seed: number;
  keep: Keep;
  wave: number;
  score: number;
  alive: boolean;
  lastReplay: RaidReplay | null;
  lastGrid: KeepGridState | null;
}

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createDailyChallenge(): DailyChallengeState {
  const dateKey = getTodayKey();
  const seed = hashSeed(dateKey);
  const rng = mulberry32(seed);

  const structures: PlacedStructure[] = [];
  const cx = Math.floor(GRID_SIZE / 2);
  const cy = Math.floor(GRID_SIZE / 2);
  structures.push({
    id: 'treasury-8-8',
    kind: 'treasury',
    level: 1,
    pos: { x: cx, y: cy },
    placedAtUnixMs: Date.now(),
  });

  const keep: Keep = {
    id: `daily-${dateKey}`,
    name: `Daily Challenge ${dateKey}`,
    ownerPlayerId: 'daily',
    grid: { width: GRID_SIZE, height: GRID_SIZE, structures },
    resources: { gold: 60, wood: 30, stone: 20 },
    createdAtUnixMs: Date.now(),
    updatedAtUnixMs: Date.now(),
  };

  return { dateKey, seed, keep, wave: 0, score: 0, alive: true, lastReplay: null, lastGrid: null };
}

export function runDailyChallengeWave(state: DailyChallengeState): DailyChallengeState {
  if (!state.alive) return state;

  const wave = state.wave + 1;
  const difficulty = Math.min(10, Math.floor(wave / 2) + 1);
  const probeCount = 3 + difficulty;
  const waveSeed = `daily-${state.dateKey}-wave-${wave}`;
  const rng = simpleRng(hashSeed(waveSeed));
  const probeTypes = buildProbeTypes(probeCount, difficulty, rng);

  const replay = simulateRaid({ probeCount, keepGrid: state.keep.grid, seed: waveSeed, probeTypes });
  const lastEvent = replay.events[replay.events.length - 1];

  if (lastEvent?.type !== 'raid_end') return { ...state, wave, lastReplay: replay, lastGrid: state.keep.grid };

  const won = lastEvent.outcome === 'defense_win';
  const raidersKilled = replay.events.filter((e) => e.type === 'raider_destroyed').length;
  const waveScore = won ? (probeCount * difficulty * 10) : (raidersKilled * difficulty * 3);

  const lootLost = replay.events
    .filter((e): e is Extract<typeof e, { type: 'treasury_breach' }> => e.type === 'treasury_breach')
    .reduce(
      (sum, e) => ({ gold: sum.gold + e.lootTaken.gold, wood: sum.wood + e.lootTaken.wood, stone: sum.stone + e.lootTaken.stone }),
      { gold: 0, wood: 0, stone: 0 },
    );

  const bonus: Resources = won
    ? { gold: 10 + difficulty * 3, wood: 5 + difficulty * 2, stone: 5 + difficulty * 2 }
    : { gold: 0, wood: 0, stone: 0 };

  const afterLoss: Resources = {
    gold: Math.max(0, state.keep.resources.gold - lootLost.gold),
    wood: Math.max(0, state.keep.resources.wood - lootLost.wood),
    stone: Math.max(0, state.keep.resources.stone - lootLost.stone),
  };
  const updatedResources = capResources(addResources(afterLoss, bonus));

  return {
    ...state,
    wave,
    score: state.score + waveScore,
    alive: won,
    keep: { ...state.keep, resources: updatedResources },
    lastReplay: replay,
    lastGrid: state.keep.grid,
  };
}

export function getDailyChallengeProofHash(state: DailyChallengeState): string {
  const data = `${state.dateKey}:${state.wave}:${state.score}`;
  return Math.abs(hashSeed(data)).toString(36).slice(0, 8);
}
