CREATE SCHEMA IF NOT EXISTS economy;

GRANT USAGE ON SCHEMA economy TO anon, authenticated, service_role;

ALTER TABLE public.economy_accounts SET SCHEMA economy;
ALTER TABLE public.economy_transactions SET SCHEMA economy;
ALTER TABLE public.economy_transactions_entries SET SCHEMA economy;

DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND strpos(p.prosrc, 'public.economy_') > 0
  LOOP
    EXECUTE replace(
      pg_get_functiondef(routine.oid),
      'public.economy_',
      'economy.economy_'
    );
  END LOOP;
END
$$;
