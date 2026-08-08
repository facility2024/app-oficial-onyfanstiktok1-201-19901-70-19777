-- Fix FK and length issues on analytics_events inserts

-- 1) Create BEFORE INSERT function with safe search_path
CREATE OR REPLACE FUNCTION public.analytics_events_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure referenced user exists when provided
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.ensure_guest_user(NEW.user_id);
  END IF;

  -- Truncate potentially long URLs to 500 chars to satisfy column limits
  IF NEW.referrer_url IS NOT NULL THEN
    NEW.referrer_url := LEFT(NEW.referrer_url, 500);
  END IF;

  IF NEW.page_url IS NOT NULL THEN
    NEW.page_url := LEFT(NEW.page_url, 500);
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_analytics_events_before_insert'
  ) THEN
    CREATE TRIGGER trg_analytics_events_before_insert
    BEFORE INSERT ON public.analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION public.analytics_events_before_insert();
  END IF;
END $$;