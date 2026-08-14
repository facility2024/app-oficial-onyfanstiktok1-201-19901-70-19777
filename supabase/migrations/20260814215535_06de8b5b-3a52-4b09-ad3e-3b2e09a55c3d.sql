CREATE OR REPLACE FUNCTION public.bump_api_key_usage(_key_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.api_keys
     SET usage_count = COALESCE(usage_count, 0) + 1,
         last_used_at = now()
   WHERE id = _key_id;
$$;

REVOKE ALL ON FUNCTION public.bump_api_key_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_api_key_usage(uuid) TO service_role;