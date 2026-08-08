-- Fix security warning: Function Search Path Mutable
-- Update the function to be more secure
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$;