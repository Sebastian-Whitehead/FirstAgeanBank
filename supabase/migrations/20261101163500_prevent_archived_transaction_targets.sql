CREATE OR REPLACE FUNCTION public.fab_prevent_archived_transaction_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id bigint;
  v_archived_at timestamptz;
BEGIN
  IF NEW.transaction_type <> 'transfer'
    OR NEW.reference_id IS NULL
    OR btrim(NEW.reference_id) = '' THEN
    RETURN NEW;
  END IF;

  SELECT id, archived_at
    INTO v_account_id, v_archived_at
    FROM public.economy_accounts
    WHERE account_type = 'player'
      AND account_number = NEW.reference_id
    FOR UPDATE;

  IF FOUND AND v_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_archived';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fab_prevent_archived_transaction_target
  ON public.economy_transactions;
CREATE TRIGGER fab_prevent_archived_transaction_target
  BEFORE INSERT OR UPDATE OF transaction_type, reference_id
  ON public.economy_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.fab_prevent_archived_transaction_target();

REVOKE ALL ON FUNCTION public.fab_prevent_archived_transaction_target()
  FROM PUBLIC, anon, authenticated;
