DROP INDEX IF EXISTS public.accounts_player_name_unique;

CREATE UNIQUE INDEX accounts_player_name_unique
  ON public.economy_accounts (player_identity_id, lower(account_name))
  WHERE player_identity_id IS NOT NULL
    AND archived_at IS NULL;
