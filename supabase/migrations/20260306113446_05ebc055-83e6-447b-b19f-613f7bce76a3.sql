
-- Fix add_creator_role_safe
CREATE OR REPLACE FUNCTION public.add_creator_role_safe(p_user_email text, p_granted_by uuid)
RETURNS text LANGUAGE plpgsql
SET search_path = public
AS $$ DECLARE v_user_id UUID; v_existing_role_id UUID; BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email;
  IF v_user_id IS NULL THEN RETURN 'ERRO: Usuário não encontrado'; END IF;
  SELECT id INTO v_existing_role_id FROM public.user_roles WHERE user_id = v_user_id AND role = 'creator';
  IF v_existing_role_id IS NOT NULL THEN RETURN 'JÁ EXISTE: Role creator já estava atribuída'; END IF;
  INSERT INTO public.user_roles (user_id, role, granted_by, granted_at) VALUES (v_user_id, 'creator', p_granted_by, now());
  RETURN 'SUCESSO: Role creator adicionada';
EXCEPTION WHEN OTHERS THEN RETURN 'ERRO: ' || SQLERRM;
END; $$;

-- Fix search_path for LXPay functions via ALTER
ALTER FUNCTION public.create_lxpay_pix(numeric, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.verify_lxpay_payment(text, text) SET search_path = public;
