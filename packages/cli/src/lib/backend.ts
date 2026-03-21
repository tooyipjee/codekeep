import type { GameSave, Resources, KeepGridState, ProbeType, RaidReplay, RaidRecord, RaidOutcome, League, DailyBounty, WarCamp, RaidSpawnSpec } from '@codekeep/shared';

export interface RaidLaunchResult {
  raidId: string;
  outcome: RaidOutcome;
  lootGained: Resources;
  trophyDelta: number;
  newTrophies: number;
  newLeague: League;
  replay: RaidReplay;
}

export interface MatchTarget {
  playerId: string;
  displayName: string;
  trophies: number;
  structureCount: number;
  grid: KeepGridState;
}

export interface PvpProfile {
  trophies: number;
  league: League;
  shieldExpiresAt: number | null;
  seasonId: string;
  seasonPeakTrophies: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  trophies: number;
  league: string;
}

export interface GameBackend {
  readonly mode: 'local' | 'online';

  // Persistence
  load(): Promise<GameSave | null>;
  save(save: GameSave): Promise<void>;
  createNew(playerName: string): Promise<GameSave>;
  deleteAll(): Promise<boolean>;

  // PvP (online only — throws in local mode)
  findMatch?(): Promise<MatchTarget[]>;
  launchPvpRaid?(defenderPlayerId: string, probeTypes: ProbeType[], spawnSpecs?: RaidSpawnSpec[]): Promise<RaidLaunchResult>;
  getIncomingRaids?(since: number): Promise<RaidRecord[]>;
  getPvpProfile?(): Promise<PvpProfile | null>;
  getLeaderboard?(limit?: number): Promise<LeaderboardEntry[]>;

  // War Camp (online only)
  getWarCamp?(): Promise<WarCamp | null>;
  trainRaider?(slotId: number, raiderType: ProbeType): Promise<WarCamp>;

  // Bounties (online only)
  getBounties?(): Promise<DailyBounty[]>;
  claimBounty?(bountyId: string): Promise<Resources>;

  // Auth (online only)
  login?(apiKey: string): Promise<{ playerId: string; token: string }>;
  register?(displayName: string): Promise<{ playerId: string; apiKey: string; token: string }>;
  isAuthenticated?(): boolean;

  // Sync
  sync?(): Promise<void>;
  registerForMatchmaking?(): Promise<void>;
}
