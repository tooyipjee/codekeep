import type { GameSave, Resources, RaidReplay, KeepGridState, RaidRecord } from '@codekeep/shared';
import { capResources, addResources } from '@codekeep/server';
import type { RaidSummary } from '../hooks/useGameState.js';

export interface RaidOutcomeResult {
  updatedSave: GameSave;
  raidRecord: RaidRecord;
  summary: RaidSummary;
  defenseBonus: Resources;
  lootLost: Resources;
  lootGained: Resources;
  won: boolean;
  archerKills: number;
}

export function processRaidOutcome(opts: {
  gameSave: GameSave;
  replay: RaidReplay;
  raidType: 'attack' | 'defend';
  seed: string;
  difficulty: number;
  probeCount: number;
  attackerId: string;
  defenderKeepId: string;
  defenderGrid?: KeepGridState;
}): RaidOutcomeResult | null {
  const { gameSave, replay, raidType, seed, difficulty, probeCount, attackerId, defenderKeepId, defenderGrid } = opts;

  const lastEvent = replay.events[replay.events.length - 1];
  if (lastEvent?.type !== 'raid_end') return null;

  const isDefense = raidType === 'defend';
  const won = isDefense
    ? lastEvent.outcome === 'defense_win'
    : lastEvent.outcome !== 'defense_win';

  const lootFromBreaches = replay.events
    .filter((e): e is Extract<typeof e, { type: 'treasury_breach' }> => e.type === 'treasury_breach')
    .reduce(
      (sum, e) => ({ gold: sum.gold + e.lootTaken.gold, wood: sum.wood + e.lootTaken.wood, stone: sum.stone + e.lootTaken.stone }),
      { gold: 0, wood: 0, stone: 0 },
    );

  const raidersKilled = replay.events.filter((e) => e.type === 'raider_destroyed').length;
  const wallsDestroyed = replay.events.filter((e) => e.type === 'wall_damaged' && e.destroyed).length;
  const archerKills = replay.events.filter((e) => e.type === 'arrow_hit' && e.hpRemaining <= 0).length;
  const archersActive = (isDefense ? gameSave.keep.grid : (defenderGrid ?? gameSave.keep.grid))
    .structures.filter((s) => s.kind === 'archerTower').length;

  const killRatio = probeCount > 0 ? raidersKilled / probeCount : 0;

  let defenseBonus: Resources;
  let lootGained: Resources;
  let lootLost: Resources;

  if (isDefense) {
    lootLost = lootFromBreaches;
    lootGained = won
      ? { gold: 10 + difficulty * 3, wood: 5 + difficulty * 2, stone: 5 + difficulty * 2 }
      : { gold: Math.floor(killRatio * difficulty * 2), wood: Math.floor(killRatio * difficulty), stone: Math.floor(killRatio * difficulty) };
    defenseBonus = lootGained;
  } else {
    lootLost = { gold: 0, wood: 0, stone: 0 };
    lootGained = won ? lootFromBreaches : { gold: 0, wood: 0, stone: 0 };
    defenseBonus = { gold: 0, wood: 0, stone: 0 };
  }

  const afterLoss = isDefense
    ? {
        gold: Math.max(0, gameSave.keep.resources.gold - lootLost.gold),
        wood: Math.max(0, gameSave.keep.resources.wood - lootLost.wood),
        stone: Math.max(0, gameSave.keep.resources.stone - lootLost.stone),
      }
    : gameSave.keep.resources;

  const updatedResources = capResources(addResources(afterLoss, lootGained));
  const newWinStreak = won ? gameSave.progression.currentWinStreak + 1 : 0;

  const raidRecord: RaidRecord = {
    id: seed,
    seed,
    rulesVersion: 1,
    attackerId,
    defenderKeepId,
    startedAtUnixMs: Date.now(),
    resolvedAtUnixMs: Date.now(),
    outcome: lastEvent.outcome,
    lootLost,
    lootGained,
    replay,
    ...(defenderGrid ? { defenderGrid } : {}),
  };

  const updatedSave: GameSave = {
    ...gameSave,
    keep: { ...gameSave.keep, resources: updatedResources },
    raidHistory: [...gameSave.raidHistory.slice(-19), raidRecord],
    progression: {
      ...gameSave.progression,
      totalRaidsWon: gameSave.progression.totalRaidsWon + (won ? 1 : 0),
      totalRaidsLost: gameSave.progression.totalRaidsLost + (won ? 0 : 1),
      currentWinStreak: newWinStreak,
      bestWinStreak: Math.max(gameSave.progression.bestWinStreak, newWinStreak),
      totalRaidersKilledByArcher: gameSave.progression.totalRaidersKilledByArcher + archerKills,
    },
  };

  const summary: RaidSummary = {
    won,
    raidType,
    outcome: lastEvent.outcome,
    lootGained,
    lootLost,
    raidersKilled,
    raidersTotal: replay.events.filter((e) => e.type === 'raider_spawn').length,
    wallsDestroyed,
    archersActive,
    difficulty,
  };

  return { updatedSave, raidRecord, summary, defenseBonus, lootLost, lootGained, won, archerKills };
}
