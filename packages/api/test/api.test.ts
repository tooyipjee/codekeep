process.env.CODEKEEP_DB_PATH = '/tmp/codekeep-api-test.db';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app.js';
import { existsSync, unlinkSync } from 'node:fs';

const TEST_DB = '/tmp/codekeep-api-test.db';

function cleanupDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    try { if (existsSync(TEST_DB + suffix)) unlinkSync(TEST_DB + suffix); } catch {}
  }
}

beforeAll(() => {
  cleanupDb();
});

afterAll(() => {
  cleanupDb();
});

async function req(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
  };
  if (body) init.body = JSON.stringify(body);
  return app.request(path, init);
}

describe('API integration', () => {
  let apiKey: string;
  let token: string;
  let playerId: string;

  it('GET /healthz returns ok', async () => {
    const res = await req('GET', '/healthz');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('status', 'ok');
  });

  it('POST /auth/register creates a player', async () => {
    const res = await req('POST', '/auth/register', { displayName: 'TestPlayer' });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json).toHaveProperty('playerId');
    expect(json).toHaveProperty('apiKey');
    expect(json).toHaveProperty('token');
    apiKey = json.apiKey;
    token = json.token;
    playerId = json.playerId;
  });

  it('POST /auth/login with api key returns token', async () => {
    const res = await req('POST', '/auth/login', { apiKey });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json).toHaveProperty('token');
    token = json.token;
  });

  it('POST /auth/login with bad key returns 401', async () => {
    const res = await req('POST', '/auth/login', { apiKey: 'invalid' });
    expect(res.status).toBe(401);
  });

  it('GET /me returns player profile', async () => {
    const res = await req('GET', '/me', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.player.displayName).toBe('TestPlayer');
    expect(json.keep).toBeDefined();
  });

  it('GET /me without auth returns 401', async () => {
    const res = await req('GET', '/me');
    expect(res.status).toBe(401);
  });

  it('GET /me with api key auth works', async () => {
    const res = await req('GET', '/me', undefined, { Authorization: `ApiKey ${apiKey}` });
    expect(res.status).toBe(200);
  });

  it('GET /keep returns keep data', async () => {
    const res = await req('GET', '/keep', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json).toHaveProperty('grid');
    expect(json).toHaveProperty('resources');
  });

  it('POST /keep/save updates keep', async () => {
    const res = await req('POST', '/keep/save', {
      grid: { width: 16, height: 16, structures: [] },
      resources: { gold: 100, wood: 50, stone: 30 },
    }, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
  });

  it('POST /economy/faucet grants resources', async () => {
    const res = await req('POST', '/economy/faucet', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.grants).toHaveProperty('gold');
    expect(json.resources.gold).toBeGreaterThan(0);
  });

  it('POST /economy/coding-event grants resources', async () => {
    const res = await req('POST', '/economy/coding-event', { type: 'git_commit' }, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.grants.gold).toBeGreaterThan(0);
  });

  it('POST /economy/coding-event with unknown type returns 400', async () => {
    const res = await req('POST', '/economy/coding-event', { type: 'fake' }, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(400);
  });

  it('GET /leaderboard returns players', async () => {
    const res = await req('GET', '/leaderboard');
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.players).toBeInstanceOf(Array);
    expect(json.players.length).toBeGreaterThan(0);
  });

  it('POST /matchmaking/register succeeds', async () => {
    await req('POST', '/keep/save', {
      grid: { width: 16, height: 16, structures: [
        { id: 'w1', kind: 'wall', level: 1, pos: { x: 5, y: 5 }, placedAtUnixMs: Date.now() },
        { id: 'w2', kind: 'wall', level: 1, pos: { x: 6, y: 5 }, placedAtUnixMs: Date.now() },
        { id: 'w3', kind: 'wall', level: 1, pos: { x: 7, y: 5 }, placedAtUnixMs: Date.now() },
        { id: 't1', kind: 'treasury', level: 1, pos: { x: 6, y: 6 }, placedAtUnixMs: Date.now() },
        { id: 'a1', kind: 'archerTower', level: 1, pos: { x: 5, y: 6 }, placedAtUnixMs: Date.now() },
      ] },
      resources: { gold: 100, wood: 50, stone: 30 },
    }, { Authorization: `Bearer ${token}` });

    const res = await req('POST', '/matchmaking/register', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
  });

  it('POST /matchmaking/find returns targets (may be empty)', async () => {
    const res = await req('POST', '/matchmaking/find', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json).toHaveProperty('targets');
  });

  it('GET /raids/history returns empty initially', async () => {
    const res = await req('GET', '/raids/history', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.raids).toBeInstanceOf(Array);
  });

  it('GET /bounties returns bounties', async () => {
    const res = await req('GET', '/bounties', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.bounties).toBeInstanceOf(Array);
    expect(json.bounties.length).toBe(3);
  });

  it('GET /warcamp returns war camp', async () => {
    const res = await req('GET', '/warcamp', undefined, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json).toHaveProperty('slots');
    expect(json).toHaveProperty('maxSlots');
  });
});
