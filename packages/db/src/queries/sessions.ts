import type { Database } from '../database.js';

export interface SessionRow {
  id: string;
  player_id: string;
  refresh_token: string;
  expires_at: number;
  created_at: number;
}

export function createSession(db: Database, session: SessionRow): void {
  db.prepare('INSERT INTO sessions (id, player_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(session.id, session.player_id, session.refresh_token, session.expires_at, session.created_at);
}

export function findSessionByToken(db: Database, token: string): SessionRow | undefined {
  return db.prepare('SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > ?')
    .get(token, Date.now()) as SessionRow | undefined;
}

export function deleteSession(db: Database, id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deletePlayerSessions(db: Database, playerId: string): void {
  db.prepare('DELETE FROM sessions WHERE player_id = ?').run(playerId);
}
