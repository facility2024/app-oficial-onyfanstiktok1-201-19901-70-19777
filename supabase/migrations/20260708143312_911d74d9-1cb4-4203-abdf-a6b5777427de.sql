
CREATE OR REPLACE FUNCTION public.admin_delete_referrer(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  DELETE FROM public.referrals WHERE referrer_id = p_user_id;
  DELETE FROM public.referral_link_clicks WHERE referrer_id = p_user_id;
  DELETE FROM public.referrer_payout_info WHERE user_id = p_user_id;
  UPDATE public.profiles SET referral_code = NULL WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_referrer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_referrer(uuid) TO authenticated;
