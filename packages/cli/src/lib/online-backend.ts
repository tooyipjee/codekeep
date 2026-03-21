import type { GameSave, Resources, ProbeType, RaidRecord, WarCamp, DailyBounty, KeepGridState } from '@codekeep/shared';
import { STARTING_RESOURCES } from '@codekeep/shared';
import type { GameBackend, RaidLaunchResult, MatchTarget, PvpProfile, LeaderboardEntry } from './backend.js';

interface AuthState {
  token: string;
  apiKey: string;
  playerId: string;
}

export class OnlineBackend implements GameBackend {
  readonly mode = 'online' as const;
  private baseUrl: string;
  private auth: AuthState | null = null;

  constructor(serverUrl: string) {
    this.baseUrl = serverUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    };
    if (this.auth) {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    }
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  isAuthenticated(): boolean {
    return this.auth !== null;
  }

  async register(displayName: string): Promise<{ playerId: string; apiKey: string; token: string }> {
    const result = await this.request<{ playerId: string; apiKey: string; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
    this.auth = { token: result.token, apiKey: result.apiKey, playerId: result.playerId };
    return result;
  }

  async login(apiKey: string): Promise<{ playerId: string; token: string }> {
    const result = await this.request<{ playerId: string; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
    this.auth = { token: result.token, apiKey, playerId: result.playerId };
    return result;
  }

  async load(): Promise<GameSave | null> {
    if (!this.auth) return null;
    try {
      const data = await this.request<{
        player: { id: string; displayName: string; trophies: number; league: string; shieldExpiresAt: number | null; createdAt: number };
        keep: { id: string; name: string; grid: KeepGridState; resources: Resources; version: number } | null;
        progression: {
          totalRaidsWon: number; totalRaidsLost: number; totalStructuresPlaced: number;
          currentWinStreak: number; bestWinStreak: number; achievements: string[];
        } | null;
      }>('/me');

      if (!data.keep) return null;

      return {
        schemaVersion: 1,
        savedAtUnixMs: Date.now(),
        player: { id: data.player.id, displayName: data.player.displayName, settings: { asciiMode: false } },
        keep: {
          id: data.keep.id,
          name: data.keep.name,
          ownerPlayerId: data.player.id,
          grid: data.keep.grid,
          resources: data.keep.resources,
          createdAtUnixMs: data.player.createdAt,
          updatedAtUnixMs: Date.now(),
        },
        raidHistory: [],
        tutorialCompleted: true,
        lastPlayedAtUnixMs: Date.now(),
        progression: {
          totalBuildsToday: 0,
          totalCommitsToday: 0,
          lastDailyResetDay: Math.floor(Date.now() / 86400000),
          totalRaidsWon: data.progression?.totalRaidsWon ?? 0,
          totalRaidsLost: data.progression?.totalRaidsLost ?? 0,
          totalStructuresPlaced: data.progression?.totalStructuresPlaced ?? 0,
          currentWinStreak: data.progression?.currentWinStreak ?? 0,
          bestWinStreak: data.progression?.bestWinStreak ?? 0,
          achievements: data.progression?.achievements ?? [],
          totalRaidersKilledByArcher: 0,
        },
      };
    } catch {
      return null;
    }
  }

  async save(save: GameSave): Promise<void> {
    if (!this.auth) return;
    await this.request('/keep/save', {
      method: 'POST',
      body: JSON.stringify({ grid: save.keep.grid, resources: save.keep.resources }),
    });
  }

  async createNew(playerName: string): Promise<GameSave> {
    const reg = await this.register(playerName);
    const save = await this.load();
    if (save) return save;
    return {
      schemaVersion: 1,
      savedAtUnixMs: Date.now(),
      player: { id: reg.playerId, displayName: playerName, settings: { asciiMode: false } },
      keep: {
        id: `keep-${reg.playerId}`,
        name: `${playerName}'s Keep`,
        ownerPlayerId: reg.playerId,
        grid: { width: 16, height: 16, structures: [] },
        resources: { ...STARTING_RESOURCES },
        createdAtUnixMs: Date.now(),
        updatedAtUnixMs: Date.now(),
      },
      raidHistory: [],
      tutorialCompleted: false,
      lastPlayedAtUnixMs: Date.now(),
      progression: {
        totalBuildsToday: 0,
        totalCommitsToday: 0,
        lastDailyResetDay: Math.floor(Date.now() / 86400000),
        totalRaidsWon: 0,
        totalRaidsLost: 0,
        totalStructuresPlaced: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        achievements: [],
        totalRaidersKilledByArcher: 0,
      },
    };
  }

  async deleteAll(): Promise<boolean> {
    return false;
  }

  async findMatch(): Promise<MatchTarget[]> {
    const data = await this.request<{ targets: MatchTarget[] }>('/matchmaking/find', { method: 'POST' });
    return data.targets;
  }

  async launchPvpRaid(defenderPlayerId: string, probeTypes: ProbeType[], spawnSpecs?: import('@codekeep/shared').RaidSpawnSpec[]): Promise<RaidLaunchResult> {
    return this.request<RaidLaunchResult>('/raids/launch', {
      method: 'POST',
      body: JSON.stringify({ defenderPlayerId, probeTypes, spawnSpecs }),
    });
  }

  async getIncomingRaids(since: number): Promise<RaidRecord[]> {
    const data = await this.request<{ raids: RaidRecord[] }>(`/raids/incoming?since=${since}`);
    return data.raids;
  }

  async getPvpProfile(): Promise<PvpProfile | null> {
    try {
      const data = await this.request<{ player: { trophies: number; league: string; shieldExpiresAt: number | null } }>('/me');
      return {
        trophies: data.player.trophies,
        league: data.player.league as any,
        shieldExpiresAt: data.player.shieldExpiresAt,
        seasonId: 'S1',
        seasonPeakTrophies: data.player.trophies,
      };
    } catch {
      return null;
    }
  }

  async getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    const data = await this.request<{ players: LeaderboardEntry[] }>(`/leaderboard?limit=${limit}`);
    return data.players;
  }

  async getWarCamp(): Promise<WarCamp | null> {
    try {
      return await this.request<WarCamp>('/warcamp');
    } catch {
      return null;
    }
  }

  async trainRaider(slotId: number, raiderType: ProbeType): Promise<WarCamp> {
    const result = await this.request<{ slots: WarCamp['slots']; maxSlots: number }>('/warcamp/train', {
      method: 'POST',
      body: JSON.stringify({ slotId, raiderType }),
    });
    return { slots: result.slots, maxSlots: result.maxSlots };
  }

  async getBounties(): Promise<DailyBounty[]> {
    try {
      const data = await this.request<{ bounties: DailyBounty[] }>('/bounties');
      return data.bounties;
    } catch {
      return [];
    }
  }

  async claimBounty(bountyId: string): Promise<Resources> {
    const data = await this.request<{ reward: Resources }>(`/bounties/${bountyId}/claim`, {
      method: 'POST',
    });
    return data.reward;
  }

  async registerForMatchmaking(): Promise<void> {
    await this.request('/matchmaking/register', { method: 'POST' });
  }

  async sync(): Promise<void> {
    if (!this.auth) return;
    await this.registerForMatchmaking();
  }
}
