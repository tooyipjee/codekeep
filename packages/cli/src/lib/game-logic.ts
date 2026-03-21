import type { GameSave, Resources, ProbeType } from '@codekeep/shared';
import { ALL_STRUCTURE_KINDS, FAUCET_BASE_USES, FAUCET_DIMINISH_FACTOR } from '@codekeep/shared';

export function raidDifficulty(totalRaids: number): number {
  if (totalRaids <= 2) return 1;
  if (totalRaids <= 5) return 2;
  if (totalRaids <= 9) return 3;
  if (totalRaids <= 14) return 4;
  return 5;
}

export function buildProbeTypes(count: number, difficulty: number, rng: () => number): ProbeType[] {
  const types: ProbeType[] = [];
  for (let i = 0; i < count; i++) {
    if (difficulty >= 3 && rng() < 0.2) {
      types.push('brute');
    } else if (difficulty >= 2 && rng() < 0.3) {
      types.push('scout');
    } else {
      types.push('raider');
    }
  }
  return types;
}

export function simpleRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ensureProgression(save: GameSave): GameSave {
  const p = save.progression;
  return {
    ...save,
    progression: {
      ...p,
      totalRaidsWon: p.totalRaidsWon ?? 0,
      totalRaidsLost: p.totalRaidsLost ?? 0,
      totalStructuresPlaced: p.totalStructuresPlaced ?? 0,
      currentWinStreak: p.currentWinStreak ?? 0,
      bestWinStreak: p.bestWinStreak ?? 0,
      achievements: p.achievements ?? [],
      totalRaidersKilledByArcher:
        p.totalRaidersKilledByArcher
        ?? (p as { totalProbesKilledByScanner?: number }).totalProbesKilledByScanner
        ?? 0,
    },
  };
}

export const ACHIEVEMENT_BONUSES: Record<string, Resources> = {
  first_structure:  { gold: 20, wood: 0,  stone: 0 },
  defense_win_5:    { gold: 25, wood: 15, stone: 15 },
  win_streak_3:     { gold: 10, wood: 10, stone: 10 },
  win_streak_5:     { gold: 30, wood: 30, stone: 30 },
  all_types:        { gold: 15, wood: 15, stone: 15 },
  max_level:        { gold: 20, wood: 0,  stone: 10 },
  archer_kills_10:  { gold: 20, wood: 10, stone: 10 },
  structures_20:    { gold: 10, wood: 10, stone: 10 },
  raids_10:         { gold: 15, wood: 15, stone: 15 },
  hoarder:          { gold: 25, wood: 0,  stone: 0 },
};

export function getAchievementBonus(id: string): Resources | null {
  return ACHIEVEMENT_BONUSES[id] ?? null;
}

export function checkAchievements(save: GameSave): string[] {
  const p = save.progression;
  const earned = new Set(p.achievements);
  const newOnes: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (!earned.has(id) && condition) newOnes.push(id);
  };

  check('first_structure', p.totalStructuresPlaced >= 1);
  check('defense_win_5', p.totalRaidsWon >= 5);
  check('win_streak_3', p.bestWinStreak >= 3);
  check('win_streak_5', p.bestWinStreak >= 5);
  check('structures_20', p.totalStructuresPlaced >= 20);
  check('raids_10', p.totalRaidsWon + p.totalRaidsLost >= 10);
  check('archer_kills_10', p.totalRaidersKilledByArcher >= 10);
  check('hoarder', save.keep.resources.gold + save.keep.resources.wood + save.keep.resources.stone >= 500);

  const kinds = new Set(save.keep.grid.structures.map((s) => s.kind));
  check('all_types', kinds.size >= ALL_STRUCTURE_KINDS.length);
  check('max_level', save.keep.grid.structures.some((s) => s.level === 3));

  return newOnes;
}

export function applyDiminishingReturns(
  grants: Resources,
  faucetUses: number,
): Resources {
  if (faucetUses <= FAUCET_BASE_USES) return grants;
  const factor = Math.pow(
    FAUCET_DIMINISH_FACTOR,
    Math.floor((faucetUses - FAUCET_BASE_USES) / FAUCET_BASE_USES) + 1,
  );
  return {
    gold: Math.max(1, Math.floor(grants.gold * factor)),
    wood: Math.max(1, Math.floor(grants.wood * factor)),
    stone: Math.max(1, Math.floor(grants.stone * factor)),
  };
}
