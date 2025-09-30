-- Add minimal SELECT policies to all public tables that have RLS enabled but no policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'  -- ordinary tables
      AND c.relrowsecurity = true
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = r.schemaname
        AND p.tablename = r.tablename
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (true);',
        'authenticated_select_' || r.tablename,
        r.schemaname,
        r.tablename
      );
    END IF;
  END LOOP;
END$$;