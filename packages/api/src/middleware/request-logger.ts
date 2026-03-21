import { createMiddleware } from 'hono/factory';
import type { Env } from '../app.js';

const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN;
const LOGTAIL_URL = 'https://in.logtail.com';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  method?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  player_id?: string;
  [key: string]: unknown;
}

const logBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flushLogs() {
  if (logBuffer.length === 0 || !LOGTAIL_TOKEN) return;
  const batch = logBuffer.splice(0, logBuffer.length);
  try {
    await fetch(LOGTAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOGTAIL_TOKEN}`,
      },
      body: JSON.stringify(batch),
    });
  } catch {
    // best-effort logging
  }
}

if (LOGTAIL_TOKEN) {
  flushTimer = setInterval(flushLogs, 5000);
}

export function log(entry: LogEntry) {
  const line = `[${entry.level}] ${entry.message}${entry.path ? ` ${entry.method} ${entry.path}` : ''}${entry.duration_ms !== undefined ? ` ${entry.duration_ms}ms` : ''}`;
  if (entry.level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }

  if (LOGTAIL_TOKEN) {
    logBuffer.push(entry);
  }
}

export const requestLogger = createMiddleware<Env>(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  log({
    timestamp: new Date().toISOString(),
    level: c.res.status >= 400 ? 'warn' : 'info',
    message: 'request',
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
    player_id: c.get('playerId') ?? undefined,
  });
});
