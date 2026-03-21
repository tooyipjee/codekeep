import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createDatabase, type Database } from '@codekeep/db';
import { authRoutes } from './routes/auth.js';
import { playerRoutes } from './routes/player.js';
import { keepRoutes } from './routes/keep.js';
import { raidRoutes } from './routes/raids.js';
import { economyRoutes } from './routes/economy.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { matchmakingRoutes } from './routes/matchmaking.js';
import { bountyRoutes } from './routes/bounties.js';
import { warcampRoutes } from './routes/warcamp.js';

export type Env = {
  Variables: {
    db: Database;
    playerId: string;
  };
};

const dbPath = process.env.CODEKEEP_DB_PATH ?? './codekeep.db';
const db = createDatabase(dbPath);

export const app = new Hono<Env>();

app.use('*', logger());
app.use('*', cors());

app.use('*', async (c, next) => {
  c.set('db', db);
  await next();
});

app.get('/healthz', (c) => {
  return c.json({ status: 'ok', version: '0.1.0', timestamp: Date.now() });
});

app.route('/auth', authRoutes);
app.route('/me', playerRoutes);
app.route('/keep', keepRoutes);
app.route('/raids', raidRoutes);
app.route('/economy', economyRoutes);
app.route('/leaderboard', leaderboardRoutes);
app.route('/matchmaking', matchmakingRoutes);
app.route('/bounties', bountyRoutes);
app.route('/warcamp', warcampRoutes);
