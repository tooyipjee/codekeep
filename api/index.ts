import { handle } from '@hono/node-server/vercel';
import { app } from '../packages/api/dist/app.js';

export default handle(app);
