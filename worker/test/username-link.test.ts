import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleUsernameLink } from '../src/endpoints/username-link';
import { mockSupabase, testEnv, type Route } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const DID = '123456789012345678';
const USER = '/auth/v1/user';
const IDENT = '/rest/v1/identities_player';
const RPC = '/rest/v1/rpc/fab_register_auth_username';

function authUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'p@x.co',
    user_metadata: { username: 'player1' },
    identities: [{ provider: 'discord', identity_data: { sub: DID } }],
    ...overrides
  };
}
const row = { steam_id: '76561198000000001', discord_id: DID, alias: 'Alias' };

function setup(rpc: Route, user: Record<string, unknown> = authUser()) {
  return mockSupabase({ [USER]: { body: user }, [IDENT]: { body: [row] }, [RPC]: rpc });
}
const post = (body?: string, auth: string | null = 'Bearer tok', method = 'POST') =>
  handleUsernameLink(
    new Request('https://x.test/api/username-link', { method, body, headers: auth ? { Authorization: auth } : {} }),
    testEnv
  );
const rpcBody = async (calls: Request[]) => (await calls.find((c) => new URL(c.url).pathname === RPC)!.json()) as Record<string, unknown>;

describe('POST /api/username-link', () => {
  it('GET -> 405 with Allow, no fetch', async () => {
    const { calls } = setup({ body: [{ success: true }] });
    const res = await post(undefined, 'Bearer tok', 'GET');
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
    expect(calls).toHaveLength(0);
  });

  it('no auth -> 401', async () => {
    setup({ body: [{ success: true }] });
    expect((await post(undefined, null)).status).toBe(401);
  });

  it('discordrequired -> 403', async () => {
    setup({ body: [{ success: true }] }, authUser({ identities: [] }));
    const res = await post();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'discordrequired' });
  });

  it('success -> 200 and RPC params', async () => {
    const { calls } = setup({ body: [{ success: true }] });
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(await rpcBody(calls)).toEqual({ p_username: 'player1', p_email: 'p@x.co' });
  });

  it('lowercases the email', async () => {
    const { calls } = setup({ body: [{ success: true }] }, authUser({ email: 'P@X.CO' }));
    await post();
    expect((await rpcBody(calls)).p_email).toBe('p@x.co');
  });

  it('success:false -> 409 usernametaken', async () => {
    setup({ body: [{ success: false }] });
    const res = await post();
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: 'usernametaken' });
  });

  it('RPC 500 -> 503 usernameunavailable', async () => {
    setup({ status: 500, body: {} });
    const res = await post();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'usernameunavailable' });
  });

  it('RPC [] -> 503 usernameunavailable', async () => {
    setup({ body: [] });
    const res = await post();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'usernameunavailable' });
  });

  it('ignores a username in the body', async () => {
    const { calls } = setup({ body: [{ success: true }] });
    await post(JSON.stringify({ username: 'evil' }));
    expect((await rpcBody(calls)).p_username).toBe('player1');
  });

  // PHP parity: an invalid metadata username falls back to discord-<id>.
  it('invalid metadata username -> discord-<id>', async () => {
    const { calls } = setup({ body: [{ success: true }] }, authUser({ user_metadata: { username: 'Bad Name' } }));
    await post();
    expect((await rpcBody(calls)).p_username).toBe(`discord-${DID}`);
  });
});
