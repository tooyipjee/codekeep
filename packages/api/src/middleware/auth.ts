import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';
import { findPlayerByApiKey } from '@codekeep/db';
import type { Env } from '../app.js';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'codekeep-dev-secret-change-me');

export async function signJwt(playerId: string): Promise<string> {
  return new jose.SignJWT({ sub: playerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string): Promise<string | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const playerId = await verifyJwt(token);
    if (playerId) {
      c.set('playerId', playerId);
      return next();
    }
  }

  if (authHeader?.startsWith('ApiKey ')) {
    const apiKey = authHeader.slice(7);
    const db = c.get('db');
    const player = findPlayerByApiKey(db, apiKey);
    if (player) {
      c.set('playerId', player.id);
      return next();
    }
  }

  return c.json({ error: 'Unauthorized' }, 401);
});
