-- Applied to the shared Supabase project as migration 20261101144736.
CREATE OR REPLACE FUNCTION public.fab_ensure_player_account(
  p_alias text,
  p_steam_id bigint,
  p_discord_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_id bigint;
  player_count bigint;
  v_accounts jsonb;
  account_count bigint;
BEGIN
  IF p_steam_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_steam_id';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_steam_id::text, 0));

  SELECT count(*), min(id)
    INTO player_count, v_player_id
    FROM public.identities_player
    WHERE steam_id = p_steam_id;

  IF player_count > 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_player_identity';
  ELSIF player_count = 0 THEN
    INSERT INTO public.identities_player (alias, steam_id, discord_id)
    VALUES (nullif(p_alias, ''), p_steam_id, p_discord_id)
    RETURNING id INTO v_player_id;
  END IF;

  SELECT count(*)
    INTO account_count
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player';

  IF account_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'player_account_unavailable';
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
    AND account_type = 'player';

  RETURN jsonb_build_object('accounts', v_accounts);
END;
$$;

CREATE OR REPLACE FUNCTION public.fab_update_player_identity(
  p_old_steam_id bigint,
  p_new_steam_id bigint,
  p_discord_id bigint,
  p_alias text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_id bigint;
  old_player_count bigint;
  new_player_count bigint;
BEGIN
  IF p_new_steam_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_steam_id';
  END IF;

  IF p_old_steam_id IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_new_steam_id::text, 0));
    SELECT count(*)
      INTO new_player_count
      FROM public.identities_player
      WHERE steam_id = p_new_steam_id;
    IF new_player_count > 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'steam_id_already_linked';
    END IF;
  ELSIF p_old_steam_id = p_new_steam_id THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_new_steam_id::text, 0));
    SELECT count(*), min(id)
      INTO new_player_count, v_player_id
      FROM public.identities_player
      WHERE steam_id = p_new_steam_id;
    IF new_player_count > 1 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_player_identity';
    ELSIF new_player_count = 1 THEN
      UPDATE public.identities_player
      SET discord_id = p_discord_id
      WHERE id = v_player_id;
    END IF;
  ELSE
    IF p_old_steam_id < p_new_steam_id THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_old_steam_id::text, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_new_steam_id::text, 0));
    ELSE
      PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_new_steam_id::text, 0));
      PERFORM pg_advisory_xact_lock(hashtextextended('fab-player:' || p_old_steam_id::text, 0));
    END IF;

    SELECT count(*), min(id)
      INTO old_player_count, v_player_id
      FROM public.identities_player
      WHERE steam_id = p_old_steam_id;

    SELECT count(*)
      INTO new_player_count
      FROM public.identities_player
      WHERE steam_id = p_new_steam_id;

    IF old_player_count > 1 OR new_player_count > 1 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_player_identity';
    ELSIF new_player_count = 1 AND (old_player_count = 0 OR NOT EXISTS (
      SELECT 1
      FROM public.identities_player
      WHERE steam_id = p_new_steam_id AND id = v_player_id
    )) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'steam_id_already_linked';
    ELSIF old_player_count = 1 THEN
      UPDATE public.identities_player
      SET steam_id = p_new_steam_id, discord_id = p_discord_id
      WHERE id = v_player_id;
    END IF;
  END IF;

  RETURN public.fab_ensure_player_account(p_alias, p_new_steam_id, p_discord_id);
END;
$$;

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
  player_count bigint;
  account_count bigint;
  v_accounts jsonb;
  v_activities jsonb;
BEGIN
  SELECT count(*), min(id)
    INTO player_count, v_player_id
    FROM public.identities_player
    WHERE steam_id = p_steam_id;

  IF player_count = 0 THEN
    RETURN NULL;
  ELSIF player_count > 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_player_identity';
  END IF;

  SELECT count(*)
    INTO account_count
    FROM public.economy_accounts
    WHERE player_identity_id = v_player_id
      AND account_type = 'player';

  IF account_count = 0 THEN
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
    AND account_type = 'player';

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

DROP FUNCTION IF EXISTS public.fab_transfer(bigint, text, bigint, text);

CREATE OR REPLACE FUNCTION public.fab_transfer(
  p_sender_steam_id bigint,
  p_sender_account_number text,
  p_recipient_account_number text,
  p_amount bigint,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  sender_player_id bigint;
  sender_player_count bigint;
  sender_account_id bigint;
  sender_account_count bigint;
  recipient_account_id bigint;
  recipient_account_count bigint;
  sender_money bigint;
  transfer_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 500000 OR
     p_idempotency_key IS NULL OR length(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transfer';
  END IF;

  SELECT count(*), min(id)
    INTO sender_player_count, sender_player_id
    FROM public.identities_player
    WHERE steam_id = p_sender_steam_id;

  IF sender_player_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'sender_account_unavailable';
  END IF;

  SELECT count(*), min(id)
    INTO sender_account_count, sender_account_id
    FROM public.economy_accounts
    WHERE player_identity_id = sender_player_id
      AND account_type = 'player'
      AND account_number = p_sender_account_number;

  IF sender_account_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'sender_account_unavailable';
  END IF;

  SELECT count(*), min(id)
    INTO recipient_account_count, recipient_account_id
    FROM public.economy_accounts
    WHERE account_number = p_recipient_account_number
    AND account_type = 'player';

  IF recipient_account_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'recipient_not_found';
  ELSIF recipient_account_count > 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_player_bank_account';
  END IF;

  IF sender_account_id = recipient_account_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0003', MESSAGE = 'own_account';
  END IF;

  PERFORM id
  FROM public.economy_accounts
  WHERE id IN (sender_account_id, recipient_account_id)
  ORDER BY id
  FOR UPDATE;

  SELECT id INTO transfer_id
  FROM public.economy_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF transfer_id IS NOT NULL THEN
    IF (SELECT count(*) FROM public.economy_transactions_entries WHERE transaction_id = transfer_id) = 2
       AND EXISTS (
         SELECT 1
         FROM public.economy_transactions_entries
         WHERE transaction_id = transfer_id
           AND account_id = sender_account_id
           AND money_delta = -p_amount
       )
       AND EXISTS (
         SELECT 1
         FROM public.economy_transactions_entries
         WHERE transaction_id = transfer_id
           AND account_id = recipient_account_id
           AND money_delta = p_amount
       ) THEN
      RETURN jsonb_build_object('transaction_id', transfer_id);
    ELSE
      RAISE EXCEPTION USING ERRCODE = 'P0005', MESSAGE = 'idempotency_key_reused';
    END IF;
  END IF;

  SELECT money INTO sender_money
  FROM public.economy_accounts
  WHERE id = sender_account_id;

  IF sender_money < p_amount THEN
    RAISE EXCEPTION USING ERRCODE = 'P0004', MESSAGE = 'insufficient_funds';
  END IF;

  INSERT INTO public.economy_transactions (
    idempotency_key,
    transaction_type,
    reference_id,
    actor_account_id,
    actor_label,
    description
  )
  VALUES (
    p_idempotency_key,
    'transfer',
    p_recipient_account_number,
    sender_account_id,
    NULL,
    'Account transfer'
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO transfer_id;

  IF transfer_id IS NULL THEN
    SELECT id INTO transfer_id
    FROM public.economy_transactions
    WHERE idempotency_key = p_idempotency_key;

    IF (SELECT count(*) FROM public.economy_transactions_entries WHERE transaction_id = transfer_id) = 2
       AND EXISTS (
         SELECT 1
         FROM public.economy_transactions_entries
         WHERE transaction_id = transfer_id
           AND account_id = sender_account_id
           AND money_delta = -p_amount
       )
       AND EXISTS (
         SELECT 1
         FROM public.economy_transactions_entries
         WHERE transaction_id = transfer_id
           AND account_id = recipient_account_id
           AND money_delta = p_amount
       ) THEN
      RETURN jsonb_build_object('transaction_id', transfer_id);
    ELSE
      RAISE EXCEPTION USING ERRCODE = 'P0005', MESSAGE = 'idempotency_key_reused';
    END IF;
  END IF;

  INSERT INTO public.economy_transactions_entries (transaction_id, account_id, money_delta)
  VALUES
    (transfer_id, sender_account_id, -p_amount),
    (transfer_id, recipient_account_id, p_amount);

  UPDATE public.economy_accounts
  SET money = money - p_amount, updated_at = now()
  WHERE id = sender_account_id;

  UPDATE public.economy_accounts
  SET money = money + p_amount, updated_at = now()
  WHERE id = recipient_account_id;

  RETURN jsonb_build_object('transaction_id', transfer_id);
END;
$$;

REVOKE ALL ON FUNCTION public.fab_ensure_player_account(text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fab_update_player_identity(bigint, bigint, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fab_get_player_account(bigint, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fab_transfer(bigint, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fab_ensure_player_account(text, bigint, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.fab_update_player_identity(bigint, bigint, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fab_get_player_account(bigint, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fab_transfer(bigint, text, text, bigint, text) TO service_role;
