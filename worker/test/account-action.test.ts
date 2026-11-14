import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleAccountAction } from '../src/endpoints/account-action';
import { formRequest, rpcCalls, setupRpc, STEAM, testEnv } from './fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const call = (fields: Record<string, string>, opts?: { method?: string; auth?: string | null }) =>
  handleAccountAction(formRequest('https://x.test/api/accounts/action', fields, opts), testEnv);
const err = (code: string) => ({ success: false, error: code, redirect: `/accounts/?error=${code}` });

describe('POST /api/accounts/action', () => {
  it('GET -> 405; no auth -> 401', async () => {
    setupRpc('fab_delete_player_account', { body: {} });
    expect((await call({}, { method: 'GET' })).status).toBe(405);
    expect((await call({ action: 'delete', accountNumber: 'A1' }, { auth: null })).status).toBe(401);
  });

  it('missing accountNumber -> invalidaccountnumber even with a bad action', async () => {
    const { calls } = setupRpc('fab_delete_player_account', { body: {} });
    const res = await call({ action: 'freeze' });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err('invalidaccountnumber'));
    expect(calls.filter((c) => c.url.includes('/rpc/'))).toHaveLength(0);
  });

  it('blank accountNumber -> invalidaccountnumber', async () => {
    setupRpc('fab_delete_player_account', { body: {} });
    const res = await call({ action: 'delete', accountNumber: '   ' });
    expect(await res.json()).toEqual(err('invalidaccountnumber'));
  });

  it('unknown or missing action -> invalidaccountaction, no RPC', async () => {
    const { calls } = setupRpc('fab_delete_player_account', { body: {} });
    for (const fields of [{ action: 'freeze', accountNumber: 'A1' }, { accountNumber: 'A1' }] as Record<string, string>[]) {
      const res = await call(fields);
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(err('invalidaccountaction'));
    }
    expect(calls.filter((c) => c.url.includes('/rpc/'))).toHaveLength(0);
  });

  it('rename happy path (trimmed, steamId field ignored)', async () => {
    const { calls } = setupRpc('fab_rename_player_account', { body: {} });
    const res = await call({ action: 'rename', accountNumber: ' A1 ', accountName: ' New ', steamId: '1', p_steam_id: '2' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null, redirect: '/accounts/?account=renamed' });
    expect(await rpcCalls(calls, 'fab_rename_player_account')[0].json()).toEqual({
      p_steam_id: STEAM,
      p_account_number: 'A1',
      p_account_name: 'New'
    });
  });

  it('rename with 41-char name -> invalidaccountname, no RPC', async () => {
    const { calls } = setupRpc('fab_rename_player_account', { body: {} });
    const res = await call({ action: 'rename', accountNumber: 'A1', accountName: 'x'.repeat(41) });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err('invalidaccountname'));
    expect(rpcCalls(calls, 'fab_rename_player_account')).toHaveLength(0);
  });

  it('delete happy path', async () => {
    const { calls } = setupRpc('fab_delete_player_account', { body: {} });
    const res = await call({ action: 'delete', accountNumber: 'A1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null, redirect: '/accounts/?account=deleted' });
    expect(await rpcCalls(calls, 'fab_delete_player_account')[0].json()).toEqual({
      p_steam_id: STEAM,
      p_account_number: 'A1'
    });
  });

  it.each([
    ['invalid_account_name', 'invalidaccountname'],
    ['account_name_taken', 'accountnametaken'],
    ['account_balance_not_zero', 'accountbalancenotzero'],
    ['last_player_account', 'lastplayeraccount'],
    ['main_account_protected', 'mainaccountprotected'],
    ['main_account_immutable', 'mainaccountprotected'],
    ['account_not_found', 'accountnotfound'],
    ['player_identity_unavailable', 'accountnotfound']
  ])('RPC message %s -> %s', async (message, code) => {
    setupRpc('fab_delete_player_account', { status: 400, body: { message } });
    const res = await call({ action: 'delete', accountNumber: 'A1' });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err(code));
  });

  it('23505 accounts_player_name_unique -> accountnametaken', async () => {
    setupRpc('fab_rename_player_account', {
      status: 409,
      body: { code: '23505', message: 'violates "accounts_player_name_unique"' }
    });
    const res = await call({ action: 'rename', accountNumber: 'A1', accountName: 'N' });
    expect(await res.json()).toEqual(err('accountnametaken'));
  });

  it('RPC 500 -> 422 supabaseunavailable', async () => {
    setupRpc('fab_delete_player_account', { status: 500, body: { message: 'boom' } });
    const res = await call({ action: 'delete', accountNumber: 'A1' });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err('supabaseunavailable'));
  });
});
