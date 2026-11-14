import type { Env } from './env';
import { errorResponse } from './http';
import { supabaseAuthUser, supabaseFindPlayersByDiscordId, SupabaseRequestError } from './supabase';

export type AuthErrorCode =
  | 'loggedout'
  | 'supabaseunavailable'
  | 'discordrequired'
  | 'identitynotfound'
  | 'identityambiguous'
  | 'identityunavailable';

export class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode
  ) {
    super(message);
  }
}

export interface Player {
  username: string;
  email: string;
  firstname: string;
  steamId: string;
  discordId: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value);
}

export async function currentAuthenticatedPlayer(request: Request, env: Env): Promise<Player> {
  const match = /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(request.headers.get('Authorization') ?? '');
  if (!match) throw new AuthError('Sign in is required.', 'loggedout');

  let authUser;
  try {
    authUser = await supabaseAuthUser(env, match[1]);
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    throw new AuthError('The authentication service is unavailable.', 'supabaseunavailable');
  }
  if (authUser === null) throw new AuthError('The session is invalid or expired.', 'loggedout');

  let email = isEmail(authUser.email) ? authUser.email : null;
  const metaUsername = authUser.user_metadata?.username;
  let username = typeof metaUsername === 'string' && /^[a-z0-9]{1,64}$/.test(metaUsername) ? metaUsername : null;

  const identities = authUser.identities ?? [];
  if (!Array.isArray(identities)) throw new AuthError('Discord verification is required.', 'discordrequired');

  let discordId: string | null = null;
  let identityData: Record<string, unknown> = {};
  for (const identity of identities) {
    if (!isPlainObject(identity) || identity.provider !== 'discord' || !isPlainObject(identity.identity_data)) continue;
    const data = identity.identity_data;
    const candidate = data.sub ?? data.id;
    if (typeof candidate === 'string' || (typeof candidate === 'number' && Number.isSafeInteger(candidate))) {
      discordId = String(candidate);
      identityData = data;
      break;
    }
  }
  if (discordId === null || !/^[0-9]{17,19}$/.test(discordId)) {
    throw new AuthError('Discord verification is required.', 'discordrequired');
  }
  if (email === null) email = isEmail(identityData.email) ? identityData.email : '';
  if (username === null) username = `discord-${discordId}`;

  let players;
  try {
    players = await supabaseFindPlayersByDiscordId(env, discordId);
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    throw new AuthError('The shared identity service is unavailable.', 'supabaseunavailable');
  }
  if (players.length === 0) {
    throw new AuthError('No existing player identity is linked to this Discord account.', 'identitynotfound');
  }
  if (players.length !== 1) {
    console.error('Discord ID matched multiple Supabase player identities.');
    throw new AuthError('The player identity lookup was ambiguous.', 'identityambiguous');
  }

  const row = players[0];
  const steamId = typeof row.steam_id === 'string' ? row.steam_id : '';
  const stored = typeof row.discord_id === 'string' ? row.discord_id : '';
  if (!/^[0-9]{17}$/.test(steamId) || stored !== discordId) {
    throw new AuthError('The existing player identity is incomplete.', 'identityunavailable');
  }

  const firstname =
    typeof row.alias === 'string' && row.alias !== ''
      ? row.alias
      : typeof identityData.global_name === 'string'
        ? identityData.global_name
        : typeof identityData.username === 'string'
          ? identityData.username
          : username;

  return { username, email, firstname, steamId, discordId };
}

export async function requirePlayer(request: Request, env: Env): Promise<Player | Response> {
  try {
    return await currentAuthenticatedPlayer(request, env);
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    const status =
      error.code === 'loggedout' ? 401 : error.code === 'identitynotfound' || error.code === 'discordrequired' ? 403 : 503;
    return errorResponse(status, error.code, error.message);
  }
}
