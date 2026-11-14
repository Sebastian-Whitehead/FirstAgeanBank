import { codePointLength, phpTrim } from './http';
import type { SupabaseRequestError } from './supabase';

export const STEAM_ID = /^[0-9]{17}$/;

export function parseAccountName(raw: string | null): string | null {
  if (raw === null) return null;
  const name = phpTrim(raw);
  const length = codePointLength(name);
  return length >= 1 && length <= 40 ? name : null;
}

export function parseAccountNumber(raw: string | null): string | null {
  if (raw === null) return null;
  const n = phpTrim(raw);
  return n !== '' && new TextEncoder().encode(n).length <= 128 ? n : null;
}

// Shared by create (step 10) and account-action (step 11). Create's RPC can't raise the
// extra codes, so sharing the wider mapper is safe.
export function mapAccountError(e: SupabaseRequestError): string {
  switch (e.supabaseMessage) {
    case 'invalid_account_name':
      return 'invalidaccountname';
    case 'account_name_taken':
      return 'accountnametaken';
    case 'account_balance_not_zero':
      return 'accountbalancenotzero';
    case 'last_player_account':
      return 'lastplayeraccount';
    case 'main_account_protected':
    case 'main_account_immutable':
      return 'mainaccountprotected';
    case 'account_not_found':
    case 'player_identity_unavailable':
      return 'accountnotfound';
  }
  return e.supabaseCode === '23505' && e.supabaseMessage.includes('accounts_player_name_unique')
    ? 'accountnametaken'
    : 'supabaseunavailable';
}
