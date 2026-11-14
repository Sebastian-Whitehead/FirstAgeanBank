import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleCreateAccount } from '../src/endpoints/create-account';
import { formRequest, rpcCalls, setupRpc, STEAM, testEnv } from './fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const FN = 'fab_create_player_account';
const call = (fields: Record<string, string>, opts?: { method?: string; auth?: string | null }) =>
  handleCreateAccount(formRequest('https://x.test/api/accounts/create', fields, opts), testEnv);
const err = (code: string) => ({ success: false, error: code, redirect: `/accounts/?error=${code}` });

describe('POST /api/accounts/create', () => {
  it('GET -> 405', async () => {
    const { calls } = setupRpc(FN, { body: {} });
    const res = await call({}, { method: 'GET' });
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
    expect(calls).toHaveLength(0);
  });

  it('no auth -> 401, no RPC', async () => {
    const { calls } = setupRpc(FN, { body: {} });
    const res = await call({ accountName: 'Savings' }, { auth: null });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'loggedout' });
    expect(rpcCalls(calls, FN)).toHaveLength(0);
  });

  it('missing accountName -> 422, no RPC', async () => {
    const { calls } = setupRpc(FN, { body: {} });
    const res = await call({});
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err('invalidaccountname'));
    expect(rpcCalls(calls, FN)).toHaveLength(0);
  });

  it('41-char name -> 422 invalidaccountname', async () => {
    setupRpc(FN, { body: {} });
    const res = await call({ accountName: 'x'.repeat(41) });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err('invalidaccountname'));
  });

  it('happy path; name trimmed; steamId field ignored', async () => {
    const { calls } = setupRpc(FN, { body: {} });
    const res = await call({ accountName: ' Savings ', steamId: '76561198999999999' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null, redirect: '/accounts/?account=created' });
    const rpc = rpcCalls(calls, FN);
    expect(rpc).toHaveLength(1);
    expect(await rpc[0].json()).toEqual({ p_steam_id: STEAM, p_account_name: 'Savings' });
  });

  it.each([
    ['400 account_name_taken', 400, {}, 'account_name_taken', 'accountnametaken'],
    ['400 invalid_account_name', 400, {}, 'invalid_account_name', 'invalidaccountname'],
    ['409 unique violation', 409, { code: '23505' }, 'duplicate key value violates unique constraint "accounts_player_name_unique"', 'accountnametaken'],
    ['23505 other constraint', 409, { code: '23505' }, 'duplicate key value violates unique constraint "other"', 'supabaseunavailable'],
    ['500', 500, {}, 'boom', 'supabaseunavailable']
  ])('RPC %s -> 422 %s', async (_n, status, extra, message, code) => {
    setupRpc(FN, { status: status as number, body: { ...extra, message } });
    const res = await call({ accountName: 'Savings' });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err(code));
  });
});
