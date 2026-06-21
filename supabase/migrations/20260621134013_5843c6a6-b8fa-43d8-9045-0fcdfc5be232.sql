
CREATE OR REPLACE FUNCTION public.register_online_user(
  p_user_id uuid,
  p_session_id text,
  p_location_state text DEFAULT NULL,
  p_location_city text DEFAULT NULL,
  p_location_country text DEFAULT 'BR',
  p_ip_address text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.online_users (
    user_id, session_id, is_online, last_seen_at, updated_at,
    location_state, location_city, location_country,
    ip_address, device_type, user_agent
  ) VALUES (
    p_user_id, p_session_id, true, now(), now(),
    p_location_state, p_location_city, p_location_country,
    p_ip_address::inet, p_device_type, p_user_agent
  )
  ON CONFLICT (session_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    is_online = true,
    last_seen_at = now(),
    updated_at = now(),
    location_state = EXCLUDED.location_state,
    location_city = EXCLUDED.location_city,
    location_country = EXCLUDED.location_country,
    ip_address = EXCLUDED.ip_address,
    device_type = EXCLUDED.device_type,
    user_agent = EXCLUDED.user_agent;
EXCEPTION WHEN OTHERS THEN
  -- Tolerante a tipo inet inválido ou outros erros não-críticos
  INSERT INTO public.online_users (
    user_id, session_id, is_online, last_seen_at, updated_at,
    location_state, location_city, location_country,
    device_type, user_agent
  ) VALUES (
    p_user_id, p_session_id, true, now(), now(),
    p_location_state, p_location_city, p_location_country,
    p_device_type, p_user_agent
  )
  ON CONFLICT (session_id) DO UPDATE SET
    is_online = true,
    last_seen_at = now(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_online_user(uuid, text, text, text, text, text, text, text) TO anon, authenticated;
