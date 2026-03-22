import { handle } from 'hono/vercel';
import { app } from '../packages/api/dist/app.js';

export const config = { runtime: 'edge' };

export default handle(app);
