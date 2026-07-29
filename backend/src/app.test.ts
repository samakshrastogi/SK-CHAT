import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from './app.js';

describe('health endpoint', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('allows PATCH notification requests in CORS preflights', async () => {
    const response = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'PATCH',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('PATCH');
  });

  it('returns healthy status', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const payload = await response.json() as { status: string };

    expect(response.status).toBe(200);
    expect(payload.status).toBe('healthy');
  });
});
