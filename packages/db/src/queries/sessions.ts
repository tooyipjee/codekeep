import type { Database } from '../database.js';

export interface SessionRow {
  id: string;
  player_id: string;
  refresh_token: string;
  expires_at: number;
  created_at: number;
}

export async function createSession(db: Database, session: SessionRow): Promise<void> {
  await db.execute({
    sql: 'INSERT INTO sessions (id, player_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [session.id, session.player_id, session.refresh_token, session.expires_at, session.created_at],
  });
}

export async function findSessionByToken(db: Database, token: string): Promise<SessionRow | undefined> {
  const result = await db.execute({
    sql: 'SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > ?',
    args: [token, Date.now()],
  });
  return result.rows[0] as unknown as SessionRow | undefined;
}

export async function deleteSession(db: Database, id: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [id] });
}

export async function deletePlayerSessions(db: Database, playerId: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM sessions WHERE player_id = ?', args: [playerId] });
}
