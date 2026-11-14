import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { mockSupabase, testEnv } from './helpers';
import { DID, IDENT, STEAM, USER, formRequest, rpcPath } from './fixtures';

afterEach(() => vi.unstubAllGlobals());

const endpoints = [
  { path: '/api/state', method: 'GET' },
  { path: '/api/username-link', method: 'POST' },
  { path: '/api/accounts/create', method: 'POST' },
  { path: '/api/accounts/action', method: 'POST' },
  { path: '/api/transfer', method: 'POST' }
];
const fns = ['fab_get_player_account', 'fab_create_player_account', 'fab_delete_player_account', 'fab_rename_player_account', 'fab_transfer'];
const rpcRoutes = Object.fromEntries(fns.map((f) => [rpcPath(f), { body: {} }]));
const authUser = { id: 'u1', email: 'p@x.co', user_metadata: { username: 'p' }, identities: [{ provider: 'discord', identity_data: { sub: DID } }] };
const hostile = { accountNumber: 'A1', action: 'rename', accountName: 'X', amount: '1.00', steamId: '1', p_steam_id: '1', p_sender_steam_id: '1' };

describe.each(endpoints)('$method $path', ({ path, method }) => {
  it('401 and zero fetches without Authorization', async () => {
    const { calls } = mockSupabase({});
    const res = await worker.fetch(formRequest(`https://x.test${path}`, hostile, { method, auth: null }), testEnv);
    expect(res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('<=3 fetches, token-derived steam id only, no secrets or stack in body', async () => {
    const { calls } = mockSupabase({ [USER]: { body: authUser }, [IDENT]: { body: [{ steam_id: STEAM, discord_id: DID, alias: 'A' }] }, ...rpcRoutes });
    const res = await worker.fetch(formRequest(`https://x.test${path}`, hostile, { method, auth: 'Bearer secret-token-123' }), testEnv);
    const text = await res.text();
    expect(calls.length).toBeLessThanOrEqual(3);
    for (const c of calls.filter((r) => r.url.includes('/rpc/fab_') && !r.url.includes('register_auth'))) {
      const body = await c.clone().text();
      expect(body).not.toMatch(/"1"/);
      expect(body).toContain(STEAM);
    }
    expect(text).not.toContain(testEnv.SUPABASE_SERVICE_ROLE_KEY);
    expect(text).not.toContain('secret-token-123');
    expect(text).not.toMatch(/\bat .*\.ts|Error:/);
  });
});
