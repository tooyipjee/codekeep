import { createClient, type Client } from '@libsql/client';

export type Database = Client;

function authFetch(authToken?: string): typeof globalThis.fetch {
  if (!authToken) return globalThis.fetch;
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has('authorization')) {
      headers.set('authorization', `Bearer ${authToken}`);
    }
    return globalThis.fetch(input, { ...init, headers });
  };
}

const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      github_id TEXT UNIQUE,
      github_login TEXT,
      display_name TEXT NOT NULL,
      api_key TEXT UNIQUE,
      trophies INTEGER NOT NULL DEFAULT 0,
      league TEXT NOT NULL DEFAULT 'copper',
      settings TEXT NOT NULL DEFAULT '{}',
      shield_expires_at INTEGER,
      last_seen_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS keeps (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      name TEXT NOT NULL,
      grid_state TEXT NOT NULL,
      resources TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_keeps_player ON keeps(player_id)`,

    `CREATE TABLE IF NOT EXISTS raids (
      id TEXT PRIMARY KEY,
      seed TEXT NOT NULL,
      rules_version INTEGER NOT NULL,
      attacker_id TEXT NOT NULL REFERENCES players(id),
      defender_keep_id TEXT NOT NULL,
      defender_grid TEXT NOT NULL,
      probe_types TEXT NOT NULL,
      outcome TEXT NOT NULL,
      loot_gained TEXT NOT NULL,
      loot_lost TEXT NOT NULL,
      replay TEXT NOT NULL,
      attacker_trophies_delta INTEGER NOT NULL DEFAULT 0,
      defender_trophies_delta INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_raids_attacker ON raids(attacker_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_raids_defender ON raids(defender_keep_id, created_at)`,

    `CREATE TABLE IF NOT EXISTS progression (
      player_id TEXT PRIMARY KEY REFERENCES players(id),
      total_raids_won INTEGER NOT NULL DEFAULT 0,
      total_raids_lost INTEGER NOT NULL DEFAULT 0,
      total_structures_placed INTEGER NOT NULL DEFAULT 0,
      current_win_streak INTEGER NOT NULL DEFAULT 0,
      best_win_streak INTEGER NOT NULL DEFAULT 0,
      total_raiders_killed_by_archer INTEGER NOT NULL DEFAULT 0,
      achievements TEXT NOT NULL DEFAULT '[]'
    )`,

    `CREATE TABLE IF NOT EXISTS matchmaking_pool (
      player_id TEXT PRIMARY KEY REFERENCES players(id),
      keep_id TEXT NOT NULL,
      trophies INTEGER NOT NULL DEFAULT 0,
      structure_count INTEGER NOT NULL DEFAULT 0,
      last_raided_at INTEGER,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mm_trophies ON matchmaking_pool(trophies)`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      refresh_token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS war_camp (
      player_id TEXT PRIMARY KEY REFERENCES players(id),
      slots TEXT NOT NULL DEFAULT '[]',
      max_slots INTEGER NOT NULL DEFAULT 3
    )`,

    `CREATE TABLE IF NOT EXISTS bounties (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      reward TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      day INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_bounties_player_day ON bounties(player_id, day)`,

    `CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`,
  ],
];

export async function createDatabase(url: string, authToken?: string): Promise<Database> {
  const client = createClient({ url, authToken, fetch: authFetch(authToken) });

  const applied = new Set<string>();
  try {
    const result = await client.execute('SELECT name FROM _migrations');
    for (const r of result.rows) applied.add(r.name as string);
  } catch {
    // Table doesn't exist yet — will be created by first migration
  }

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const name = `${String(i + 1).padStart(3, '0')}_migration`;
    if (applied.has(name)) continue;

    await client.batch(MIGRATIONS[i], 'write');

    try {
      await client.execute({
        sql: 'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
        args: [name, Date.now()],
      });
    } catch {
      // _migrations table was just created in this batch
      await client.execute({
        sql: 'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
        args: [name, Date.now()],
      });
    }
  }

  return client;
}
