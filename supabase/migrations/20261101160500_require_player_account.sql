CREATE OR REPLACE FUNCTION public.fab_delete_player_account(
  p_steam_id bigint,
  p_account_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_id bigint;
  v_player_count bigint;
  v_account_id bigint;
  v_account_name text;
  v_money bigint;
  v_player_account_count bigint;
BEGIN
  IF p_steam_id IS NULL OR p_account_number IS NULL OR btrim(p_account_number) = '' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_account';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_steam_id::text, 0));

  SELECT count(*), min(id)
    INTO v_player_count, v_player_id
    FROM public.identities_player
    WHERE steam_id = p_steam_id;

  IF v_player_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'player_identity_unavailable';
  END IF;

  SELECT id, account_name, money
    INTO v_account_id, v_account_name, v_money
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player'
      AND account_number = p_account_number
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_not_found';
  END IF;

  IF lower(btrim(v_account_name)) = 'main' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'main_account_protected';
  END IF;

  IF v_money <> 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_balance_not_zero';
  END IF;

  SELECT count(*)
    INTO v_player_account_count
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player';

  IF v_player_account_count <= 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'last_player_account';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.economy_transactions_entries
    WHERE account_id = v_account_id
  ) OR EXISTS (
    SELECT 1
    FROM public.economy_transactions
    WHERE actor_account_id = v_account_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_has_history';
  END IF;

  DELETE FROM public.economy_accounts
  WHERE id = v_account_id;

  RETURN jsonb_build_object('account_number', p_account_number, 'deleted', true);
END;
$$;
