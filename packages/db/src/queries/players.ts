import type { Database } from '../database.js';

export interface PlayerRow {
  id: string;
  github_id: string | null;
  github_login: string | null;
  display_name: string;
  api_key: string | null;
  trophies: number;
  league: string;
  settings: string;
  shield_expires_at: number | null;
  last_seen_at: number;
  created_at: number;
}

export function findPlayerById(db: Database, id: string): PlayerRow | undefined {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) as PlayerRow | undefined;
}

export function findPlayerByGithubId(db: Database, githubId: string): PlayerRow | undefined {
  return db.prepare('SELECT * FROM players WHERE github_id = ?').get(githubId) as PlayerRow | undefined;
}

export function findPlayerByApiKey(db: Database, apiKey: string): PlayerRow | undefined {
  return db.prepare('SELECT * FROM players WHERE api_key = ?').get(apiKey) as PlayerRow | undefined;
}

export function createPlayer(db: Database, player: Omit<PlayerRow, 'created_at'>): PlayerRow {
  const now = Date.now();
  db.prepare(`INSERT INTO players (id, github_id, github_login, display_name, api_key, trophies, league, settings, shield_expires_at, last_seen_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    player.id, player.github_id, player.github_login, player.display_name,
    player.api_key, player.trophies, player.league, player.settings,
    player.shield_expires_at, player.last_seen_at, now,
  );
  return { ...player, created_at: now };
}

export function updatePlayerTrophies(db: Database, id: string, trophies: number, league: string): void {
  db.prepare('UPDATE players SET trophies = ?, league = ? WHERE id = ?').run(trophies, league, id);
}

export function updatePlayerShield(db: Database, id: string, shieldExpiresAt: number | null): void {
  db.prepare('UPDATE players SET shield_expires_at = ? WHERE id = ?').run(shieldExpiresAt, id);
}

export function updatePlayerLastSeen(db: Database, id: string): void {
  db.prepare('UPDATE players SET last_seen_at = ? WHERE id = ?').run(Date.now(), id);
}
