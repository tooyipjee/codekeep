import { Hono } from 'hono';
import type { Env } from '../app.js';
import { log } from '../middleware/request-logger.js';

export const feedbackRoutes = new Hono<Env>();

feedbackRoutes.post('/bug', async (c) => {
  const body = await c.req.json<{
    title: string;
    description: string;
    version?: string;
    platform?: string;
    nodeVersion?: string;
    screen?: string;
    errorStack?: string;
  }>();

  if (!body.title || !body.description) {
    return c.json({ error: 'Title and description required' }, 400);
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? 'tooyipjee/codekeep';

  let issueUrl: string | null = null;

  if (ghToken) {
    try {
      const issueBody = [
        `## Bug Report`,
        ``,
        body.description,
        ``,
        `## Environment`,
        `- Version: ${body.version ?? 'unknown'}`,
        `- Platform: ${body.platform ?? 'unknown'}`,
        `- Node: ${body.nodeVersion ?? 'unknown'}`,
        `- Screen: ${body.screen ?? 'unknown'}`,
        body.errorStack ? `\n## Stack Trace\n\`\`\`\n${body.errorStack}\n\`\`\`` : '',
      ].filter(Boolean).join('\n');

      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: `[Bug]: ${body.title}`,
          body: issueBody,
          labels: ['bug', 'user-reported'],
        }),
      });

      if (res.ok) {
        const data = await res.json() as { html_url: string; number: number };
        issueUrl = data.html_url;
        log({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Bug report created: #${data.number}`,
        });
      }
    } catch (err) {
      log({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to create GitHub issue: ${err}`,
      });
    }
  }

  log({
    timestamp: new Date().toISOString(),
    level: 'warn',
    message: `Bug report: ${body.title}`,
    description: body.description,
    version: body.version,
    platform: body.platform,
  });

  return c.json({
    received: true,
    issueUrl,
    message: issueUrl
      ? `Bug report filed as GitHub issue: ${issueUrl}`
      : 'Bug report logged. Set GITHUB_TOKEN on server to auto-create issues.',
  });
});

feedbackRoutes.post('/feature', async (c) => {
  const body = await c.req.json<{ title: string; description: string; area?: string }>();

  if (!body.title || !body.description) {
    return c.json({ error: 'Title and description required' }, 400);
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? 'tooyipjee/codekeep';
  let issueUrl: string | null = null;

  if (ghToken) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title: `[Feature]: ${body.title}`,
          body: `## Feature Request\n\n${body.description}\n\n**Area:** ${body.area ?? 'General'}`,
          labels: ['enhancement', 'user-requested'],
        }),
      });

      if (res.ok) {
        const data = await res.json() as { html_url: string };
        issueUrl = data.html_url;
      }
    } catch {
      // best-effort
    }
  }

  return c.json({ received: true, issueUrl });
});
