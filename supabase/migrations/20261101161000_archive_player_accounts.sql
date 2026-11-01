ALTER TABLE public.economy_accounts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE OR REPLACE FUNCTION public.fab_get_active_player_accounts(p_steam_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_id bigint;
  v_player_count bigint;
  v_accounts jsonb;
BEGIN
  SELECT count(*), min(id)
    INTO v_player_count, v_player_id
    FROM public.identities_player
    WHERE steam_id = p_steam_id;

  IF v_player_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'player_identity_unavailable';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'account_number', account_number,
        'account_name', account_name,
        'account_type', account_type::text,
        'money', money
      )
      ORDER BY account_name, account_number
    ),
    '[]'::jsonb
  )
  INTO v_accounts
  FROM public.economy_accounts
  WHERE player_identity_id = v_player_id
    AND account_type = 'player'
    AND archived_at IS NULL;

  RETURN jsonb_build_object('accounts', v_accounts);
END;
$$;

CREATE OR REPLACE FUNCTION public.fab_create_player_account(
  p_steam_id bigint,
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
  v_account_name text;
BEGIN
  v_account_name := btrim(COALESCE(p_account_name, ''));
  IF p_steam_id IS NULL OR v_account_name = '' OR length(v_account_name) > 40 THEN
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

  IF EXISTS (
    SELECT 1
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player'
      AND archived_at IS NULL
      AND lower(account_name) = lower(v_account_name)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_name_taken';
  END IF;

  INSERT INTO public.economy_accounts (
    account_type,
    account_number,
    account_name,
    player_identity_id,
    money
  )
  VALUES (
    'player',
    public.generate_unique_account_number(),
    v_account_name,
    v_player_id,
    0
  )
  RETURNING id INTO v_account_id;

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
      AND archived_at IS NULL
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
      AND archived_at IS NULL
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
  v_active_account_count bigint;
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
      AND archived_at IS NULL
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
    INTO v_active_account_count
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player'
      AND archived_at IS NULL;

  IF v_active_account_count <= 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'last_player_account';
  END IF;

  UPDATE public.economy_accounts
  SET archived_at = now(), updated_at = now()
  WHERE id = v_account_id;

  RETURN jsonb_build_object('account_number', p_account_number, 'archived', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fab_prevent_archived_account_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_archived_at timestamptz;
BEGIN
  SELECT archived_at
    INTO v_archived_at
    FROM public.economy_accounts
    WHERE id = NEW.account_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_not_found';
  END IF;

  IF v_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_archived';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fab_prevent_archived_account_ledger_entry
  ON public.economy_transactions_entries;
CREATE TRIGGER fab_prevent_archived_account_ledger_entry
  BEFORE INSERT OR UPDATE OF account_id
  ON public.economy_transactions_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.fab_prevent_archived_account_ledger_entry();

REVOKE ALL ON FUNCTION public.fab_get_active_player_accounts(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fab_prevent_archived_account_ledger_entry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fab_get_active_player_accounts(bigint) TO service_role;
