import { createMiddleware } from 'hono/factory';
import type { Env } from '../app.js';

interface Entry {
  count: number;
  resetAt: number;
}

export function rateLimit(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  const store = new Map<string, Entry>();
  const { windowMs, max, keyPrefix = '' } = opts;

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, windowMs).unref();

  return createMiddleware<Env>(async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      ?? c.req.header('x-real-ip')
      ?? 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return c.json(
        { error: 'Too many requests. Try again later.' },
        429,
      );
    }

    return next();
  });
}
