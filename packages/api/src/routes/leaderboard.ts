import { Hono } from 'hono';
import type { Env } from '../app.js';

export const leaderboardRoutes = new Hono<Env>();

leaderboardRoutes.get('/', (c) => {
  const db = c.get('db');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
  const rows = db.prepare('SELECT id, display_name, trophies, league FROM players ORDER BY trophies DESC LIMIT ?')
    .all(limit) as { id: string; display_name: string; trophies: number; league: string }[];

  return c.json({
    players: rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      displayName: r.display_name,
      trophies: r.trophies,
      league: r.league,
    })),
  });
});
