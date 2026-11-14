import { requirePlayer } from '../auth';
import type { Env } from '../env';
import { formResult, formString, methodNotAllowed, readForm } from '../http';
import { supabaseRpc, SupabaseRequestError } from '../supabase';
import { mapAccountError, parseAccountName, STEAM_ID } from '../validation';

const fail = (code: string) => formResult(`/accounts/?error=${code}`, code);

export async function handleCreateAccount(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed('POST', 'Use POST to create an account.');

  const player = await requirePlayer(request, env);
  if (player instanceof Response) return player;
  if (!STEAM_ID.test(player.steamId)) return fail('steamidrequired');

  const form = (await readForm(request)) ?? new FormData();
  const name = parseAccountName(formString(form, 'accountName'));
  if (name === null) return fail('invalidaccountname');

  try {
    await supabaseRpc(env, 'fab_create_player_account', { p_steam_id: player.steamId, p_account_name: name });
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    return fail(mapAccountError(error));
  }
  return formResult('/accounts/?account=created');
}
