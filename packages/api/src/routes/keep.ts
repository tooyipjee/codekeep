import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { findKeepByPlayerId, updateKeepGrid, updateKeepResources } from '@codekeep/db';
import { placeStructure, upgradeStructure, demolishStructure } from '@codekeep/server';
import { STRUCTURE_COSTS } from '@codekeep/shared';
import type { Keep, KeepGridState, Resources, StructureKind, GridCoord } from '@codekeep/shared';
import type { Env } from '../app.js';

export const keepRoutes = new Hono<Env>();

keepRoutes.use('*', requireAuth);

keepRoutes.get('/', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const keep = await findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  return c.json({
    id: keep.id,
    name: keep.name,
    grid: JSON.parse(keep.grid_state),
    resources: JSON.parse(keep.resources),
    version: keep.version,
  });
});

keepRoutes.post('/place', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const row = await findKeepByPlayerId(db, playerId);
  if (!row) return c.json({ error: 'Keep not found' }, 404);

  const body = await c.req.json<{ pos: GridCoord; kind: StructureKind }>();
  const keepObj: Keep = {
    id: row.id,
    name: row.name,
    ownerPlayerId: row.player_id,
    grid: JSON.parse(row.grid_state),
    resources: JSON.parse(row.resources),
    createdAtUnixMs: row.created_at,
    updatedAtUnixMs: row.updated_at,
  };

  const result = placeStructure(keepObj, body.pos, body.kind);
  if (!result.ok) return c.json({ error: result.reason }, 400);

  const updated = result.keep!;
  await updateKeepGrid(db, row.id, JSON.stringify(updated.grid), JSON.stringify(updated.resources));
  return c.json({ ok: true, grid: updated.grid, resources: updated.resources });
});

keepRoutes.post('/save', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const keep = await findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  const body = await c.req.json<{ grid: KeepGridState; resources: Resources }>();
  await updateKeepGrid(db, keep.id, JSON.stringify(body.grid), JSON.stringify(body.resources));
  return c.json({ ok: true });
});
