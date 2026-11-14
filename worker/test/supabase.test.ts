import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { supabaseAuthUser, supabaseFindPlayersByDiscordId, supabaseRpc, SupabaseRequestError } from '../src/supabase';
import { mockSupabase, testEnv } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const RPC = '/rest/v1/rpc/fab_x';

describe('supabaseRpc', () => {
  it('rejects bad function names before fetching', async () => {
    const { calls } = mockSupabase({});
    for (const fn of ['Fab', 'a-b', '']) {
      await expect(supabaseRpc(testEnv, fn, {})).rejects.toThrow('Invalid Supabase RPC function name.');
    }
    expect(calls).toHaveLength(0);
  });

  it('rejects bad configuration', async () => {
    mockSupabase({});
    const bad: Partial<Env>[] = [
      { SUPABASE_URL: '' },
      { SUPABASE_URL: 'ftp://x.test' },
      { SUPABASE_URL: 'http://example.com' },
      { SUPABASE_SERVICE_ROLE_KEY: '' }
    ];
    for (const override of bad) {
      await expect(supabaseRpc({ ...testEnv, ...override }, 'fab_x', {})).rejects.toThrow('not configured');
    }
  });

  it('accepts local http URLs', async () => {
    mockSupabase({ [RPC]: { body: [] } });
    for (const url of ['http://localhost:54321', 'http://127.0.0.1']) {
      await expect(supabaseRpc({ ...testEnv, SUPABASE_URL: url }, 'fab_x', {})).resolves.toEqual([]);
    }
  });

  it('sends URL, method, service-key headers and JSON body', async () => {
    const { calls } = mockSupabase({ [RPC]: { body: [] } });
    await supabaseRpc({ ...testEnv, SUPABASE_URL: 'https://test.supabase.co/' }, 'fab_x', { p_a: 1 });
    const req = calls[0];
    expect(req.url).toBe('https://test.supabase.co/rest/v1/rpc/fab_x');
    expect(req.method).toBe('POST');
    expect(req.headers.get('apikey')).toBe('service-key');
    expect(req.headers.get('Authorization')).toBe('Bearer service-key');
    expect(req.headers.get('Content-Type')).toBe('application/json');
    expect(await req.json()).toEqual({ p_a: 1 });
  });

  it('returns arrays and null', async () => {
    mockSupabase({ [RPC]: { body: [{ a: 1 }] } });
    await expect(supabaseRpc(testEnv, 'fab_x', {})).resolves.toEqual([{ a: 1 }]);
    mockSupabase({ [RPC]: { status: 204 } });
    await expect(supabaseRpc(testEnv, 'fab_x', {})).resolves.toBeNull();
  });

  it('rejects scalar JSON', async () => {
    mockSupabase({ [RPC]: { raw: '"text"' } });
    await expect(supabaseRpc(testEnv, 'fab_x', {})).rejects.toThrow('unexpected response');
  });

  it('surfaces Supabase error code and message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase({ [RPC]: { status: 400, body: { code: 'P0004', message: 'insufficient' } } });
    const error = (await supabaseRpc(testEnv, 'fab_x', {}).catch((e) => e)) as SupabaseRequestError;
    expect(error).toBeInstanceOf(SupabaseRequestError);
    expect(error.supabaseCode).toBe('P0004');
    expect(error.supabaseMessage).toBe('insufficient');
  });

  it('rejects non-JSON bodies', async () => {
    mockSupabase({ [RPC]: { status: 500, raw: '<html>' } });
    await expect(supabaseRpc(testEnv, 'fab_x', {})).rejects.toThrow('invalid response');
  });

  it('maps network failure to unavailable', async () => {
    mockSupabase({ [RPC]: { throws: true } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(supabaseRpc(testEnv, 'fab_x', {})).rejects.toThrow('Supabase is unavailable.');
  });
});

describe('supabaseAuthUser', () => {
  const P = '/auth/v1/user';

  it('sends publishable key and user token', async () => {
    const { calls } = mockSupabase({ [P]: { body: { id: 'u1' } } });
    await supabaseAuthUser(testEnv, 'user-token');
    expect(calls[0].headers.get('apikey')).toBe('pub-key');
    expect(calls[0].headers.get('Authorization')).toBe('Bearer user-token');
  });

  it('returns null for 401 and 403', async () => {
    for (const status of [401, 403]) {
      mockSupabase({ [P]: { status } });
      await expect(supabaseAuthUser(testEnv, 't')).resolves.toBeNull();
    }
  });

  it('throws on 500 and on a missing id, returns the user otherwise', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase({ [P]: { status: 500 } });
    await expect(supabaseAuthUser(testEnv, 't')).rejects.toThrow(SupabaseRequestError);
    mockSupabase({ [P]: { body: {} } });
    await expect(supabaseAuthUser(testEnv, 't')).rejects.toThrow('unexpected response');
    mockSupabase({ [P]: { body: { id: 'u1' } } });
    await expect(supabaseAuthUser(testEnv, 't')).resolves.toEqual({ id: 'u1' });
  });
});

describe('supabaseFindPlayersByDiscordId', () => {
  const P = '/rest/v1/identities_player';

  it('builds the query with int8 text casts', async () => {
    const { calls } = mockSupabase({ [P]: { body: [] } });
    await supabaseFindPlayersByDiscordId(testEnv, '123');
    const q = new URL(calls[0].url).searchParams;
    expect(q.get('discord_id')).toBe('eq.123');
    expect(q.get('select')).toBe('alias,steam_id::text,discord_id::text');
    expect(q.get('limit')).toBe('2');
  });

  it('keeps big ids as exact strings', async () => {
    mockSupabase({ [P]: { raw: '[{"steam_id":"76561198000000001","discord_id":"123456789012345678"}]' } });
    await expect(supabaseFindPlayersByDiscordId(testEnv, '123456789012345678')).resolves.toEqual([
      { steam_id: '76561198000000001', discord_id: '123456789012345678' }
    ]);
  });

  it('handles empty, non-array and error responses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase({ [P]: { body: [] } });
    await expect(supabaseFindPlayersByDiscordId(testEnv, '1')).resolves.toEqual([]);
    mockSupabase({ [P]: { body: {} } });
    await expect(supabaseFindPlayersByDiscordId(testEnv, '1')).rejects.toThrow('unexpected identity response');
    mockSupabase({ [P]: { status: 500 } });
    await expect(supabaseFindPlayersByDiscordId(testEnv, '1')).rejects.toThrow('identity lookup failed');
  });
});

describe('logging', () => {
  it('never logs the service key or access token', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase({
      [RPC]: { status: 400, body: { code: 'X', message: 'm' } },
      '/auth/v1/user': { status: 500 },
      '/rest/v1/identities_player': { status: 500 }
    });
    await supabaseRpc(testEnv, 'fab_x', {}).catch(() => {});
    await supabaseAuthUser(testEnv, 'secret-token').catch(() => {});
    await supabaseFindPlayersByDiscordId(testEnv, '1').catch(() => {});
    mockSupabase({ [RPC]: { throws: true } });
    await supabaseRpc(testEnv, 'fab_x', {}).catch(() => {});
    expect(spy).toHaveBeenCalled();
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain('service-key');
    expect(logged).not.toContain('secret-token');
  });
});
