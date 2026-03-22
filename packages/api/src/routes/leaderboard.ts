import { Hono } from 'hono';
import type { Env } from '../app.js';

export const leaderboardRoutes = new Hono<Env>();

leaderboardRoutes.get('/', async (c) => {
  const db = c.get('db');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
  const result = await db.execute({
    sql: 'SELECT id, display_name, trophies, league FROM players ORDER BY trophies DESC LIMIT ?',
    args: [limit],
  });

  return c.json({
    players: result.rows.map((r, i) => ({
      rank: i + 1,
      id: r.id as string,
      displayName: r.display_name as string,
      trophies: r.trophies as number,
      league: r.league as string,
    })),
  });
});
