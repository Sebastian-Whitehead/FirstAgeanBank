CREATE OR REPLACE FUNCTION public.fab_prevent_archived_transaction_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_archived_at timestamptz;
BEGIN
  IF NEW.actor_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT archived_at
    INTO v_archived_at
    FROM public.economy_accounts
    WHERE id = NEW.actor_account_id
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

DROP TRIGGER IF EXISTS fab_prevent_archived_transaction_actor
  ON public.economy_transactions;
CREATE TRIGGER fab_prevent_archived_transaction_actor
  BEFORE INSERT OR UPDATE OF actor_account_id
  ON public.economy_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.fab_prevent_archived_transaction_actor();

REVOKE ALL ON FUNCTION public.fab_prevent_archived_transaction_actor() FROM PUBLIC, anon, authenticated;
