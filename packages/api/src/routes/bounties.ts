import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { findKeepByPlayerId, updateKeepResources } from '@codekeep/db';
import type { Resources } from '@codekeep/shared';
import type { Env } from '../app.js';

interface BountyRow {
  id: string;
  player_id: string;
  type: string;
  description: string;
  reward: string;
  completed: number;
  day: number;
  created_at: number;
}

const BOUNTY_TEMPLATES = [
  { type: 'raid', description: 'Win a defense raid', reward: { gold: 25, wood: 15, stone: 10 } },
  { type: 'raid', description: 'Complete 2 raids (win or lose)', reward: { gold: 30, wood: 20, stone: 15 } },
  { type: 'defense', description: 'Defend your keep successfully', reward: { gold: 20, wood: 20, stone: 20 } },
  { type: 'build', description: 'Place 3 structures', reward: { gold: 15, wood: 25, stone: 20 } },
  { type: 'build', description: 'Upgrade a structure', reward: { gold: 20, wood: 10, stone: 25 } },
  { type: 'raid', description: 'Win a PvP raid', reward: { gold: 40, wood: 25, stone: 20 } },
];

function getCurrentDay(): number {
  return Math.floor(Date.now() / 86400000);
}

export const bountyRoutes = new Hono<Env>();
bountyRoutes.use('*', requireAuth);

bountyRoutes.get('/', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const today = getCurrentDay();

  let result = await db.execute({
    sql: 'SELECT * FROM bounties WHERE player_id = ? AND day = ?',
    args: [playerId, today],
  });
  let bounties = result.rows as unknown as BountyRow[];

  if (bounties.length === 0) {
    const shuffled = [...BOUNTY_TEMPLATES].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    const now = Date.now();

    for (const template of picked) {
      const id = `b_${randomUUID().slice(0, 8)}`;
      await db.execute({
        sql: 'INSERT INTO bounties (id, player_id, type, description, reward, completed, day, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        args: [id, playerId, template.type, template.description, JSON.stringify(template.reward), today, now],
      });
    }

    const refreshed = await db.execute({
      sql: 'SELECT * FROM bounties WHERE player_id = ? AND day = ?',
      args: [playerId, today],
    });
    bounties = refreshed.rows as unknown as BountyRow[];
  }

  return c.json({
    bounties: bounties.map((b) => ({
      id: b.id,
      type: b.type,
      description: b.description,
      reward: JSON.parse(b.reward),
      completed: b.completed === 1,
    })),
  });
});

bountyRoutes.post('/:id/claim', async (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const bountyId = c.req.param('id');

  const result = await db.execute({
    sql: 'SELECT * FROM bounties WHERE id = ? AND player_id = ?',
    args: [bountyId, playerId],
  });
  const bounty = result.rows[0] as unknown as BountyRow | undefined;
  if (!bounty) return c.json({ error: 'Bounty not found' }, 404);
  if (bounty.completed === 1) return c.json({ error: 'Already claimed' }, 400);

  await db.execute({ sql: 'UPDATE bounties SET completed = 1 WHERE id = ?', args: [bountyId] });

  const reward: Resources = JSON.parse(bounty.reward);
  const keep = await findKeepByPlayerId(db, playerId);
  if (keep) {
    const resources: Resources = JSON.parse(keep.resources);
    const updated: Resources = {
      gold: resources.gold + reward.gold,
      wood: resources.wood + reward.wood,
      stone: resources.stone + reward.stone,
    };
    await updateKeepResources(db, keep.id, JSON.stringify(updated));
  }

  return c.json({ reward });
});
