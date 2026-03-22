import type { KeepState } from '@codekeep/shared';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  echoReward: number;
  check: (keep: KeepState) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_run', name: 'Into the Pale', description: 'Complete your first run.', echoReward: 5,
    check: (k) => k.totalRuns >= 1 },
  { id: 'first_win', name: 'Gate Held', description: 'Win a run for the first time.', echoReward: 10,
    check: (k) => k.totalWins >= 1 },
  { id: 'veteran', name: 'Veteran Warden', description: 'Complete 10 runs.', echoReward: 15,
    check: (k) => k.totalRuns >= 10 },
  { id: 'unstoppable', name: 'Unstoppable', description: 'Win 5 runs.', echoReward: 20,
    check: (k) => k.totalWins >= 5 },
  { id: 'ascension_1', name: 'Rising Flame', description: 'Reach Ascension 1.', echoReward: 10,
    check: (k) => k.highestAscension >= 1 },
  { id: 'ascension_5', name: 'Tempered', description: 'Reach Ascension 5.', echoReward: 25,
    check: (k) => k.highestAscension >= 5 },
  { id: 'ascension_10', name: 'Forged in Pale', description: 'Reach Ascension 10.', echoReward: 50,
    check: (k) => k.highestAscension >= 10 },
  { id: 'ascension_15', name: 'The True Warden', description: 'Reach Ascension 15.', echoReward: 100,
    check: (k) => k.highestAscension >= 15 },
  { id: 'collector', name: 'Collector', description: 'Unlock 20 different cards.', echoReward: 15,
    check: (k) => k.unlockedCardIds.length >= 20 },
  { id: 'full_archive', name: 'Full Archive', description: 'Unlock 50 different cards.', echoReward: 30,
    check: (k) => k.unlockedCardIds.length >= 50 },
  { id: 'npc_friend', name: 'First Friend', description: 'Reach Tier 1 with any NPC.', echoReward: 10,
    check: (k) => k.npcs.some((n) => n.tier >= 1) },
  { id: 'npc_trusted', name: 'Trusted Ally', description: 'Reach Tier 3 with any NPC.', echoReward: 25,
    check: (k) => k.npcs.some((n) => n.tier >= 3) },
  { id: 'npc_confidant', name: 'Confidant', description: 'Reach Tier 5 with any NPC.', echoReward: 50,
    check: (k) => k.npcs.some((n) => n.tier >= 5) },
  { id: 'builder', name: 'Master Builder', description: 'Upgrade all Keep structures to max.', echoReward: 40,
    check: (k) => {
      const ids = ['forge', 'archive', 'beacon_tower', 'foundry', 'sanctum_hall'];
      return ids.every((id) => (k.structures[id] ?? 0) >= 3 || (id === 'beacon_tower' && (k.structures[id] ?? 0) >= 2));
    } },
  { id: 'lore_hunter', name: 'Lore Hunter', description: 'Discover all lore entries.', echoReward: 50,
    check: () => false }, // checked externally
  { id: 'marathon', name: 'Marathon', description: 'Complete 50 runs.', echoReward: 30,
    check: (k) => k.totalRuns >= 50 },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Win a run in under 30 turns total.', echoReward: 25,
    check: () => false }, // checked externally
  { id: 'minimalist', name: 'Minimalist', description: 'Win a run with 12 or fewer cards.', echoReward: 30,
    check: () => false }, // checked externally
  { id: 'perfect_gate', name: 'Perfect Gate', description: 'Win a run at full Gate HP.', echoReward: 35,
    check: () => false }, // checked externally
  { id: 'twenty_wins', name: 'Keeper of the Flame', description: 'Win 20 runs.', echoReward: 40,
    check: (k) => k.totalWins >= 20 },
  { id: 'echo_hoarder', name: 'Echo Hoarder', description: 'Accumulate 500 total Echoes.', echoReward: 20,
    check: (k) => k.echoes >= 500 },
  { id: 'pale_scholar', name: 'Pale Scholar', description: 'Talk to every NPC.', echoReward: 10,
    check: (k) => k.npcs.every((n) => n.dialoguesSeen.length > 0) },
  { id: 'true_ending_seen', name: 'Beyond the Pale', description: 'Witness the true ending.', echoReward: 100,
    check: (k) => k.narrativeFlags.includes('true_ending_seen') },
  { id: 'all_bosses', name: 'Boss Slayer', description: 'Defeat all 3 bosses.', echoReward: 20,
    check: (k) => k.narrativeFlags.includes('boss_suture_killed') && k.narrativeFlags.includes('boss_archivist_killed') && k.narrativeFlags.includes('boss_pale_killed') },
  { id: 'emplacer', name: 'Emplacer', description: 'Have 3 emplacements active simultaneously.', echoReward: 15,
    check: () => false }, // checked externally
  { id: 'firekeeper', name: 'Firekeeper', description: 'Apply 20+ Burn in a single combat.', echoReward: 15,
    check: () => false }, // checked externally
  { id: 'iron_defense', name: 'Iron Defense', description: 'Have 50+ Block at once.', echoReward: 15,
    check: () => false }, // checked externally
  { id: 'card_master', name: 'Card Master', description: 'Play 10 cards in a single turn.', echoReward: 20,
    check: () => false }, // checked externally
  { id: 'no_damage_boss', name: 'Flawless Boss', description: 'Defeat a boss without taking Gate damage.', echoReward: 40,
    check: () => false }, // checked externally
  { id: 'hundred_runs', name: 'Centurion', description: 'Complete 100 runs.', echoReward: 50,
    check: (k) => k.totalRuns >= 100 },
];

export function checkAchievements(keep: KeepState): { newAchievements: string[]; echoesEarned: number } {
  const newAchievements: string[] = [];
  let echoesEarned = 0;

  for (const ach of ACHIEVEMENTS) {
    if (keep.achievements.includes(ach.id)) continue;
    if (ach.check(keep)) {
      newAchievements.push(ach.id);
      echoesEarned += ach.echoReward;
    }
  }

  return { newAchievements, echoesEarned };
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
