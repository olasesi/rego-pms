import request from 'supertest';
import { createApp } from '../../src/app';
import { initI18n } from '../../src/config/i18n';

describe('app integration smoke (no DB required)', () => {
  beforeAll(async () => {
    await initI18n();
  });

  it('serves OpenAPI spec at /docs.json', async () => {
    const res = await request(createApp()).get('/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBeDefined();
    expect(res.body.info.title).toBeDefined();
  });

  it('serves swagger UI at /docs', async () => {
    const res = await request(createApp()).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('exposes prometheus metrics at /metrics', async () => {
    const res = await request(createApp()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  it('returns health envelope (up or degraded) without throwing', async () => {
    const res = await request(createApp()).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(['ok', 'degraded']).toContain(res.body.data.status);
  });

  it('validates body and returns i18n error envelope on invalid login payload', async () => {
    const res = await request(createApp())
      .post('/api/v1/auth/login')
      .set('Accept-Language', 'en')
      .send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('returns JSON 404 envelope for unknown routes', async () => {
    const res = await request(createApp()).get('/api/v1/nope-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});