ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS private_model_id uuid,
  ADD COLUMN IF NOT EXISTS private_model_type text NOT NULL DEFAULT 'model';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_transactions_private_model_type_check'
      AND conrelid = 'public.payment_transactions'::regclass
  ) THEN
    ALTER TABLE public.payment_transactions
      ADD CONSTRAINT payment_transactions_private_model_type_check
      CHECK (private_model_type IN ('model', 'creator'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_private_model_id
  ON public.payment_transactions(private_model_id);

CREATE OR REPLACE FUNCTION public.grant_private_access_for_approved_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_email text;
  buyer_phone text;
  days_to_add integer;
  access_start timestamptz;
  access_end timestamptz;
BEGIN
  IF NEW.status <> 'APPROVED' OR NEW.private_model_id IS NULL THEN
    RETURN NEW;
  END IF;

  days_to_add := CASE NEW.plan_type
    WHEN 'anual' THEN 365
    WHEN 'trimestral' THEN 90
    ELSE 30
  END;

  SELECT p.email, p.phone
    INTO buyer_email, buyer_phone
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF buyer_email IS NULL THEN
    SELECT u.email
      INTO buyer_email
    FROM auth.users u
    WHERE u.id = NEW.user_id;
  END IF;

  access_start := now();
  access_end := now() + make_interval(days => days_to_add);

  INSERT INTO public.model_subscriptions (
    subscriber_id,
    subscriber_email,
    subscriber_phone,
    model_id,
    model_type,
    subscription_type,
    subscription_status,
    subscription_start,
    subscription_end,
    price_paid,
    payment_id,
    updated_at
  ) VALUES (
    NEW.user_id,
    COALESCE(buyer_email, 'sem-email-' || NEW.user_id::text || '@coconudi.local'),
    buyer_phone,
    NEW.private_model_id,
    COALESCE(NEW.private_model_type, 'model'),
    COALESCE(NEW.plan_type, 'mensal'),
    'active',
    access_start,
    access_end,
    NEW.amount,
    COALESCE(NEW.asaas_payment_id, NEW.asaas_customer_id, NEW.id::text),
    now()
  )
  ON CONFLICT (subscriber_id, model_id)
  DO UPDATE SET
    subscriber_email = EXCLUDED.subscriber_email,
    subscriber_phone = COALESCE(EXCLUDED.subscriber_phone, public.model_subscriptions.subscriber_phone),
    model_type = EXCLUDED.model_type,
    subscription_type = EXCLUDED.subscription_type,
    subscription_status = 'active',
    subscription_start = LEAST(public.model_subscriptions.subscription_start, EXCLUDED.subscription_start),
    subscription_end = GREATEST(public.model_subscriptions.subscription_end, now()) + make_interval(days => days_to_add),
    price_paid = EXCLUDED.price_paid,
    payment_id = EXCLUDED.payment_id,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_private_access_for_approved_payment ON public.payment_transactions;
CREATE TRIGGER trg_grant_private_access_for_approved_payment
AFTER INSERT OR UPDATE OF status ON public.payment_transactions
FOR EACH ROW
WHEN (NEW.status = 'APPROVED')
EXECUTE FUNCTION public.grant_private_access_for_approved_payment();

UPDATE public.videos
SET visibility = 'private', updated_at = now()
WHERE visibility = 'premium';