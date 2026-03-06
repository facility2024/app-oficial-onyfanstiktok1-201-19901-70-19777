
-- Add address columns to online_users for Google geocoding data
ALTER TABLE public.online_users 
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS location_neighborhood TEXT;

-- Create cleanup function for 48h retention
CREATE OR REPLACE FUNCTION public.cleanup_old_online_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.online_users 
  WHERE last_seen_at < (now() - interval '48 hours');
END;
$$;
