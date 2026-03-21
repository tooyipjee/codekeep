import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { findKeepByPlayerId, updateKeepGrid, updateKeepResources } from '@codekeep/db';
import { placeStructure, upgradeStructure, demolishStructure } from '@codekeep/server';
import { STRUCTURE_COSTS } from '@codekeep/shared';
import type { KeepGridState, Resources, StructureKind, GridCoord } from '@codekeep/shared';
import type { Env } from '../app.js';

export const keepRoutes = new Hono<Env>();

keepRoutes.use('*', requireAuth);

keepRoutes.get('/', (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const keep = findKeepByPlayerId(db, playerId);
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
  const keep = findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  const body = await c.req.json<{ pos: GridCoord; kind: StructureKind }>();
  const grid: KeepGridState = JSON.parse(keep.grid_state);
  const resources: Resources = JSON.parse(keep.resources);

  const cost = STRUCTURE_COSTS[body.kind]?.[1];
  if (!cost) return c.json({ error: 'Invalid structure kind' }, 400);
  if (resources.gold < cost.gold || resources.wood < cost.wood || resources.stone < cost.stone) {
    return c.json({ error: 'Insufficient resources' }, 400);
  }

  const result = placeStructure(grid, body.pos, body.kind);
  if (!result.ok) return c.json({ error: result.error }, 400);

  const newResources: Resources = {
    gold: resources.gold - cost.gold,
    wood: resources.wood - cost.wood,
    stone: resources.stone - cost.stone,
  };

  updateKeepGrid(db, keep.id, JSON.stringify(result.grid), JSON.stringify(newResources));
  return c.json({ ok: true, grid: result.grid, resources: newResources });
});

keepRoutes.post('/save', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const keep = findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  const body = await c.req.json<{ grid: KeepGridState; resources: Resources }>();
  updateKeepGrid(db, keep.id, JSON.stringify(body.grid), JSON.stringify(body.resources));
  return c.json({ ok: true });
});
