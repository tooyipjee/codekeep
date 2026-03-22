import { handle } from 'hono/vercel';
import { app } from '../packages/api/dist/app.js';

export default handle(app);
