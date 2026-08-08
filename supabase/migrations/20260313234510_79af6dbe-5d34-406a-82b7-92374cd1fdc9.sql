
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asaas_payment_id TEXT,
  asaas_subscription_id TEXT,
  asaas_customer_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'mensal',
  status TEXT NOT NULL DEFAULT 'PENDING',
  checkout_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "service_insert_transactions" ON public.payment_transactions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "service_update_transactions" ON public.payment_transactions
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "admins_all_transactions" ON public.payment_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_asaas_payment_id ON public.payment_transactions(asaas_payment_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
