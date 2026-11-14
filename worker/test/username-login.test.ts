import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleUsernameLogin } from '../src/endpoints/username-login';
import { mockSupabase, testEnv, type Route } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const LOOKUP = '/rest/v1/rpc/fab_get_auth_email_for_username';
const TOKEN = '/auth/v1/token';
const session = { access_token: 'acc', refresh_token: 'ref', extra: 'x' };

function setup(lookup: Route = { body: [{ email: 'p@x.co' }] }, token: Route = { body: session }) {
  return mockSupabase({ [LOOKUP]: lookup, [TOKEN]: token });
}
const post = (body: string, headers: Record<string, string> = {}, method = 'POST') =>
  handleUsernameLogin(new Request('https://x.test/api/username-login', { method, body: method === 'GET' ? undefined : body, headers }), testEnv);
const login = (username: unknown, password: unknown) => post(JSON.stringify({ username, password }));

describe('method and size', () => {
  it('GET -> 405', async () => {
    const { calls } = setup();
    const res = await post('', {}, 'GET');
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
    expect(calls).toHaveLength(0);
  });

  it('Content-Length 5000 -> 413', async () => {
    const { calls } = setup();
    const res = await post('{}', { 'Content-Length': '5000' });
    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it('5000-byte body without header -> 413', async () => {
    setup();
    const res = await post(JSON.stringify({ username: 'a', password: 'x'.repeat(5000) }));
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ message: 'The sign-in request is too large.' });
  });
});

describe('body parsing', () => {
  it('not json -> 400 Invalid sign-in request.', async () => {
    setup();
    const res = await post('not json');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalidrequest', message: 'Invalid sign-in request.' });
  });

  it.each(['[]', 'null', '"str"'])('%s -> 400 Enter a valid username and password.', async (b) => {
    setup();
    const res = await post(b);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ message: 'Enter a valid username and password.' });
  });
});

describe('validation', () => {
  it('trims and lowercases the username', async () => {
    const { calls } = setup();
    await login('  Player1 ', 'pw');
    expect(await calls[0].json()).toEqual({ p_username: 'player1' });
  });

  it.each(['bad name', 'a_b', '', 'a'.repeat(65)])('rejects username %j without fetching', async (u) => {
    const { calls } = setup();
    expect((await login(u, 'pw')).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('accepts a 64-char username', async () => {
    setup();
    expect((await login('a'.repeat(64), 'pw')).status).toBe(200);
  });

  it.each(['', 123])('rejects password %j', async (p) => {
    setup();
    expect((await login('player1', p)).status).toBe(400);
  });

  it('password byte limits', async () => {
    setup();
    expect((await login('player1', 'a'.repeat(1024))).status).toBe(200);
    expect((await login('player1', 'a'.repeat(1025))).status).toBe(400);
    expect((await login('player1', 'é'.repeat(513))).status).toBe(400); // 1026 bytes
  });
});

describe('sign-in', () => {
  it('unknown user -> 401 invalidcredentials', async () => {
    setup({ body: [] });
    const res = await login('player1', 'pw');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalidcredentials', message: 'The username or password is incorrect.' });
  });

  it('wrong password gives the identical response as unknown user', async () => {
    setup({ body: [] });
    const unknown = await login('player1', 'pw');
    vi.unstubAllGlobals();
    setup(undefined, { status: 400, body: { error: 'invalid_grant' } });
    const wrong = await login('player1', 'pw');
    expect(wrong.status).toBe(unknown.status);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it('lookup 500 -> 503 authunavailable', async () => {
    setup({ status: 500, body: {} });
    const res = await login('player1', 'pw');
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'authunavailable' });
  });

  it('token 500 -> 503 authunavailable', async () => {
    setup(undefined, { status: 500, body: {} });
    const res = await login('player1', 'pw');
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'authunavailable' });
  });

  it('happy path returns only the two tokens', async () => {
    const { calls } = setup();
    const res = await login('player1', 'pw');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: 'acc', refresh_token: 'ref' });
    expect(await calls[1].json()).toEqual({ email: 'p@x.co', password: 'pw' });
  });

  it('never logs the password', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setup({ status: 500, body: {} });
    await login('player1', 'sekret-pw');
    setup(undefined, { status: 500, body: {} });
    await login('player1', 'sekret-pw');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('sekret-pw');
  });
});
