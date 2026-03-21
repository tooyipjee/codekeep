export type GridCoord = { x: number; y: number };

export type ResourceId = 'gold' | 'wood' | 'stone';
export type Resources = Record<ResourceId, number>;

export type StructureKind =
  | 'wall'
  | 'trap'
  | 'treasury'
  | 'ward'
  | 'watchtower'
  | 'archerTower';

export type ProbeType = 'raider' | 'scout' | 'brute';

export type UpgradeLevel = 1 | 2 | 3;

export interface PlacedStructure {
  id: string;
  kind: StructureKind;
  level: UpgradeLevel;
  pos: GridCoord;
  placedAtUnixMs: number;
}

export interface Keep {
  id: string;
  name: string;
  ownerPlayerId: string;
  grid: KeepGridState;
  resources: Resources;
  createdAtUnixMs: number;
  updatedAtUnixMs: number;
}

export interface KeepGridState {
  width: 16;
  height: 16;
  structures: PlacedStructure[];
}

export type RaidOutcome = 'defense_win' | 'partial_breach' | 'full_breach';

export type RaidTickEvent =
  | { t: number; type: 'raider_spawn'; probeId: number; edge: 'N' | 'S' | 'E' | 'W'; pos: GridCoord; raiderType?: ProbeType; maxHp?: number }
  | { t: number; type: 'raider_move'; probeId: number; from: GridCoord; to: GridCoord }
  | { t: number; type: 'raider_blocked'; probeId: number; pos: GridCoord; wallId: string }
  | { t: number; type: 'raider_stunned'; probeId: number; pos: GridCoord; trapId: string; stunTicks: number }
  | { t: number; type: 'wall_damaged'; structureId: string; hpRemaining: number; destroyed: boolean }
  | { t: number; type: 'treasury_breach'; structureId: string; lootTaken: Resources }
  | { t: number; type: 'raider_destroyed'; probeId: number; pos: GridCoord }
  | { t: number; type: 'arrow_hit'; probeId: number; archerId: string; damage: number; hpRemaining: number }
  | { t: number; type: 'raid_end'; outcome: RaidOutcome };

export interface RaidReplay {
  tickRateHz: number;
  maxTicks: number;
  events: RaidTickEvent[];
}

export interface RaidRecord {
  id: string;
  seed: string;
  rulesVersion: number;
  attackerId: string;
  defenderKeepId: string;
  startedAtUnixMs: number;
  resolvedAtUnixMs: number;
  outcome: RaidOutcome;
  lootLost: Resources;
  lootGained: Resources;
  replay: RaidReplay;
  defenderGrid?: KeepGridState;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  settings: {
    asciiMode: boolean;
  };
}

export interface GameSave {
  schemaVersion: number;
  savedAtUnixMs: number;
  player: PlayerProfile;
  keep: Keep;
  raidHistory: RaidRecord[];
  tutorialCompleted: boolean;
  lastPlayedAtUnixMs: number;
  progression: {
    totalBuildsToday: number;
    totalCommitsToday: number;
    lastDailyResetDay: number;
    totalRaidsWon: number;
    totalRaidsLost: number;
    totalStructuresPlaced: number;
    currentWinStreak: number;
    bestWinStreak: number;
    achievements: string[];
    totalRaidersKilledByArcher: number;
  };
}

export interface StructureStats {
  kind: StructureKind;
  symbol: string;
  name: string;
  description: string;
  costs: Record<UpgradeLevel, Resources>;
  stats: Record<UpgradeLevel, Record<string, number>>;
}

export interface CodingEvent {
  type: 'build_success' | 'tests_pass' | 'git_commit' | 'session_reward' | 'daily_login';
  timestamp: number;
  grants: Resources;
}

export type FragmentType = 'gold_nugget' | 'timber' | 'ore' | 'gem';

export interface DataFragment {
  id: string;
  type: FragmentType;
  pos: GridCoord;
  spawnedAtMs: number;
}
