import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleState } from '../src/endpoints/state';
import { mockSupabase, testEnv, type Route } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const DID = '123456789012345678';
const USER = '/auth/v1/user';
const IDENT = '/rest/v1/identities_player';
const RPC = '/rest/v1/rpc/fab_get_player_account';

const authUser = {
  id: 'u1',
  email: 'p@x.co',
  user_metadata: { username: 'player1' },
  identities: [{ provider: 'discord', identity_data: { sub: DID, global_name: 'Glob' } }]
};
const row = { steam_id: '76561198000000001', discord_id: DID, alias: 'Alias' };

function setup(rpc: Route, rows: Route = { body: [row] }) {
  return mockSupabase({ [USER]: { body: authUser }, [IDENT]: rows, [RPC]: rpc });
}
const get = (auth: string | null = 'Bearer tok', method = 'GET') =>
  handleState(new Request('https://x.test/api/state', { method, headers: auth ? { Authorization: auth } : {} }), testEnv);
const rpcCalls = (calls: Request[]) => calls.filter((c) => new URL(c.url).pathname === RPC);

describe('GET /api/state', () => {
  it('happy path', async () => {
    const activities = [{ id: 1 }];
    const { calls } = setup({
      body: {
        accounts: [
          { account_number: 'A1', account_name: 'Main', account_type: 'checking', money: 123456 },
          { account_number: 'A2', account_name: null, account_type: 'savings', money: 0 }
        ],
        activities
      }
    });
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      authenticated: true,
      user: {
        username: 'player1',
        firstname: 'Alias',
        lastname: '',
        accounts: [
          { accountNumber: 'A1', name: 'Main', type: 'checking', balance: 1234.56 },
          { accountNumber: 'A2', name: '', type: 'savings', balance: 0 }
        ],
        steamId: '76561198000000001',
        discordId: DID
      },
      activities
    });
    expect(await rpcCalls(calls)[0].json()).toEqual({ p_steam_id: '76561198000000001', p_limit: 15 });
  });

  it('missing accounts key -> []', async () => {
    setup({ body: {} });
    const body = (await (await get()).json()) as { user: { accounts: unknown[] }; activities: unknown[] };
    expect(body.user.accounts).toEqual([]);
    expect(body.activities).toEqual([]);
  });

  it('accounts not an array -> 503 supabaseunavailable', async () => {
    setup({ body: { accounts: 'x' } });
    const res = await get();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'supabaseunavailable' });
  });

  it('empty RPC body -> 503 identityunavailable', async () => {
    setup({ status: 200, raw: '' });
    const res = await get();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'identityunavailable' });
  });

  it('RPC 500 -> 503 supabaseunavailable', async () => {
    setup({ status: 500, body: {} });
    const res = await get();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'supabaseunavailable' });
  });

  it('no auth header -> 401 loggedout, RPC not called', async () => {
    const { calls } = setup({ body: {} });
    const res = await get(null);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'loggedout' });
    expect(rpcCalls(calls)).toHaveLength(0);
  });

  it('identitynotfound -> 403, RPC not called', async () => {
    const { calls } = setup({ body: {} }, { body: [] });
    const res = await get();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'identitynotfound' });
    expect(rpcCalls(calls)).toHaveLength(0);
  });

  it('POST -> 405', async () => {
    const { calls } = setup({ body: {} });
    const res = await get('Bearer tok', 'POST');
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET');
    expect(calls).toHaveLength(0);
  });
});
