CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  DELETE FROM public.premium_users WHERE user_id = p_user_id;
  DELETE FROM public.user_roles    WHERE user_id = p_user_id;
  DELETE FROM public.profiles      WHERE id      = p_user_id;
  DELETE FROM auth.users           WHERE id      = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;