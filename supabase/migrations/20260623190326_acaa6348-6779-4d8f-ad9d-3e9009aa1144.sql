-- Normalizar visibilidade: tudo que era 'premium' vira 'private'
UPDATE public.videos SET visibility = 'private' WHERE visibility = 'premium';

-- Restringir o domínio para apenas public/private
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_visibility_check;
ALTER TABLE public.videos
  ADD CONSTRAINT videos_visibility_check
  CHECK (visibility IN ('public','private'));

-- Garantir que pagamento aprovado (premium_users ativo) também libere
-- conteúdo privado individual: cria/renova model_subscriptions para
-- todos os criadores cuja visibilidade exija acesso pago.
CREATE OR REPLACE FUNCTION public.grant_private_on_premium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.subscription_status = 'active'
     AND NEW.subscription_end > now()
     AND NEW.user_id IS NOT NULL THEN
    v_email := COALESCE(NEW.email, '');

    INSERT INTO public.model_subscriptions
      (subscriber_id, subscriber_email, model_id, model_type,
       subscription_type, subscription_status,
       subscription_start, subscription_end, price_paid)
    SELECT
      NEW.user_id, v_email, m.id, 'creator',
      COALESCE(NEW.subscription_type, 'mensal'), 'active',
      NEW.subscription_start, NEW.subscription_end, 0
    FROM (
      SELECT DISTINCT creator_id AS id
      FROM public.videos
      WHERE creator_id IS NOT NULL AND visibility = 'private'
      UNION
      SELECT DISTINCT model_id AS id
      FROM public.videos
      WHERE model_id IS NOT NULL AND visibility = 'private'
    ) m
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_private_on_premium ON public.premium_users;
CREATE TRIGGER trg_grant_private_on_premium
AFTER INSERT OR UPDATE ON public.premium_users
FOR EACH ROW EXECUTE FUNCTION public.grant_private_on_premium();