CREATE OR REPLACE FUNCTION public.fab_get_player_account(
  p_steam_id bigint,
  p_limit integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_id bigint;
  v_player_count bigint;
  v_account_count bigint;
  v_accounts jsonb;
  v_activities jsonb;
BEGIN
  SELECT count(*), min(id)
    INTO v_player_count, v_player_id
    FROM public.identities_player
    WHERE steam_id = p_steam_id;

  IF v_player_count = 0 THEN
    RETURN NULL;
  ELSIF v_player_count > 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_player_identity';
  END IF;

  SELECT count(*)
    INTO v_account_count
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player'
      AND archived_at IS NULL;

  IF v_account_count = 0 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'account_number', account_number,
      'account_name', account_name,
      'account_type', account_type::text,
      'money', money
    )
    ORDER BY account_name, account_number
  )
  INTO v_accounts
  FROM public.economy_accounts
  WHERE player_identity_id = v_player_id
    AND account_type = 'player'
    AND archived_at IS NULL;

  SELECT COALESCE(jsonb_agg(recent.activity ORDER BY recent.created_at DESC), '[]'::jsonb)
  INTO v_activities
  FROM (
    SELECT
      jsonb_build_object(
        'account_number', own_account.account_number,
        'account_name', own_account.account_name,
        'created_at', tx.created_at,
        'description', CASE
          WHEN tx.transaction_type = 'transfer' AND entry.money_delta < 0
            THEN 'Transfer to account ' || COALESCE(counterpart.account_number, '')
          WHEN tx.transaction_type = 'transfer'
            THEN 'Transfer from account ' || COALESCE(counterpart.account_number, '')
          ELSE COALESCE(tx.description, tx.transaction_type)
        END,
        'amount', abs(entry.money_delta)::numeric / 100,
        'is_positive', entry.money_delta > 0
      ) AS activity,
      tx.created_at
    FROM public.economy_transactions_entries AS entry
    JOIN public.economy_accounts AS own_account ON own_account.id = entry.account_id
    JOIN public.economy_transactions AS tx ON tx.id = entry.transaction_id
    LEFT JOIN LATERAL (
      SELECT other_account.account_number
      FROM public.economy_transactions_entries AS other_entry
      JOIN public.economy_accounts AS other_account ON other_account.id = other_entry.account_id
      WHERE other_entry.transaction_id = tx.id
        AND other_entry.account_id <> entry.account_id
      LIMIT 1
    ) AS counterpart ON true
    WHERE own_account.player_identity_id = v_player_id
      AND own_account.account_type = 'player'
    ORDER BY tx.created_at DESC
    LIMIT greatest(1, least(COALESCE(p_limit, 15), 50))
  ) AS recent;

  RETURN jsonb_build_object(
    'accounts', v_accounts,
    'activities', v_activities
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fab_get_player_account(bigint, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fab_get_player_account(bigint, integer) TO service_role;
