import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { findKeepByPlayerId, updateKeepResources, type Database } from '@codekeep/db';
import { WARCAMP_TRAIN_COST, WARCAMP_TRAIN_TIME_MS, WARCAMP_BASE_SLOTS } from '@codekeep/shared';
import type { Resources, ProbeType, WarCampSlot } from '@codekeep/shared';
import type { Env } from '../app.js';

interface WarCampRow {
  player_id: string;
  slots: string;
  max_slots: number;
}

function ensureWarCamp(db: Database, playerId: string): WarCampRow {
  let row = db.prepare('SELECT * FROM war_camp WHERE player_id = ?').get(playerId) as WarCampRow | undefined;
  if (!row) {
    const slots: WarCampSlot[] = Array.from({ length: WARCAMP_BASE_SLOTS }, (_, i) => ({
      slotId: i,
      raiderType: null,
      readyAtMs: null,
    }));
    db.prepare('INSERT INTO war_camp (player_id, slots, max_slots) VALUES (?, ?, ?)')
      .run(playerId, JSON.stringify(slots), WARCAMP_BASE_SLOTS);
    row = { player_id: playerId, slots: JSON.stringify(slots), max_slots: WARCAMP_BASE_SLOTS };
  }
  return row;
}

export const warcampRoutes = new Hono<Env>();
warcampRoutes.use('*', requireAuth);

warcampRoutes.get('/', (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const row = ensureWarCamp(db, playerId);
  const slots: WarCampSlot[] = JSON.parse(row.slots);

  return c.json({
    slots,
    maxSlots: row.max_slots,
  });
});

warcampRoutes.post('/train', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const body = await c.req.json<{ slotId: number; raiderType: ProbeType }>();

  const cost = WARCAMP_TRAIN_COST[body.raiderType];
  if (!cost) return c.json({ error: 'Invalid raider type' }, 400);

  const keep = findKeepByPlayerId(db, playerId);
  if (!keep) return c.json({ error: 'Keep not found' }, 404);

  const resources: Resources = JSON.parse(keep.resources);
  if (resources.gold < cost.gold || resources.wood < cost.wood || resources.stone < cost.stone) {
    return c.json({ error: 'Insufficient resources' }, 400);
  }

  const row = ensureWarCamp(db, playerId);
  const slots: WarCampSlot[] = JSON.parse(row.slots);
  const slot = slots.find((s) => s.slotId === body.slotId);
  if (!slot) return c.json({ error: 'Invalid slot' }, 400);
  if (slot.raiderType) return c.json({ error: 'Slot already occupied' }, 400);

  slot.raiderType = body.raiderType;
  slot.readyAtMs = Date.now() + WARCAMP_TRAIN_TIME_MS[body.raiderType];

  db.prepare('UPDATE war_camp SET slots = ? WHERE player_id = ?')
    .run(JSON.stringify(slots), playerId);

  const updated: Resources = {
    gold: resources.gold - cost.gold,
    wood: resources.wood - cost.wood,
    stone: resources.stone - cost.stone,
  };
  updateKeepResources(db, keep.id, JSON.stringify(updated));

  return c.json({ slots, maxSlots: row.max_slots, resources: updated });
});
