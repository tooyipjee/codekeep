import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../packages/api/dist/app.js';

function nodeToWebRequest(req: IncomingMessage): Request {
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody
    ? new ReadableStream({
        start(controller) {
          req.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
          req.on('end', () => controller.close());
          req.on('error', (err) => controller.error(err));
        },
      })
    : undefined;

  return new Request(url.toString(), {
    method: req.method ?? 'GET',
    headers,
    body,
    // @ts-ignore — Node.js fetch supports duplex
    duplex: hasBody ? 'half' : undefined,
  });
}

async function webToNodeResponse(webRes: Response, res: ServerResponse) {
  res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
  if (webRes.body) {
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const webReq = nodeToWebRequest(req);
  const webRes = await app.fetch(webReq);
  await webToNodeResponse(webRes, res);
}
