import { serve } from '@hono/node-server';
import { app, initDb } from './app.js';
import { initSentry } from './middleware/error-handler.js';

const port = parseInt(process.env.PORT ?? process.env.CODEKEEP_PORT ?? '3000', 10);
const host = process.env.CODEKEEP_HOST ?? '0.0.0.0';

await initSentry();
await initDb();

console.log(`CodeKeep API starting on ${host}:${port}`);
serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  console.log(`CodeKeep API ready at http://${info.address}:${info.port}`);
});
