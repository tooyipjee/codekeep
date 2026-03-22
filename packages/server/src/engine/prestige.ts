import type { GameSave, PrestigeData, Resources } from '@codekeep/shared';
import { STARTING_RESOURCES, PRESTIGE_UNLOCKS, PRESTIGE_MIN_WINS } from '@codekeep/shared';

export function canPrestige(save: GameSave): { eligible: boolean; reason?: string } {
  const totalWins = save.progression.totalRaidsWon;
  if (totalWins < PRESTIGE_MIN_WINS) {
    return { eligible: false, reason: `Need ${PRESTIGE_MIN_WINS} raid wins (have ${totalWins})` };
  }
  return { eligible: true };
}

export function getPrestigeLevel(save: GameSave): number {
  return save.prestige?.ascensionLevel ?? 0;
}

export function getNextUnlock(currentLevel: number): typeof PRESTIGE_UNLOCKS[number] | null {
  const next = PRESTIGE_UNLOCKS.find((u) => u.ascensionLevel === currentLevel + 1);
  return next ?? null;
}

export function getActiveUnlocks(level: number): string[] {
  return PRESTIGE_UNLOCKS
    .filter((u) => u.ascensionLevel <= level)
    .map((u) => u.id);
}

export function hasUnlock(save: GameSave, unlockId: string): boolean {
  const level = getPrestigeLevel(save);
  return PRESTIGE_UNLOCKS.some((u) => u.id === unlockId && u.ascensionLevel <= level);
}

export function performPrestige(save: GameSave): GameSave {
  const currentPrestige = save.prestige ?? {
    ascensionLevel: 0,
    permanentUnlocks: [],
    lifetimeRaidsWon: 0,
    lifetimeRaidsLost: 0,
    lifetimeBestStreak: 0,
  };

  const newLevel = currentPrestige.ascensionLevel + 1;
  const newUnlocks = getActiveUnlocks(newLevel);

  let startingResources: Resources = { ...STARTING_RESOURCES };
  if (newUnlocks.includes('starting_resources_boost')) {
    startingResources = {
      gold: startingResources.gold * 2,
      wood: startingResources.wood * 2,
      stone: startingResources.stone * 2,
    };
  }

  return {
    ...save,
    keep: {
      ...save.keep,
      grid: { width: 16, height: 16, structures: [] },
      resources: startingResources,
    },
    raidHistory: [],
    progression: {
      totalBuildsToday: 0,
      totalCommitsToday: 0,
      lastDailyResetDay: save.progression.lastDailyResetDay,
      totalRaidsWon: 0,
      totalRaidsLost: 0,
      totalStructuresPlaced: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      achievements: save.progression.achievements,
      totalRaidersKilledByArcher: 0,
      dailyChallenges: save.progression.dailyChallenges,
    },
    activeBuffs: [],
    prestige: {
      ascensionLevel: newLevel,
      permanentUnlocks: newUnlocks,
      lifetimeRaidsWon: currentPrestige.lifetimeRaidsWon + save.progression.totalRaidsWon,
      lifetimeRaidsLost: currentPrestige.lifetimeRaidsLost + save.progression.totalRaidsLost,
      lifetimeBestStreak: Math.max(currentPrestige.lifetimeBestStreak, save.progression.bestWinStreak),
    },
    savedAtUnixMs: Date.now(),
  };
}
