import type { Database } from '../database.js';

export interface ProgressionRow {
  player_id: string;
  total_raids_won: number;
  total_raids_lost: number;
  total_structures_placed: number;
  current_win_streak: number;
  best_win_streak: number;
  total_raiders_killed_by_archer: number;
  achievements: string;
}

export async function findProgression(db: Database, playerId: string): Promise<ProgressionRow | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM progression WHERE player_id = ?', args: [playerId] });
  return result.rows[0] as unknown as ProgressionRow | undefined;
}

export async function upsertProgression(db: Database, p: ProgressionRow): Promise<void> {
  await db.execute({
    sql: `INSERT INTO progression (player_id, total_raids_won, total_raids_lost, total_structures_placed, current_win_streak, best_win_streak, total_raiders_killed_by_archer, achievements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        total_raids_won = excluded.total_raids_won,
        total_raids_lost = excluded.total_raids_lost,
        total_structures_placed = excluded.total_structures_placed,
        current_win_streak = excluded.current_win_streak,
        best_win_streak = excluded.best_win_streak,
        total_raiders_killed_by_archer = excluded.total_raiders_killed_by_archer,
        achievements = excluded.achievements`,
    args: [
      p.player_id, p.total_raids_won, p.total_raids_lost, p.total_structures_placed,
      p.current_win_streak, p.best_win_streak, p.total_raiders_killed_by_archer, p.achievements,
    ],
  });
}
