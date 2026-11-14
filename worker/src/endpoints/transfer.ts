import { requirePlayer } from '../auth';
import type { Env } from '../env';
import { formResult, formString, methodNotAllowed, phpTrim, readForm } from '../http';
import { parseTransferAmount } from '../money';
import { supabaseRpc, SupabaseRequestError } from '../supabase';
import { parseAccountNumber, STEAM_ID } from '../validation';

const fail = (code: string) => formResult(`/transfer/?error=${code}`, code);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function handleTransfer(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed('POST', 'Use POST to transfer.');

  const player = await requirePlayer(request, env);
  if (player instanceof Response) return player;
  if (!STEAM_ID.test(player.steamId)) return fail('steamidrequired');

  const form = (await readForm(request)) ?? new FormData();
  const source = parseAccountNumber(formString(form, 'sourceAccountNumber'));
  if (source === null) return fail('invalidaccountnumber');
  const dest = parseAccountNumber(formString(form, 'destinationAccountNumber'));
  if (dest === null) return fail('invalidaccountnumber');
  const amount = parseTransferAmount(formString(form, 'amount'));
  if (!amount.ok) return fail(amount.error);
  const rawKey = formString(form, 'idempotencyKey');
  const key = rawKey === null ? '' : phpTrim(rawKey).toLowerCase();
  if (!UUID.test(key)) return fail('transferfailed');

  try {
    await supabaseRpc(env, 'fab_transfer', {
      p_sender_steam_id: player.steamId,
      p_sender_account_number: source,
      p_recipient_account_number: dest,
      p_amount: amount.cents,
      p_idempotency_key: key
    });
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) {
      console.error('Transfer failed:', error instanceof Error ? error.message : 'unknown');
      return fail('transferfailed');
    }
    if (error.supabaseMessage === 'account_archived') return fail('accountarchived');
    const code =
      { P0002: 'recipientnotfound', P0003: 'invalidaccounts', P0004: 'insufficientfunds' }[error.supabaseCode] ??
      'transferfailed';
    return fail(code);
  }
  return formResult('/accounts/?transfer=success');
}
