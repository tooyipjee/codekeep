import { Hono } from 'hono';
import { randomUUID, randomBytes } from 'node:crypto';
import { createPlayer, findPlayerByGithubId, findPlayerByApiKey } from '@codekeep/db';
import { createKeep } from '@codekeep/db';
import { createSession } from '@codekeep/db';
import { signJwt } from '../middleware/auth.js';
import { STARTING_RESOURCES } from '@codekeep/shared';
import type { Env } from '../app.js';

export const authRoutes = new Hono<Env>();

authRoutes.post('/register', async (c) => {
  const db = c.get('db');
  const body = await c.req.json<{ displayName?: string; githubId?: string; githubLogin?: string }>();
  const displayName = body.displayName ?? 'Keeper';

  const playerId = `p_${randomUUID().slice(0, 8)}`;
  const apiKey = `ck_${randomBytes(24).toString('hex')}`;
  const keepId = `k_${randomUUID().slice(0, 8)}`;

  createPlayer(db, {
    id: playerId,
    github_id: body.githubId ?? null,
    github_login: body.githubLogin ?? null,
    display_name: displayName,
    api_key: apiKey,
    trophies: 0,
    league: 'copper',
    settings: '{}',
    shield_expires_at: Date.now() + 48 * 60 * 60 * 1000,
    last_seen_at: Date.now(),
  });

  const gridState = JSON.stringify({ width: 16, height: 16, structures: [] });
  const resources = JSON.stringify(STARTING_RESOURCES);
  createKeep(db, { id: keepId, player_id: playerId, name: `${displayName}'s Keep`, grid_state: gridState, resources });

  const token = await signJwt(playerId);
  const refreshToken = randomBytes(32).toString('hex');
  createSession(db, {
    id: randomUUID(),
    player_id: playerId,
    refresh_token: refreshToken,
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
    created_at: Date.now(),
  });

  return c.json({ playerId, apiKey, token, refreshToken, keepId });
});

authRoutes.post('/login', async (c) => {
  const db = c.get('db');
  const body = await c.req.json<{ apiKey: string }>();
  const player = findPlayerByApiKey(db, body.apiKey);
  if (!player) return c.json({ error: 'Invalid API key' }, 401);

  const token = await signJwt(player.id);
  return c.json({ playerId: player.id, token });
});

authRoutes.post('/github', async (c) => {
  const db = c.get('db');
  const body = await c.req.json<{ githubId: string; githubLogin: string; displayName: string }>();

  let player = findPlayerByGithubId(db, body.githubId);
  if (player) {
    const token = await signJwt(player.id);
    return c.json({ playerId: player.id, token, isNew: false });
  }

  const playerId = `p_${randomUUID().slice(0, 8)}`;
  const apiKey = `ck_${randomBytes(24).toString('hex')}`;
  const keepId = `k_${randomUUID().slice(0, 8)}`;

  createPlayer(db, {
    id: playerId,
    github_id: body.githubId,
    github_login: body.githubLogin,
    display_name: body.displayName,
    api_key: apiKey,
    trophies: 0,
    league: 'copper',
    settings: '{}',
    shield_expires_at: Date.now() + 48 * 60 * 60 * 1000,
    last_seen_at: Date.now(),
  });

  const gridState = JSON.stringify({ width: 16, height: 16, structures: [] });
  const resources = JSON.stringify(STARTING_RESOURCES);
  createKeep(db, { id: keepId, player_id: playerId, name: `${body.displayName}'s Keep`, grid_state: gridState, resources });

  const token = await signJwt(playerId);
  return c.json({ playerId, apiKey, token, keepId, isNew: true });
});
