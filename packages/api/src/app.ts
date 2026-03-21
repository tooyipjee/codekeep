import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
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
import { feedbackRoutes } from './routes/feedback.js';

export type Env = {
  Variables: {
    db: Database;
    playerId: string;
  };
};

const dbPath = process.env.CODEKEEP_DB_PATH ?? './codekeep.db';
const db = createDatabase(dbPath);

export const app = new Hono<Env>();

app.use('*', requestLogger);
app.use('*', cors());
app.use('*', errorHandler);

app.use('*', async (c, next) => {
  c.set('db', db);
  await next();
});

const startedAt = Date.now();

app.get('/healthz', (c) => {
  const db = c.get('db');
  let dbOk = false;
  let playerCount = 0;
  try {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM players').get() as { cnt: number };
    dbOk = true;
    playerCount = row.cnt;
  } catch {
    dbOk = false;
  }

  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    version: '0.1.0',
    timestamp: Date.now(),
    uptime_ms: Date.now() - startedAt,
    db: dbOk ? 'connected' : 'error',
    players: playerCount,
    env: process.env.NODE_ENV ?? 'development',
  });
});

app.get('/readyz', (c) => {
  const db = c.get('db');
  try {
    db.prepare('SELECT 1').get();
    return c.json({ ready: true });
  } catch {
    return c.json({ ready: false }, 503);
  }
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
app.route('/feedback', feedbackRoutes);
