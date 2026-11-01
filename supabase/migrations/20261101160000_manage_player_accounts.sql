CREATE OR REPLACE FUNCTION public.fab_rename_player_account(
  p_steam_id bigint,
  p_account_number text,
  p_account_name text
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
  v_current_name text;
  v_new_name text;
BEGIN
  v_new_name := btrim(COALESCE(p_account_name, ''));
  IF p_steam_id IS NULL OR v_new_name = '' OR length(v_new_name) > 40 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_account_name';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_steam_id::text, 0));

  SELECT count(*), min(id)
    INTO v_player_count, v_player_id
    FROM public.identities_player
    WHERE steam_id = p_steam_id;

  IF v_player_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'player_identity_unavailable';
  END IF;

  SELECT id, account_name
    INTO v_account_id, v_current_name
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player'
      AND account_number = p_account_number
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_not_found';
  END IF;

  IF lower(btrim(v_current_name)) = 'main' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'main_account_protected';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player'
      AND id <> v_account_id
      AND lower(account_name) = lower(v_new_name)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_name_taken';
  END IF;

  UPDATE public.economy_accounts
  SET account_name = v_new_name, updated_at = now()
  WHERE id = v_account_id;

  RETURN (
    SELECT jsonb_build_object(
      'account_number', account_number,
      'account_name', account_name,
      'account_type', account_type::text,
      'money', money
    )
    FROM public.economy_accounts
    WHERE id = v_account_id
  );
END;
$$;

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

REVOKE ALL ON FUNCTION public.fab_rename_player_account(bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fab_delete_player_account(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fab_rename_player_account(bigint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fab_delete_player_account(bigint, text) TO service_role;
