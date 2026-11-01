ALTER TABLE economy.economy_accounts RENAME TO accounts;
ALTER TABLE economy.economy_transactions RENAME TO transactions;
ALTER TABLE economy.economy_transactions_entries RENAME TO transactions_entries;

DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE p.prokind = 'f'
      AND strpos(p.prosrc, 'economy.economy_') > 0
  LOOP
    EXECUTE replace(
      replace(
        replace(
          pg_get_functiondef(routine.oid),
          'economy.economy_transactions_entries',
          'economy.transactions_entries'
        ),
        'economy.economy_transactions',
        'economy.transactions'
      ),
      'economy.economy_accounts',
      'economy.accounts'
    );
  END LOOP;
END
$$;

NOTIFY pgrst, 'reload schema';
