import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRouter } from '../src/index';
import { testEnv } from './helpers';

afterEach(() => vi.restoreAllMocks());

const router = createRouter({
  '/api/test': async () => Response.json({ ok: true }),
  '/api/boom': async () => {
    throw new Error('secret detail');
  }
});
const call = (url: string) => router.fetch(new Request(`https://x.test${url}`), testEnv);

describe('router', () => {
  it.each(['/api/unknown', '/api/'])('%s -> 404 notfound', async (path) => {
    const res = await call(path);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'notfound' });
  });

  it('passes non-API paths to ASSETS', async () => {
    expect(await (await call('/accounts/')).text()).toBe('asset');
  });

  it.each(['/api/test', '/api/test/', '/api/test?x=1'])('%s reaches the handler', async (path) => {
    expect(await (await call(path)).json()).toEqual({ ok: true });
  });

  it('thrown errors give 500 without leaking the message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('/api/boom');
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain('servererror');
    expect(text).not.toContain('secret detail');
  });
});
