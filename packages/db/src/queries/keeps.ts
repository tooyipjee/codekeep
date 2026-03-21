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

export function findKeepByPlayerId(db: Database, playerId: string): KeepRow | undefined {
  return db.prepare('SELECT * FROM keeps WHERE player_id = ?').get(playerId) as KeepRow | undefined;
}

export function createKeep(db: Database, keep: Omit<KeepRow, 'created_at' | 'updated_at' | 'version'>): KeepRow {
  const now = Date.now();
  db.prepare(`INSERT INTO keeps (id, player_id, name, grid_state, resources, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)`).run(
    keep.id, keep.player_id, keep.name, keep.grid_state, keep.resources, now, now,
  );
  return { ...keep, version: 1, created_at: now, updated_at: now };
}

export function updateKeepGrid(db: Database, id: string, gridState: string, resources: string): void {
  db.prepare('UPDATE keeps SET grid_state = ?, resources = ?, version = version + 1, updated_at = ? WHERE id = ?')
    .run(gridState, resources, Date.now(), id);
}

export function updateKeepResources(db: Database, id: string, resources: string): void {
  db.prepare('UPDATE keeps SET resources = ?, updated_at = ? WHERE id = ?')
    .run(resources, Date.now(), id);
}
