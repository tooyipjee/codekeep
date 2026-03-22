import type { Database } from '../database.js';

export interface RaidRow {
  id: string;
  seed: string;
  rules_version: number;
  attacker_id: string;
  defender_keep_id: string;
  defender_grid: string;
  probe_types: string;
  outcome: string;
  loot_gained: string;
  loot_lost: string;
  replay: string;
  attacker_trophies_delta: number;
  defender_trophies_delta: number;
  created_at: number;
}

export async function createRaid(db: Database, raid: RaidRow): Promise<void> {
  await db.execute({
    sql: `INSERT INTO raids (id, seed, rules_version, attacker_id, defender_keep_id, defender_grid, probe_types, outcome, loot_gained, loot_lost, replay, attacker_trophies_delta, defender_trophies_delta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      raid.id, raid.seed, raid.rules_version, raid.attacker_id,
      raid.defender_keep_id, raid.defender_grid, raid.probe_types,
      raid.outcome, raid.loot_gained, raid.loot_lost, raid.replay,
      raid.attacker_trophies_delta, raid.defender_trophies_delta, raid.created_at,
    ],
  });
}

export async function findRaidsByAttacker(db: Database, attackerId: string, limit = 20): Promise<RaidRow[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM raids WHERE attacker_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [attackerId, limit],
  });
  return result.rows as unknown as RaidRow[];
}

export async function findRaidsByDefender(db: Database, keepId: string, limit = 20): Promise<RaidRow[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM raids WHERE defender_keep_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [keepId, limit],
  });
  return result.rows as unknown as RaidRow[];
}

export async function findIncomingRaids(db: Database, keepId: string, sinceMs: number): Promise<RaidRow[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM raids WHERE defender_keep_id = ? AND created_at > ? ORDER BY created_at DESC',
    args: [keepId, sinceMs],
  });
  return result.rows as unknown as RaidRow[];
}

export async function findRaidById(db: Database, id: string): Promise<RaidRow | undefined> {
  const result = await db.execute({ sql: 'SELECT * FROM raids WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as RaidRow | undefined;
}

export async function hasRecentAttack(db: Database, attackerId: string, defenderKeepId: string, cooldownMs: number): Promise<boolean> {
  const cutoff = Date.now() - cooldownMs;
  const result = await db.execute({
    sql: 'SELECT 1 FROM raids WHERE attacker_id = ? AND defender_keep_id = ? AND created_at > ? LIMIT 1',
    args: [attackerId, defenderKeepId, cutoff],
  });
  return result.rows.length > 0;
}
