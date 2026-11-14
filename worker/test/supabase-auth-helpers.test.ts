import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthEmailForUsername, passwordSignIn, registerAuthUsername } from '../src/supabase';
import { mockSupabase, testEnv } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const GET = '/rest/v1/rpc/fab_get_auth_email_for_username';
const REG = '/rest/v1/rpc/fab_register_auth_username';
const TOKEN = '/auth/v1/token';

describe('getAuthEmailForUsername', () => {
  it('sends p_username to the RPC', async () => {
    const { calls } = mockSupabase({ [GET]: { body: [] } });
    await getAuthEmailForUsername(testEnv, 'bob');
    expect(await calls[0].json()).toEqual({ p_username: 'bob' });
  });

  it('maps rows to emails', async () => {
    mockSupabase({ [GET]: { body: [] } });
    await expect(getAuthEmailForUsername(testEnv, 'bob')).resolves.toBeNull();
    mockSupabase({ [GET]: { body: [{ email: 'a@b.co' }] } });
    await expect(getAuthEmailForUsername(testEnv, 'bob')).resolves.toBe('a@b.co');
  });

  it.each([
    ['two rows', { body: [{ email: 'a@b.co' }, { email: 'c@d.co' }] }],
    ['bad email', { body: [{ email: 'nope' }] }],
    ['empty body', { status: 200 }],
    ['object', { body: {} }]
  ])('throws on %s', async (_n, route) => {
    mockSupabase({ [GET]: route });
    await expect(getAuthEmailForUsername(testEnv, 'bob')).rejects.toThrow();
  });
});

describe('registerAuthUsername', () => {
  it('lowercases the email', async () => {
    const { calls } = mockSupabase({ [REG]: { body: [{ success: true }] } });
    await registerAuthUsername(testEnv, 'bob', 'A@B.CO');
    expect(await calls[0].json()).toEqual({ p_username: 'bob', p_email: 'a@b.co' });
  });

  it('returns the success flag', async () => {
    mockSupabase({ [REG]: { body: [{ success: true }] } });
    await expect(registerAuthUsername(testEnv, 'b', 'a@b.co')).resolves.toBe(true);
    mockSupabase({ [REG]: { body: [{ success: false }] } });
    await expect(registerAuthUsername(testEnv, 'b', 'a@b.co')).resolves.toBe(false);
  });

  it.each([
    ['empty array', { body: [] }],
    ['non-boolean', { body: [{ success: 'yes' }] }],
    ['two rows', { body: [{ success: true }, { success: true }] }]
  ])('throws on %s', async (_n, route) => {
    mockSupabase({ [REG]: route });
    await expect(registerAuthUsername(testEnv, 'b', 'a@b.co')).rejects.toThrow();
  });
});

describe('passwordSignIn', () => {
  it('uses the publishable key and grant_type=password', async () => {
    const { calls } = mockSupabase({ [TOKEN]: { body: { access_token: 'a', refresh_token: 'r' } } });
    await passwordSignIn(testEnv, 'a@b.co', 'pw');
    const req = calls[0];
    expect(req.url).toContain('grant_type=password');
    expect(req.headers.get('apikey')).toBe('pub-key');
    expect(req.headers.get('Authorization')).toBeNull();
    expect(await req.json()).toEqual({ email: 'a@b.co', password: 'pw' });
  });

  it('returns null for 400 and 401, throws for 500', async () => {
    for (const status of [400, 401]) {
      mockSupabase({ [TOKEN]: { status, body: {} } });
      await expect(passwordSignIn(testEnv, 'a@b.co', 'pw')).resolves.toBeNull();
    }
    mockSupabase({ [TOKEN]: { status: 500, body: {} } });
    await expect(passwordSignIn(testEnv, 'a@b.co', 'pw')).rejects.toThrow();
  });

  it('throws when refresh_token is missing', async () => {
    mockSupabase({ [TOKEN]: { body: { access_token: 'a' } } });
    await expect(passwordSignIn(testEnv, 'a@b.co', 'pw')).rejects.toThrow();
  });

  it('returns only the two token keys', async () => {
    mockSupabase({ [TOKEN]: { body: { access_token: 'a', refresh_token: 'r', user: { id: 'x' }, expires_in: 3600 } } });
    await expect(passwordSignIn(testEnv, 'a@b.co', 'pw')).resolves.toEqual({ access_token: 'a', refresh_token: 'r' });
  });

  it('never logs the password', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase({ [TOKEN]: { status: 500, body: { message: 'boom' } } });
    await passwordSignIn(testEnv, 'a@b.co', 'S3cretPw!').catch(() => {});
    mockSupabase({ [TOKEN]: { throws: true } });
    await passwordSignIn(testEnv, 'a@b.co', 'S3cretPw!').catch(() => {});
    expect(JSON.stringify(spy.mock.calls)).not.toContain('S3cretPw!');
  });
});
