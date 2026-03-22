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

export async function findPlayerById(db: Database, id: string): Promise<PlayerRow | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM players WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as PlayerRow | undefined;
}

export async function findPlayerByGithubId(db: Database, githubId: string): Promise<PlayerRow | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM players WHERE github_id = ?', args: [githubId] });
  return result.rows[0] as unknown as PlayerRow | undefined;
}

export async function findPlayerByApiKey(db: Database, apiKey: string): Promise<PlayerRow | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM players WHERE api_key = ?', args: [apiKey] });
  return result.rows[0] as unknown as PlayerRow | undefined;
}

export async function createPlayer(db: Database, player: Omit<PlayerRow, 'created_at'>): Promise<PlayerRow> {
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO players (id, github_id, github_login, display_name, api_key, trophies, league, settings, shield_expires_at, last_seen_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      player.id, player.github_id, player.github_login, player.display_name,
      player.api_key, player.trophies, player.league, player.settings,
      player.shield_expires_at, player.last_seen_at, now,
    ],
  });
  return { ...player, created_at: now };
}

export async function updatePlayerTrophies(db: Database, id: string, trophies: number, league: string): Promise<void> {
  await db.execute({ sql: 'UPDATE players SET trophies = ?, league = ? WHERE id = ?', args: [trophies, league, id] });
}

export async function updatePlayerShield(db: Database, id: string, shieldExpiresAt: number | null): Promise<void> {
  await db.execute({ sql: 'UPDATE players SET shield_expires_at = ? WHERE id = ?', args: [shieldExpiresAt, id] });
}

export async function updatePlayerLastSeen(db: Database, id: string): Promise<void> {
  await db.execute({ sql: 'UPDATE players SET last_seen_at = ? WHERE id = ?', args: [Date.now(), id] });
}
