import type { Env } from './env';

export class SupabaseRequestError extends Error {
  constructor(message: string, public supabaseCode = '', public supabaseMessage = '') {
    super(message);
  }
}

export type AuthUser = {
  id: string;
  email?: unknown;
  user_metadata?: Record<string, unknown>;
  identities?: unknown;
};
export type PlayerRow = { alias?: unknown; steam_id?: unknown; discord_id?: unknown };

const TIMEOUT_MS = 12000;

function baseUrl(env: Env, notConfigured = 'Supabase is not configured.'): string {
  const base = (env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new SupabaseRequestError(notConfigured);
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new SupabaseRequestError(notConfigured);
  }
  return base;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Network error or timeout becomes a SupabaseRequestError; only the error name is logged.
async function timedFetch(url: string, init: RequestInit, label: string, unavailable: string): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    console.error(`${label} request failed:`, error instanceof Error ? error.name : 'error');
    throw new SupabaseRequestError(unavailable);
  }
}

export async function supabaseRpc(env: Env, fn: string, params: Record<string, unknown>): Promise<unknown | null> {
  if (!/^[a-z][a-z0-9_]*$/.test(fn)) {
    throw new Error('Invalid Supabase RPC function name.');
  }
  const base = baseUrl(env);
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!key) throw new SupabaseRequestError('Supabase is not configured.');

  const res = await timedFetch(
    `${base}/rest/v1/rpc/${fn}`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(params)
    },
    `Supabase RPC ${fn}`,
    'Supabase is unavailable.'
  );

  const text = await res.text();
  let parsed: unknown = null;
  if (text !== '') {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new SupabaseRequestError('Supabase returned an invalid response.');
    }
  }

  if (res.status < 200 || res.status >= 300) {
    const body = isObject(parsed) ? parsed : {};
    const code = typeof body.code === 'string' ? body.code : '';
    const message = typeof body.message === 'string' ? body.message : 'request error';
    console.error(`Supabase RPC ${fn} failed with HTTP ${res.status} (${code}): ${message}`);
    throw new SupabaseRequestError('Supabase request failed.', code, message);
  }

  if (parsed === null) return null;
  if (!isObject(parsed)) throw new SupabaseRequestError('Supabase returned an unexpected response.');
  return parsed;
}

export async function supabaseAuthUser(env: Env, accessToken: string): Promise<AuthUser | null> {
  const base = baseUrl(env, 'Supabase Auth is not configured.');
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!key) throw new SupabaseRequestError('Supabase Auth is not configured.');

  const res = await timedFetch(
    `${base}/auth/v1/user`,
    { method: 'GET', headers: { apikey: key, Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    'Supabase Auth',
    'Supabase Auth is unavailable.'
  );
  if (res.status === 401 || res.status === 403) return null;
  if (res.status < 200 || res.status >= 300) {
    console.error(`Supabase Auth user lookup failed with HTTP ${res.status}.`);
    throw new SupabaseRequestError('Supabase Auth request failed.');
  }

  let user: unknown;
  try {
    user = JSON.parse(await res.text());
  } catch {
    throw new SupabaseRequestError('Supabase Auth returned an invalid response.');
  }
  if (!isObject(user) || typeof user.id !== 'string') {
    throw new SupabaseRequestError('Supabase Auth returned an unexpected response.');
  }
  return user as AuthUser;
}

export async function supabaseFindPlayersByDiscordId(env: Env, discordId: string): Promise<PlayerRow[]> {
  const base = baseUrl(env);
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!key) throw new SupabaseRequestError('Supabase is not configured.');

  // ::text casts: steam_id/discord_id are int8 and exceed 2^53, so JSON numbers would be rounded.
  const query = new URLSearchParams({
    discord_id: `eq.${discordId}`,
    select: 'alias,steam_id::text,discord_id::text',
    limit: '2'
  });
  const res = await timedFetch(
    `${base}/rest/v1/identities_player?${query}`,
    { method: 'GET', headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } },
    'Supabase identity lookup',
    'Supabase is unavailable.'
  );
  if (res.status < 200 || res.status >= 300) {
    console.error(`Supabase identity lookup failed with HTTP ${res.status}.`);
    throw new SupabaseRequestError('Supabase identity lookup failed.');
  }

  let players: unknown;
  try {
    players = JSON.parse(await res.text());
  } catch {
    throw new SupabaseRequestError('Supabase returned an invalid identity response.');
  }
  if (!Array.isArray(players)) {
    throw new SupabaseRequestError('Supabase returned an unexpected identity response.');
  }
  return players as PlayerRow[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getAuthEmailForUsername(env: Env, username: string): Promise<string | null> {
  const result = await supabaseRpc(env, 'fab_get_auth_email_for_username', { p_username: username });
  if (!Array.isArray(result) || result.length > 1) {
    throw new SupabaseRequestError('Supabase returned an unexpected username lookup response.');
  }
  if (result.length === 0) return null;
  const email = isObject(result[0]) ? result[0].email : null;
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    throw new SupabaseRequestError('Supabase returned an invalid username lookup response.');
  }
  return email;
}

export async function registerAuthUsername(env: Env, username: string, email: string): Promise<boolean> {
  const result = await supabaseRpc(env, 'fab_register_auth_username', {
    p_username: username,
    p_email: email.toLowerCase()
  });
  if (!Array.isArray(result) || result.length !== 1) {
    throw new SupabaseRequestError('Supabase returned an unexpected username registration response.');
  }
  const success = isObject(result[0]) ? result[0].success : null;
  if (typeof success !== 'boolean') {
    throw new SupabaseRequestError('Supabase returned an invalid username registration response.');
  }
  return success;
}

export async function passwordSignIn(
  env: Env,
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const base = baseUrl(env, 'Supabase Auth is not configured.');
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!key) throw new SupabaseRequestError('Supabase Auth is not configured.');

  const res = await timedFetch(
    `${base}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password })
    },
    'Supabase password sign-in',
    'Supabase Auth is unavailable.'
  );
  if (res.status === 400 || res.status === 401) return null;
  if (res.status < 200 || res.status >= 300) {
    console.error(`Supabase password sign-in failed with HTTP ${res.status}.`);
    throw new SupabaseRequestError('Supabase Auth request failed.');
  }

  let session: unknown;
  try {
    session = JSON.parse(await res.text());
  } catch {
    throw new SupabaseRequestError('Supabase Auth returned an invalid response.');
  }
  if (!isObject(session) || typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string') {
    throw new SupabaseRequestError('Supabase Auth returned an unexpected response.');
  }
  return { access_token: session.access_token, refresh_token: session.refresh_token };
}
