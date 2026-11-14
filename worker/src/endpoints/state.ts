import { requirePlayer } from '../auth';
import type { Env } from '../env';
import { errorResponse, jsonResponse, methodNotAllowed } from '../http';
import { supabaseRpc, SupabaseRequestError } from '../supabase';

const UNAVAILABLE = 'Unable to load account state.';

// Differs from PHP (which accepts any method): GET only, 405 otherwise.
export async function handleState(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return methodNotAllowed('GET', 'Use GET to load account state.');

  const player = await requirePlayer(request, env);
  if (player instanceof Response) return player;

  let result: unknown;
  try {
    result = await supabaseRpc(env, 'fab_get_player_account', { p_steam_id: player.steamId, p_limit: 15 });
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    return errorResponse(503, 'supabaseunavailable', UNAVAILABLE);
  }
  if (result === null) return errorResponse(503, 'identityunavailable', UNAVAILABLE);

  const data = result as Record<string, unknown>;
  const accounts = data.accounts ?? [];
  if (!Array.isArray(accounts)) return errorResponse(503, 'supabaseunavailable', UNAVAILABLE);

  return jsonResponse({
    authenticated: true,
    user: {
      username: player.username,
      firstname: player.firstname,
      lastname: '',
      accounts: accounts.map((account: Record<string, unknown>) => ({
        accountNumber: account.account_number,
        name: account.account_name ?? '',
        type: account.account_type,
        balance: Math.trunc(Number(account.money)) / 100
      })),
      steamId: player.steamId,
      discordId: player.discordId
    },
    activities: data.activities ?? []
  });
}
