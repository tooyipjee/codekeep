import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type Database } from '../src/database.js';
import {
  createPlayer, findPlayerById, findPlayerByGithubId, findPlayerByApiKey,
  updatePlayerTrophies, updatePlayerShield, updatePlayerLastSeen,
} from '../src/queries/players.js';
import {
  createKeep, findKeepByPlayerId, updateKeepGrid, updateKeepResources,
} from '../src/queries/keeps.js';
import {
  createRaid, findRaidsByAttacker, findRaidsByDefender, findRaidById, hasRecentAttack,
} from '../src/queries/raids.js';
import {
  upsertMatchmakingEntry, findMatchCandidates, removeFromPool,
} from '../src/queries/matchmaking.js';
import {
  findProgression, upsertProgression,
} from '../src/queries/progression.js';
import {
  createSession, findSessionByToken, deleteSession,
} from '../src/queries/sessions.js';
import { unlinkSync, existsSync } from 'node:fs';

const TEST_DB_PATH = '/tmp/codekeep-test.db';

describe('database', () => {
  let db: Database;

  beforeEach(async () => {
    for (const suffix of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + suffix;
      if (existsSync(p)) unlinkSync(p);
    }
    db = await createDatabase(`file:${TEST_DB_PATH}`);
  });

  afterEach(() => {
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      try { unlinkSync(TEST_DB_PATH + suffix); } catch {}
    }
  });

  it('creates tables on init', async () => {
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const names = result.rows.map((t) => t.name as string);
    expect(names).toContain('players');
    expect(names).toContain('keeps');
    expect(names).toContain('raids');
    expect(names).toContain('matchmaking_pool');
    expect(names).toContain('sessions');
    expect(names).toContain('war_camp');
    expect(names).toContain('bounties');
  });

  it('is idempotent on re-open', async () => {
    db.close();
    const db2 = await createDatabase(`file:${TEST_DB_PATH}`);
    const result = await db2.execute("SELECT name FROM sqlite_master WHERE type='table'");
    expect(result.rows.length).toBeGreaterThan(0);
    db2.close();
    db = await createDatabase(`file:${TEST_DB_PATH}`);
  });

  describe('players', () => {
    it('creates and finds player by id', async () => {
      await createPlayer(db, {
        id: 'p1', github_id: 'gh1', github_login: 'user1', display_name: 'Player 1',
        api_key: 'key1', trophies: 100, league: 'iron', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      const player = await findPlayerById(db, 'p1');
      expect(player).toBeDefined();
      expect(player!.display_name).toBe('Player 1');
      expect(player!.trophies).toBe(100);
    });

    it('finds player by github id', async () => {
      await createPlayer(db, {
        id: 'p2', github_id: 'gh2', github_login: 'user2', display_name: 'Player 2',
        api_key: 'key2', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      expect(await findPlayerByGithubId(db, 'gh2')).toBeDefined();
      expect(await findPlayerByGithubId(db, 'gh999')).toBeUndefined();
    });

    it('finds player by api key', async () => {
      await createPlayer(db, {
        id: 'p3', github_id: null, github_login: null, display_name: 'Player 3',
        api_key: 'ck_abc123', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      expect(await findPlayerByApiKey(db, 'ck_abc123')).toBeDefined();
      expect(await findPlayerByApiKey(db, 'ck_wrong')).toBeUndefined();
    });

    it('updates trophies and league', async () => {
      await createPlayer(db, {
        id: 'p4', github_id: null, github_login: null, display_name: 'P4',
        api_key: 'key4', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await updatePlayerTrophies(db, 'p4', 500, 'silver');
      const p = (await findPlayerById(db, 'p4'))!;
      expect(p.trophies).toBe(500);
      expect(p.league).toBe('silver');
    });

    it('updates shield', async () => {
      await createPlayer(db, {
        id: 'p5', github_id: null, github_login: null, display_name: 'P5',
        api_key: 'key5', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      const expiry = Date.now() + 3600000;
      await updatePlayerShield(db, 'p5', expiry);
      expect((await findPlayerById(db, 'p5'))!.shield_expires_at).toBe(expiry);
      await updatePlayerShield(db, 'p5', null);
      expect((await findPlayerById(db, 'p5'))!.shield_expires_at).toBeNull();
    });
  });

  describe('keeps', () => {
    it('creates and finds keep', async () => {
      await createPlayer(db, {
        id: 'pk1', github_id: null, github_login: null, display_name: 'PK1',
        api_key: 'kpk1', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createKeep(db, { id: 'k1', player_id: 'pk1', name: 'Keep 1', grid_state: '{}', resources: '{}' });
      const keep = await findKeepByPlayerId(db, 'pk1');
      expect(keep).toBeDefined();
      expect(keep!.name).toBe('Keep 1');
      expect(keep!.version).toBe(1);
    });

    it('updates grid increments version', async () => {
      await createPlayer(db, {
        id: 'pk2', github_id: null, github_login: null, display_name: 'PK2',
        api_key: 'kpk2', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createKeep(db, { id: 'k2', player_id: 'pk2', name: 'K2', grid_state: '{"a":1}', resources: '{"gold":10}' });
      await updateKeepGrid(db, 'k2', '{"a":2}', '{"gold":20}');
      const keep = (await findKeepByPlayerId(db, 'pk2'))!;
      expect(keep.version).toBe(2);
      expect(keep.grid_state).toBe('{"a":2}');
    });
  });

  describe('raids', () => {
    it('creates and finds raids', async () => {
      await createPlayer(db, {
        id: 'ra1', github_id: null, github_login: null, display_name: 'RA1',
        api_key: 'kra1', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createKeep(db, { id: 'rk1', player_id: 'ra1', name: 'RK1', grid_state: '{}', resources: '{}' });
      await createRaid(db, {
        id: 'r1', seed: 's1', rules_version: 1, attacker_id: 'ra1',
        defender_keep_id: 'rk1', defender_grid: '{}', probe_types: '[]',
        outcome: 'defense_win', loot_gained: '{}', loot_lost: '{}',
        replay: '{}', attacker_trophies_delta: 10, defender_trophies_delta: 20,
        created_at: Date.now(),
      });
      expect(await findRaidById(db, 'r1')).toBeDefined();
      expect((await findRaidsByAttacker(db, 'ra1')).length).toBe(1);
      expect((await findRaidsByDefender(db, 'rk1')).length).toBe(1);
    });

    it('checks recent attack cooldown', async () => {
      await createPlayer(db, {
        id: 'ra2', github_id: null, github_login: null, display_name: 'RA2',
        api_key: 'kra2', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createKeep(db, { id: 'rk2', player_id: 'ra2', name: 'RK2', grid_state: '{}', resources: '{}' });
      await createRaid(db, {
        id: 'r2', seed: 's2', rules_version: 1, attacker_id: 'ra2',
        defender_keep_id: 'rk2', defender_grid: '{}', probe_types: '[]',
        outcome: 'full_breach', loot_gained: '{}', loot_lost: '{}',
        replay: '{}', attacker_trophies_delta: 0, defender_trophies_delta: 0,
        created_at: Date.now(),
      });
      expect(await hasRecentAttack(db, 'ra2', 'rk2', 86400000)).toBe(true);
      expect(await hasRecentAttack(db, 'ra2', 'rk2', 0)).toBe(false);
    });
  });

  describe('matchmaking', () => {
    it('upserts and finds candidates', async () => {
      await createPlayer(db, {
        id: 'mm1', github_id: null, github_login: null, display_name: 'MM1',
        api_key: 'kmm1', trophies: 100, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createPlayer(db, {
        id: 'mm2', github_id: null, github_login: null, display_name: 'MM2',
        api_key: 'kmm2', trophies: 150, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createKeep(db, { id: 'mk1', player_id: 'mm1', name: 'MK1', grid_state: '{}', resources: '{}' });
      await createKeep(db, { id: 'mk2', player_id: 'mm2', name: 'MK2', grid_state: '{}', resources: '{}' });

      await upsertMatchmakingEntry(db, {
        player_id: 'mm1', keep_id: 'mk1', trophies: 100,
        structure_count: 5, last_raided_at: null, updated_at: Date.now(),
      });
      await upsertMatchmakingEntry(db, {
        player_id: 'mm2', keep_id: 'mk2', trophies: 150,
        structure_count: 8, last_raided_at: null, updated_at: Date.now(),
      });

      const candidates = await findMatchCandidates(db, 'mm1', 0, 200, 10);
      expect(candidates.length).toBe(1);
      expect(candidates[0].player_id).toBe('mm2');
    });

    it('excludes self from candidates', async () => {
      await createPlayer(db, {
        id: 'mm3', github_id: null, github_login: null, display_name: 'MM3',
        api_key: 'kmm3', trophies: 100, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createKeep(db, { id: 'mk3', player_id: 'mm3', name: 'MK3', grid_state: '{}', resources: '{}' });
      await upsertMatchmakingEntry(db, {
        player_id: 'mm3', keep_id: 'mk3', trophies: 100,
        structure_count: 5, last_raided_at: null, updated_at: Date.now(),
      });
      const candidates = await findMatchCandidates(db, 'mm3', 0, 200, 10);
      expect(candidates.length).toBe(0);
    });

    it('removes from pool', async () => {
      await createPlayer(db, {
        id: 'mm4', github_id: null, github_login: null, display_name: 'MM4',
        api_key: 'kmm4', trophies: 100, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createKeep(db, { id: 'mk4', player_id: 'mm4', name: 'MK4', grid_state: '{}', resources: '{}' });
      await upsertMatchmakingEntry(db, {
        player_id: 'mm4', keep_id: 'mk4', trophies: 100,
        structure_count: 5, last_raided_at: null, updated_at: Date.now(),
      });
      await removeFromPool(db, 'mm4');
      const candidates = await findMatchCandidates(db, 'other', 0, 200, 10);
      expect(candidates.filter(c => c.player_id === 'mm4').length).toBe(0);
    });
  });

  describe('sessions', () => {
    it('creates and finds session by token', async () => {
      await createPlayer(db, {
        id: 'sp1', github_id: null, github_login: null, display_name: 'SP1',
        api_key: 'ksp1', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createSession(db, {
        id: 's1', player_id: 'sp1', refresh_token: 'token123',
        expires_at: Date.now() + 86400000, created_at: Date.now(),
      });
      expect(await findSessionByToken(db, 'token123')).toBeDefined();
      expect(await findSessionByToken(db, 'wrong')).toBeUndefined();
    });

    it('expired session not found', async () => {
      await createPlayer(db, {
        id: 'sp2', github_id: null, github_login: null, display_name: 'SP2',
        api_key: 'ksp2', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createSession(db, {
        id: 's2', player_id: 'sp2', refresh_token: 'expired_token',
        expires_at: Date.now() - 1000, created_at: Date.now() - 90000,
      });
      expect(await findSessionByToken(db, 'expired_token')).toBeUndefined();
    });

    it('deletes session', async () => {
      await createPlayer(db, {
        id: 'sp3', github_id: null, github_login: null, display_name: 'SP3',
        api_key: 'ksp3', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await createSession(db, {
        id: 's3', player_id: 'sp3', refresh_token: 'del_token',
        expires_at: Date.now() + 86400000, created_at: Date.now(),
      });
      await deleteSession(db, 's3');
      expect(await findSessionByToken(db, 'del_token')).toBeUndefined();
    });
  });

  describe('progression', () => {
    it('upserts and finds progression', async () => {
      await createPlayer(db, {
        id: 'pp1', github_id: null, github_login: null, display_name: 'PP1',
        api_key: 'kpp1', trophies: 0, league: 'copper', settings: '{}',
        shield_expires_at: null, last_seen_at: Date.now(),
      });
      await upsertProgression(db, {
        player_id: 'pp1', total_raids_won: 5, total_raids_lost: 2,
        total_structures_placed: 10, current_win_streak: 3, best_win_streak: 5,
        total_raiders_killed_by_archer: 15, achievements: '["first_structure"]',
      });
      const p = await findProgression(db, 'pp1');
      expect(p).toBeDefined();
      expect(p!.total_raids_won).toBe(5);
      expect(p!.best_win_streak).toBe(5);
    });
  });
});
