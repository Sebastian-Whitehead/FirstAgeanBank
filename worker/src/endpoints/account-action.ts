import { requirePlayer } from '../auth';
import type { Env } from '../env';
import { formResult, formString, methodNotAllowed, readForm } from '../http';
import { supabaseRpc, SupabaseRequestError } from '../supabase';
import { mapAccountError, parseAccountName, parseAccountNumber, STEAM_ID } from '../validation';

const fail = (code: string) => formResult(`/accounts/?error=${code}`, code);

export async function handleAccountAction(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed('POST', 'Use POST to manage an account.');

  const player = await requirePlayer(request, env);
  if (player instanceof Response) return player;
  if (!STEAM_ID.test(player.steamId)) return fail('steamidrequired');

  const form = (await readForm(request)) ?? new FormData();
  const action = formString(form, 'action') ?? '';
  const accountNumber = parseAccountNumber(formString(form, 'accountNumber'));
  if (accountNumber === null) return fail('invalidaccountnumber');

  try {
    if (action === 'rename') {
      const name = parseAccountName(formString(form, 'accountName'));
      if (name === null) return fail('invalidaccountname');
      await supabaseRpc(env, 'fab_rename_player_account', {
        p_steam_id: player.steamId,
        p_account_number: accountNumber,
        p_account_name: name
      });
    } else if (action === 'delete') {
      await supabaseRpc(env, 'fab_delete_player_account', {
        p_steam_id: player.steamId,
        p_account_number: accountNumber
      });
    } else {
      return fail('invalidaccountaction');
    }
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    return fail(mapAccountError(error));
  }
  return formResult(`/accounts/?account=${action}d`);
}
