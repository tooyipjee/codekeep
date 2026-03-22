import type { Database } from '../database.js';

export interface KeepRow {
  id: string;
  player_id: string;
  name: string;
  grid_state: string;
  resources: string;
  version: number;
  created_at: number;
  updated_at: number;
}

export async function findKeepByPlayerId(db: Database, playerId: string): Promise<KeepRow | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM keeps WHERE player_id = ?', args: [playerId] });
  return result.rows[0] as unknown as KeepRow | undefined;
}

export async function createKeep(db: Database, keep: Omit<KeepRow, 'created_at' | 'updated_at' | 'version'>): Promise<KeepRow> {
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO keeps (id, player_id, name, grid_state, resources, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [keep.id, keep.player_id, keep.name, keep.grid_state, keep.resources, now, now],
  });
  return { ...keep, version: 1, created_at: now, updated_at: now };
}

export async function updateKeepGrid(db: Database, id: string, gridState: string, resources: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE keeps SET grid_state = ?, resources = ?, version = version + 1, updated_at = ? WHERE id = ?',
    args: [gridState, resources, Date.now(), id],
  });
}

export async function updateKeepResources(db: Database, id: string, resources: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE keeps SET resources = ?, updated_at = ? WHERE id = ?',
    args: [resources, Date.now(), id],
  });
}
