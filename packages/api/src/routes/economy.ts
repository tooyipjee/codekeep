import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { findKeepByPlayerId, updateKeepResources } from '@codekeep/db';
import { CODING_EVENT_GRANTS, FAUCET_BASE_USES, KINGDOM_EVENT_NAMES } from '@codekeep/shared';
import type { Resources } from '@codekeep/shared';
import type { Env } from '../app.js';

export const economyRoutes = new Hono<Env>();

economyRoutes.use('*', requireAuth);

economyRoutes.post('/coding-event', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const body = await c.req.json<{ type: string }>();

  const grants = CODING_EVENT_GRANTS[body.type];
  if (!grants) return c.json({ error: 'Unknown event type' }, 400);

  const keep = findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  const resources: Resources = JSON.parse(keep.resources);
  const updated: Resources = {
    gold: resources.gold + grants.gold,
    wood: resources.wood + grants.wood,
    stone: resources.stone + grants.stone,
  };
  updateKeepResources(db, keep.id, JSON.stringify(updated));

  return c.json({ grants, resources: updated, message: KINGDOM_EVENT_NAMES[body.type] ?? 'Event recorded' });
});

economyRoutes.post('/faucet', (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const keep = findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  const grants: Resources = { gold: 5, wood: 5, stone: 10 };
  const resources: Resources = JSON.parse(keep.resources);
  const updated: Resources = {
    gold: resources.gold + grants.gold,
    wood: resources.wood + grants.wood,
    stone: resources.stone + grants.stone,
  };
  updateKeepResources(db, keep.id, JSON.stringify(updated));

  return c.json({ grants, resources: updated });
});
