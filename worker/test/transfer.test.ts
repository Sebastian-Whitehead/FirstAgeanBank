import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleTransfer } from '../src/endpoints/transfer';
import { formRequest, rpcCalls, rpcPath, setupRpc, STEAM, testEnv } from './fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const FN = 'fab_transfer';
const validForm = (): Record<string, string> => ({
  sourceAccountNumber: 'A1',
  destinationAccountNumber: 'B2',
  amount: '10.50',
  idempotencyKey: crypto.randomUUID()
});
const call = (fields: Record<string, string>, opts?: { method?: string; auth?: string | null }) =>
  handleTransfer(formRequest('https://x.test/api/transfer', fields, opts), testEnv);
const err = (code: string) => ({ success: false, error: code, redirect: `/transfer/?error=${code}` });

describe('POST /api/transfer', () => {
  it('GET -> 405; no auth -> 401', async () => {
    setupRpc(FN, { body: {} });
    expect((await call({}, { method: 'GET' })).status).toBe(405);
    expect((await call(validForm(), { auth: null })).status).toBe(401);
  });

  it('missing source / dest -> invalidaccountnumber', async () => {
    setupRpc(FN, { body: {} });
    const { sourceAccountNumber: _s, ...noSource } = validForm();
    const { destinationAccountNumber: _d, ...noDest } = validForm();
    for (const f of [noSource, noDest]) {
      const res = await call(f);
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(err('invalidaccountnumber'));
    }
  });

  it('bad amount -> invalidamount, no RPC; 5001 -> limitreached', async () => {
    const { calls } = setupRpc(FN, { body: {} });
    expect(await (await call({ ...validForm(), amount: 'abc' })).json()).toEqual(err('invalidamount'));
    expect(await (await call({ ...validForm(), amount: '5001' })).json()).toEqual(err('limitreached'));
    expect(rpcCalls(calls, FN)).toHaveLength(0);
  });

  it('missing or malformed key -> transferfailed', async () => {
    setupRpc(FN, { body: {} });
    const { idempotencyKey: _k, ...noKey } = validForm();
    for (const f of [noKey, { ...validForm(), idempotencyKey: 'not-a-uuid' }]) {
      const res = await call(f);
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(err('transferfailed'));
    }
  });

  it('uppercase padded UUID is accepted, sent lowercased and trimmed', async () => {
    const { calls } = setupRpc(FN, { body: {} });
    const key = crypto.randomUUID();
    const res = await call({ ...validForm(), idempotencyKey: `  ${key.toUpperCase()} ` });
    expect(res.status).toBe(200);
    expect(((await rpcCalls(calls, FN)[0].json()) as Record<string, unknown>).p_idempotency_key).toBe(key);
  });

  it('order: missing source and bad amount -> invalidaccountnumber', async () => {
    setupRpc(FN, { body: {} });
    const { sourceAccountNumber: _s, ...rest } = validForm();
    expect(await (await call({ ...rest, amount: 'abc' })).json()).toEqual(err('invalidaccountnumber'));
  });

  it('happy path; integer cents; sender from token', async () => {
    const { calls } = setupRpc(FN, { body: {} });
    const f: Record<string, string> = { ...validForm(), p_sender_steam_id: '1', steamId: '2' };
    const key = f.idempotencyKey;
    const res = await call(f);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null, redirect: '/accounts/?transfer=success' });
    const rpc = rpcCalls(calls, FN);
    expect(rpc).toHaveLength(1);
    const text = await rpc[0].text();
    expect(JSON.parse(text)).toEqual({
      p_sender_steam_id: STEAM,
      p_sender_account_number: 'A1',
      p_recipient_account_number: 'B2',
      p_amount: 1050,
      p_idempotency_key: key
    });
    expect(text).toContain('"p_amount":1050,');
  });

  it.each([
    ['account_archived', 'P0001', 'accountarchived'],
    ['account_archived', 'P0004', 'accountarchived'],
    ['x', 'P0002', 'recipientnotfound'],
    ['x', 'P0003', 'invalidaccounts'],
    ['x', 'P0004', 'insufficientfunds'],
    ['x', 'P0001', 'transferfailed']
  ])('RPC message %s code %s -> %s', async (message, code, expected) => {
    setupRpc(FN, { status: 400, body: { code, message } });
    const res = await call(validForm());
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(err(expected));
  });

  it('RPC 500 and network throw -> transferfailed', async () => {
    setupRpc(FN, { status: 500, body: { message: 'boom' } });
    expect(await (await call(validForm())).json()).toEqual(err('transferfailed'));
    vi.unstubAllGlobals();
    setupRpc(FN, { throws: true });
    // network failure on RPC is a SupabaseRequestError; auth/identity fetches succeed first
    expect(await (await call(validForm())).json()).toEqual(err('transferfailed'));
  });
});
