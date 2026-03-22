import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { findPlayerById } from '@codekeep/db';
import { findKeepByPlayerId } from '@codekeep/db';
import { findMatchCandidates, upsertMatchmakingEntry } from '@codekeep/db';
import { hasRecentAttack } from '@codekeep/db';
import { MATCHMAKING_TROPHY_RANGE, ATTACKER_COOLDOWN_MS } from '@codekeep/shared';
import type { KeepGridState } from '@codekeep/shared';
import type { Env } from '../app.js';

export const matchmakingRoutes = new Hono<Env>();

matchmakingRoutes.use('*', requireAuth);

matchmakingRoutes.post('/find', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const player = await findPlayerById(db, playerId);
  if (!player) return c.json({ error: 'Player not found' }, 404);

  const minTrophies = Math.max(0, player.trophies - MATCHMAKING_TROPHY_RANGE);
  const maxTrophies = player.trophies + MATCHMAKING_TROPHY_RANGE;

  const candidates = await findMatchCandidates(db, playerId, minTrophies, maxTrophies, 10);

  const viable: typeof candidates = [];
  for (const cand of candidates) {
    const defender = await findPlayerById(db, cand.player_id);
    if (!defender) continue;
    if (defender.shield_expires_at && defender.shield_expires_at > Date.now()) continue;
    if (await hasRecentAttack(db, playerId, cand.keep_id, ATTACKER_COOLDOWN_MS)) continue;
    viable.push(cand);
  }

  const picks = viable.slice(0, 3);
  if (picks.length === 0) {
    return c.json({ targets: [], message: 'No opponents found. Try again later or raid an NPC.' });
  }

  const targets = [];
  for (const p of picks) {
    const keep = await findKeepByPlayerId(db, p.player_id);
    const defender = await findPlayerById(db, p.player_id);
    const grid: KeepGridState = keep ? JSON.parse(keep.grid_state) : { width: 16, height: 16, structures: [] };
    targets.push({
      playerId: p.player_id,
      displayName: defender?.display_name ?? 'Unknown',
      trophies: p.trophies,
      structureCount: p.structure_count,
      grid,
    });
  }

  return c.json({ targets });
});

matchmakingRoutes.post('/register', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const player = await findPlayerById(db, playerId);
  if (!player) return c.json({ error: 'Player not found' }, 404);

  const keep = await findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  const grid: KeepGridState = JSON.parse(keep.grid_state);
  await upsertMatchmakingEntry(db, {
    player_id: playerId,
    keep_id: keep.id,
    trophies: player.trophies,
    structure_count: grid.structures.length,
    last_raided_at: null,
    updated_at: Date.now(),
  });

  return c.json({ ok: true });
});
