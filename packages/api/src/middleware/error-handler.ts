import { createMiddleware } from 'hono/factory';
import type { Env } from '../app.js';

let Sentry: typeof import('@sentry/node') | null = null;

export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: `codekeep-api@${process.env.npm_package_version ?? '0.1.0'}`,
      tracesSampleRate: 0.1,
    });
    console.log('[sentry] Error tracking initialized');
  } catch (err) {
    console.warn('[sentry] Failed to initialize:', err);
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (Sentry) {
    Sentry.captureException(error, { extra: context });
  }
}

export const errorHandler = createMiddleware<Env>(async (c, next) => {
  try {
    await next();
  } catch (error) {
    captureException(error, {
      method: c.req.method,
      path: c.req.path,
      playerId: c.get('playerId') ?? 'anonymous',
    });

    console.error(`[error] ${c.req.method} ${c.req.path}:`, error);

    return c.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    );
  }
});
