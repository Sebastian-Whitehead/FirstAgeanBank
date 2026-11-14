import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentAuthenticatedPlayer, requirePlayer } from '../src/auth';
import { mockSupabase, testEnv, type Route } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const DID = '123456789012345678';
const USER = '/auth/v1/user';
const IDENT = '/rest/v1/identities_player';

function discord(data: Record<string, unknown> = {}) {
  return { provider: 'discord', identity_data: { sub: DID, global_name: 'Glob', ...data } };
}
function authUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'p@x.co',
    user_metadata: { username: 'player1' },
    identities: [discord()],
    ...overrides
  };
}
function playerRow(overrides: Record<string, unknown> = {}) {
  return { steam_id: '76561198000000001', discord_id: DID, alias: 'Alias', ...overrides };
}

function req(authorization: string | null = 'Bearer tok', url = 'https://x.test/api/state', init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (authorization !== null) headers.set('Authorization', authorization);
  return new Request(url, { ...init, headers });
}

function setup(user: Route = { body: authUser() }, rows: Route = { body: [playerRow()] }) {
  return mockSupabase({ [USER]: user, [IDENT]: rows });
}

async function expectError(request: Request, status: number, code: string) {
  const res = await requirePlayer(request, testEnv);
  expect(res).toBeInstanceOf(Response);
  expect((res as Response).status).toBe(status);
  expect(await (res as Response).json()).toMatchObject({ error: code });
}

describe('header handling', () => {
  it('rejects a missing header without fetching', async () => {
    const { calls } = setup();
    await expectError(req(null), 401, 'loggedout');
    expect(calls).toHaveLength(0);
  });

  it.each(['Basic abc', 'Bearer ', 'Bearer a b'])('rejects %j', async (h) => {
    setup();
    await expectError(req(h), 401, 'loggedout');
  });

  it('accepts a case-insensitive scheme', async () => {
    setup();
    const res = await requirePlayer(req('bearer tok.en-1_~'), testEnv);
    expect(res).not.toBeInstanceOf(Response);
  });
});

describe('auth user', () => {
  it('401 from Supabase -> loggedout', async () => {
    setup({ status: 401, body: {} });
    await expectError(req(), 401, 'loggedout');
  });
  it('500 -> supabaseunavailable', async () => {
    setup({ status: 500, body: {} });
    await expectError(req(), 503, 'supabaseunavailable');
  });
  it('network throw -> supabaseunavailable', async () => {
    setup({ throws: true });
    await expectError(req(), 503, 'supabaseunavailable');
  });
});

describe('discord identity', () => {
  it.each([
    ['non-array identities', authUser({ identities: 'x' })],
    ['empty identities', authUser({ identities: [] })],
    ['email provider only', authUser({ identities: [{ provider: 'email', identity_data: { sub: DID } }] })],
    ['short sub', authUser({ identities: [discord({ sub: '123' })] })],
    ['20-digit sub', authUser({ identities: [discord({ sub: '12345678901234567890' })] })],
    ['unsafe numeric sub', authUser({ identities: [discord({ sub: 123456789012345678 })] })]
  ])('%s -> discordrequired', async (_n, user) => {
    setup({ body: user });
    await expectError(req(), 403, 'discordrequired');
  });

  it('falls back to string id when sub is missing', async () => {
    setup({ body: authUser({ identities: [{ provider: 'discord', identity_data: { id: DID } }] }) });
    const p = await currentAuthenticatedPlayer(req(), testEnv);
    expect(p.discordId).toBe(DID);
  });

  it('number steam_id in lookup -> identityunavailable', async () => {
    setup(undefined, { body: [playerRow({ steam_id: 76561198000000001 })] });
    await expectError(req(), 503, 'identityunavailable');
  });

  it('uses the first valid Discord identity', async () => {
    const other = '223456789012345678';
    const { calls } = setup({ body: authUser({ identities: [discord(), discord({ sub: other })] }) });
    await currentAuthenticatedPlayer(req(), testEnv);
    expect(new URL(calls[1].url).searchParams.get('discord_id')).toBe(`eq.${DID}`);
  });
});

describe('fallbacks', () => {
  it('invalid metadata username -> discord-<id>', async () => {
    setup({ body: authUser({ user_metadata: { username: 'Bad Name' } }) });
    expect((await currentAuthenticatedPlayer(req(), testEnv)).username).toBe(`discord-${DID}`);
  });
  it('missing email uses identity email', async () => {
    setup({ body: authUser({ email: undefined, identities: [discord({ email: 'd@x.co' })] }) });
    expect((await currentAuthenticatedPlayer(req(), testEnv)).email).toBe('d@x.co');
  });
  it('missing email and no identity email -> empty string', async () => {
    setup({ body: authUser({ email: undefined }) });
    expect((await currentAuthenticatedPlayer(req(), testEnv)).email).toBe('');
  });
});

describe('player lookup', () => {
  it('no rows -> identitynotfound', async () => {
    setup(undefined, { body: [] });
    await expectError(req(), 403, 'identitynotfound');
  });
  it('two rows -> identityambiguous', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setup(undefined, { body: [playerRow(), playerRow()] });
    await expectError(req(), 503, 'identityambiguous');
  });
  it('lookup 500 -> supabaseunavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setup(undefined, { status: 500, body: {} });
    await expectError(req(), 503, 'supabaseunavailable');
  });
  it.each([
    ['short steam_id', { steam_id: '123' }],
    ['mismatched discord_id', { discord_id: '223456789012345678' }],
    ['null steam_id', { steam_id: null }]
  ])('%s -> identityunavailable', async (_n, override) => {
    setup(undefined, { body: [playerRow(override)] });
    await expectError(req(), 503, 'identityunavailable');
  });
});

describe('firstname', () => {
  it.each([
    ['alias', {}, authUser(), 'Alias'],
    ['global_name when alias empty', { alias: '' }, authUser(), 'Glob'],
    [
      'identity username',
      { alias: null },
      authUser({ identities: [{ provider: 'discord', identity_data: { sub: DID, username: 'du' } }] }),
      'du'
    ],
    [
      'username fallback',
      { alias: null },
      authUser({ identities: [{ provider: 'discord', identity_data: { sub: DID } }] }),
      'player1'
    ]
  ])('%s', async (_n, rowOverride, user, expected) => {
    setup({ body: user }, { body: [playerRow(rowOverride)] });
    expect((await currentAuthenticatedPlayer(req(), testEnv)).firstname).toBe(expected);
  });
});

describe('trust boundary', () => {
  it('ignores steam ids in query, headers and form', async () => {
    setup();
    const request = req('Bearer tok', 'https://x.test/api/state?steamId=76561198999999999', {
      method: 'POST',
      headers: { 'X-Steam-Id': '76561198999999999', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'steamId=76561198999999999&steam_id=76561198999999999'
    });
    expect((await currentAuthenticatedPlayer(request, testEnv)).steamId).toBe('76561198000000001');
  });
});
