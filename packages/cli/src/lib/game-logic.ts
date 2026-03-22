import type { GameSave, Resources, ProbeType, RaidAnomaly, RaidModifiers, ActiveBuff, RewardOption } from '@codekeep/shared';
import { ALL_STRUCTURE_KINDS, FAUCET_BASE_USES, FAUCET_DIMINISH_FACTOR, ANOMALY_DEFS, ANOMALY_MIN_DIFFICULTY, ANOMALY_DOUBLE_CHANCE_DIFFICULTY, REWARD_BUFF_DEFS } from '@codekeep/shared';

export function raidDifficulty(totalRaids: number): number {
  if (totalRaids <= 2) return 1;
  if (totalRaids <= 5) return 2;
  if (totalRaids <= 9) return 3;
  if (totalRaids <= 14) return 4;
  if (totalRaids <= 19) return 5;
  if (totalRaids <= 29) return 6;
  if (totalRaids <= 44) return 7;
  if (totalRaids <= 64) return 8;
  if (totalRaids <= 99) return 9;
  return 10;
}

export function buildProbeTypes(count: number, difficulty: number, rng: () => number, bruteChanceMult = 1): ProbeType[] {
  const bruteChance = Math.min(0.8, (difficulty >= 8 ? 0.4 : difficulty >= 6 ? 0.3 : difficulty >= 3 ? 0.2 : 0) * bruteChanceMult);
  const scoutChance = difficulty >= 2 ? 0.3 : 0;
  const types: ProbeType[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (roll < bruteChance) {
      types.push('brute');
    } else if (roll < bruteChance + scoutChance) {
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

export interface SiegeForecast {
  difficulty: number;
  probeCount: number;
  composition: { raiders: number; scouts: number; brutes: number };
  vague: string;
  detailed: string;
}

export function computeSiegeForecast(keepId: string, raidCount: number, watchtowerCount: number): SiegeForecast {
  const nextTotal = raidCount;
  const difficulty = raidDifficulty(nextTotal);
  const probeCount = 3 + difficulty;

  const seed = hashForecastSeed(keepId, raidCount);
  const rng = simpleRng(seed);
  const types = buildProbeTypes(probeCount, difficulty, rng);

  const raiders = types.filter((t) => t === 'raider').length;
  const scouts = types.filter((t) => t === 'scout').length;
  const brutes = types.filter((t) => t === 'brute').length;

  const composition = { raiders, scouts, brutes };

  let vague: string;
  if (probeCount <= 5) vague = 'Small force approaching';
  else if (probeCount <= 8) vague = 'Moderate force approaching';
  else if (probeCount <= 11) vague = 'Strong force approaching';
  else vague = 'Massive force approaching';

  const parts: string[] = [];
  if (brutes > 0) parts.push(`${brutes}B`);
  if (raiders > 0) parts.push(`${raiders}R`);
  if (scouts > 0) parts.push(`${scouts}S`);
  const detailed = `Next raid: ${parts.join(' ')} (Lv.${difficulty})`;

  return { difficulty, probeCount, composition, vague, detailed };
}

function hashForecastSeed(keepId: string, raidCount: number): number {
  const str = `${keepId}-forecast-${raidCount + 1}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function rollAnomalies(difficulty: number, rng: () => number): RaidAnomaly[] {
  if (difficulty < ANOMALY_MIN_DIFFICULTY) return [];

  const pool = ANOMALY_DEFS.filter((a) => {
    if (a.id === 'siege' && difficulty < 4) return false;
    if (a.id === 'piercing' && difficulty < 3) return false;
    return true;
  });

  if (pool.length === 0) return [];

  const anomalies: RaidAnomaly[] = [];
  const idx1 = Math.floor(rng() * pool.length);
  anomalies.push(pool[idx1]);

  if (difficulty >= ANOMALY_DOUBLE_CHANCE_DIFFICULTY && rng() < 0.5) {
    const remaining = pool.filter((_, i) => i !== idx1);
    if (remaining.length > 0) {
      anomalies.push(remaining[Math.floor(rng() * remaining.length)]);
    }
  }

  return anomalies;
}

export function buildAnomalyModifiers(anomalies: RaidAnomaly[], buffs?: ActiveBuff[]): RaidModifiers {
  const modSources = anomalies.map((a) => a.modifiers);
  if (buffs) {
    for (const b of buffs) modSources.push(b.modifiers);
  }
  const result: RaidModifiers = {};
  for (const m of modSources) {
    for (const [key, val] of Object.entries(m)) {
      if (key === 'singleEdge') {
        result.singleEdge = result.singleEdge || (val as boolean);
      } else {
        (result as Record<string, number>)[key] = ((result as Record<string, number>)[key] ?? 1) * (val as number);
      }
    }
  }
  return result;
}

export function generateRewardOptions(difficulty: number, rng: () => number): RewardOption[] {
  const options: RewardOption[] = [];

  const resourceMultiplier = 1 + (difficulty - 1) * 0.3;
  const baseGold = Math.floor(15 * resourceMultiplier);
  const baseWood = Math.floor(10 * resourceMultiplier);
  const baseStone = Math.floor(8 * resourceMultiplier);

  options.push({
    id: 'resources_gold',
    type: 'resources',
    name: 'Gold Cache',
    description: `+${baseGold * 2} gold`,
    icon: '●',
    resources: { gold: baseGold * 2, wood: 0, stone: 0 },
  });

  options.push({
    id: 'resources_balanced',
    type: 'resources',
    name: 'Supply Crate',
    description: `+${baseGold} gold, +${baseWood} wood, +${baseStone} stone`,
    icon: '■',
    resources: { gold: baseGold, wood: baseWood, stone: baseStone },
  });

  const buffPool = [...REWARD_BUFF_DEFS];
  const buffIdx = Math.floor(rng() * buffPool.length);
  const chosenBuff = { ...buffPool[buffIdx], modifiers: { ...buffPool[buffIdx].modifiers } };
  options.push({
    id: `buff_${chosenBuff.id}`,
    type: 'buff',
    name: chosenBuff.name,
    description: `${chosenBuff.name} for ${chosenBuff.raidsRemaining} raids`,
    icon: '★',
    buff: chosenBuff,
  });

  return options;
}

export function tickDownBuffs(buffs: ActiveBuff[]): ActiveBuff[] {
  return buffs
    .map((b) => ({ ...b, raidsRemaining: b.raidsRemaining - 1 }))
    .filter((b) => b.raidsRemaining > 0);
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
