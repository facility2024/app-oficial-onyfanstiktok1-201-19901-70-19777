-- Set fixed search_path for all functions in public to satisfy security linter
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname,
           p.proname AS funcname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path TO public;', r.schemaname, r.funcname, r.args);
  END LOOP;
END$$;