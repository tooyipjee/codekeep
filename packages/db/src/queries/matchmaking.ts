import type { Database } from '../database.js';

export interface MatchmakingRow {
  player_id: string;
  keep_id: string;
  trophies: number;
  structure_count: number;
  last_raided_at: number | null;
  updated_at: number;
}

export async function upsertMatchmakingEntry(db: Database, entry: MatchmakingRow): Promise<void> {
  await db.execute({
    sql: `INSERT INTO matchmaking_pool (player_id, keep_id, trophies, structure_count, last_raided_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        keep_id = excluded.keep_id,
        trophies = excluded.trophies,
        structure_count = excluded.structure_count,
        last_raided_at = excluded.last_raided_at,
        updated_at = excluded.updated_at`,
    args: [entry.player_id, entry.keep_id, entry.trophies, entry.structure_count, entry.last_raided_at, entry.updated_at],
  });
}

export async function findMatchCandidates(
  db: Database,
  excludePlayerId: string,
  minTrophies: number,
  maxTrophies: number,
  limit: number,
): Promise<MatchmakingRow[]> {
  const result = await db.execute({
    sql: `SELECT * FROM matchmaking_pool
      WHERE player_id != ?
        AND trophies BETWEEN ? AND ?
        AND structure_count >= 4
      ORDER BY RANDOM()
      LIMIT ?`,
    args: [excludePlayerId, minTrophies, maxTrophies, limit],
  });
  return result.rows as unknown as MatchmakingRow[];
}

export async function removeFromPool(db: Database, playerId: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM matchmaking_pool WHERE player_id = ?', args: [playerId] });
}
