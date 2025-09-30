-- Fix function search_path for security linter
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_offer_effect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['none','pulse','bounce','glow','wiggle','shake'];
BEGIN
  IF NOT (NEW.button_effect = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid button_effect. Allowed: %', array_to_string(allowed, ',');
  END IF;
  RETURN NEW;
END;
$$;