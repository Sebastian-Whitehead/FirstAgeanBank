CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE private.auth_username_directory (
  username text PRIMARY KEY CHECK (username ~ '^[a-z0-9]{1,64}$'),
  email text NOT NULL UNIQUE CHECK (email = lower(email))
);

ALTER TABLE private.auth_username_directory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.auth_username_directory FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fab_get_auth_email_for_username(p_username text)
RETURNS TABLE(email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT directory.email
  FROM private.auth_username_directory AS directory
  WHERE directory.username = p_username
$$;

REVOKE ALL ON FUNCTION public.fab_get_auth_email_for_username(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fab_get_auth_email_for_username(text) TO service_role;

CREATE OR REPLACE FUNCTION public.fab_register_auth_username(p_username text, p_email text)
RETURNS TABLE(success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_username text;
  existing_email text;
  inserted_rows integer;
BEGIN
  IF p_username IS NULL
     OR p_username !~ '^[a-z0-9]{1,64}$'
     OR p_email IS NULL
     OR p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;

  SELECT directory.username, directory.email
  INTO existing_username, existing_email
  FROM private.auth_username_directory AS directory
  WHERE directory.username = p_username
     OR directory.email = lower(p_email)
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT existing_username = p_username AND existing_email = lower(p_email);
    RETURN;
  END IF;

  INSERT INTO private.auth_username_directory (username, email)
  VALUES (p_username, lower(p_email))
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  IF inserted_rows = 1 THEN
    RETURN QUERY SELECT true;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT EXISTS (
    SELECT 1
    FROM private.auth_username_directory AS directory
    WHERE directory.username = p_username
      AND directory.email = lower(p_email)
  );
END
$$;

REVOKE ALL ON FUNCTION public.fab_register_auth_username(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fab_register_auth_username(text, text) TO service_role;
