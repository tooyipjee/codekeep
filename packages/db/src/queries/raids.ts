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

export function createRaid(db: Database, raid: RaidRow): void {
  db.prepare(`INSERT INTO raids (id, seed, rules_version, attacker_id, defender_keep_id, defender_grid, probe_types, outcome, loot_gained, loot_lost, replay, attacker_trophies_delta, defender_trophies_delta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    raid.id, raid.seed, raid.rules_version, raid.attacker_id,
    raid.defender_keep_id, raid.defender_grid, raid.probe_types,
    raid.outcome, raid.loot_gained, raid.loot_lost, raid.replay,
    raid.attacker_trophies_delta, raid.defender_trophies_delta, raid.created_at,
  );
}

export function findRaidsByAttacker(db: Database, attackerId: string, limit = 20): RaidRow[] {
  return db.prepare('SELECT * FROM raids WHERE attacker_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(attackerId, limit) as RaidRow[];
}

export function findRaidsByDefender(db: Database, keepId: string, limit = 20): RaidRow[] {
  return db.prepare('SELECT * FROM raids WHERE defender_keep_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(keepId, limit) as RaidRow[];
}

export function findIncomingRaids(db: Database, keepId: string, sinceMs: number): RaidRow[] {
  return db.prepare('SELECT * FROM raids WHERE defender_keep_id = ? AND created_at > ? ORDER BY created_at DESC')
    .all(keepId, sinceMs) as RaidRow[];
}

export function findRaidById(db: Database, id: string): RaidRow | undefined {
  return db.prepare('SELECT * FROM raids WHERE id = ?').get(id) as RaidRow | undefined;
}

export function hasRecentAttack(db: Database, attackerId: string, defenderKeepId: string, cooldownMs: number): boolean {
  const cutoff = Date.now() - cooldownMs;
  const row = db.prepare('SELECT 1 FROM raids WHERE attacker_id = ? AND defender_keep_id = ? AND created_at > ? LIMIT 1')
    .get(attackerId, defenderKeepId, cutoff);
  return row !== undefined;
}
