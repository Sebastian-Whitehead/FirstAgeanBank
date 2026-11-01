-- Applied to the shared Supabase project as migration 20261101145426.
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

REVOKE ALL ON FUNCTION public.fab_create_player_account(bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fab_create_player_account(bigint, text) TO service_role;
