import { expect, it } from 'vitest';
import worker from '../src/index';
import { testEnv } from './helpers';

it('returns 404 JSON for unknown paths', async () => {
  const res = await worker.fetch(new Request('http://x/api/anything'), testEnv);
  expect(res.status).toBe(404);
  expect(await res.json()).toMatchObject({ error: 'notfound' });
});
