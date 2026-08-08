
-- =========================================================
-- PARTE 1: Programa de Indicação (Cocons)
-- =========================================================

-- 1) CONFIG DO PROGRAMA (singleton)
CREATE TABLE IF NOT EXISTS public.referral_program_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cocon_value_brl NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  cocons_per_referral INTEGER NOT NULL DEFAULT 1,
  bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  program_active BOOLEAN NOT NULL DEFAULT true,
  neon_official_link TEXT DEFAULT 'https://www.neon.com.br',
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_program_config TO anon, authenticated;
GRANT ALL ON public.referral_program_config TO service_role;

ALTER TABLE public.referral_program_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_public_read" ON public.referral_program_config
  FOR SELECT USING (true);

CREATE POLICY "config_admin_all" ON public.referral_program_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) CLIQUES NO LINK
CREATE TABLE IF NOT EXISTS public.referral_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT,
  ip_address TEXT,
  user_agent TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_referrer ON public.referral_link_clicks(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON public.referral_link_clicks(referral_code);

GRANT SELECT ON public.referral_link_clicks TO authenticated;
GRANT INSERT ON public.referral_link_clicks TO anon, authenticated;
GRANT ALL ON public.referral_link_clicks TO service_role;

ALTER TABLE public.referral_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clicks_insert_public" ON public.referral_link_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "clicks_select_own" ON public.referral_link_clicks
  FOR SELECT TO authenticated USING (referrer_id = auth.uid());

CREATE POLICY "clicks_admin_all" ON public.referral_link_clicks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) DADOS DE RECEBIMENTO
CREATE TABLE IF NOT EXISTS public.referrer_payout_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  cpf TEXT,
  pix_key TEXT,
  pix_type TEXT,
  neon_id TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrer_payout_info TO authenticated;
GRANT ALL ON public.referrer_payout_info TO service_role;

ALTER TABLE public.referrer_payout_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_select_own" ON public.referrer_payout_info
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "payout_insert_own" ON public.referrer_payout_info
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "payout_update_own" ON public.referrer_payout_info
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "payout_admin_all" ON public.referrer_payout_info
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) AJUSTES EM referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS cocons_awarded INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Atualizar constraint de status para incluir 'cancelled'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_status_check'
  ) THEN
    ALTER TABLE public.referrals DROP CONSTRAINT referrals_status_check;
  END IF;
  ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_status_check
    CHECK (status IN ('pending','approved','completed','cancelled','expired'));
END $$;

-- 5) AJUSTE EM profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_referrer_only BOOLEAN DEFAULT false;

-- 6) TRIGGER: novo referred_by => cria referral 'pending' (sem creditar)
CREATE OR REPLACE FUNCTION public.create_pending_referral()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.referred_by IS DISTINCT FROM NEW.referred_by) THEN
    INSERT INTO public.referrals (
      referrer_id, referred_id, referred_email, status, bonus_amount, cocons_awarded
    ) VALUES (
      NEW.referred_by,
      NEW.id,
      COALESCE(NEW.email, ''),
      'pending',
      0,
      0
    )
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_referral ON public.profiles;
DROP TRIGGER IF EXISTS trigger_create_pending_referral ON public.profiles;
CREATE TRIGGER trigger_create_pending_referral
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_pending_referral();

-- 7) FUNÇÃO: aprovar indicação (admin) — credita Cocons e valor R$
CREATE OR REPLACE FUNCTION public.approve_referral(p_referral_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_cfg RECORD;
  v_ref RECORD;
  v_amount NUMERIC(10,2);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar indicações';
  END IF;

  SELECT * INTO v_cfg FROM public.referral_program_config LIMIT 1;
  IF v_cfg IS NULL OR NOT v_cfg.program_active THEN
    RAISE EXCEPTION 'Programa de indicação inativo';
  END IF;

  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id;
  IF v_ref IS NULL THEN RAISE EXCEPTION 'Indicação não encontrada'; END IF;
  IF v_ref.status = 'approved' OR v_ref.status = 'completed' THEN RETURN true; END IF;

  v_amount := v_cfg.cocons_per_referral * v_cfg.cocon_value_brl;

  UPDATE public.referrals
     SET status = 'approved',
         cocons_awarded = v_cfg.cocons_per_referral,
         bonus_amount = v_amount,
         approved_at = now(),
         approved_by = auth.uid(),
         completed_at = COALESCE(completed_at, now())
   WHERE id = p_referral_id;

  INSERT INTO public.user_wallets (user_id, nudix_balance, total_earned)
  VALUES (v_ref.referrer_id, v_amount, v_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET nudix_balance = user_wallets.nudix_balance + v_amount,
        total_earned  = user_wallets.total_earned  + v_amount,
        updated_at    = now();

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_ref.referrer_id, v_amount, 'referral_bonus',
          'Indicação aprovada (' || v_cfg.cocons_per_referral || ' Cocon(s))');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8) FUNÇÃO: cancelar indicação (admin)
CREATE OR REPLACE FUNCTION public.cancel_referral(p_referral_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_ref RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem cancelar indicações';
  END IF;

  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id;
  IF v_ref IS NULL THEN RETURN false; END IF;

  -- Se já foi aprovada, estornar
  IF v_ref.status IN ('approved','completed') AND COALESCE(v_ref.bonus_amount,0) > 0 THEN
    UPDATE public.user_wallets
       SET nudix_balance = GREATEST(0, nudix_balance - v_ref.bonus_amount),
           total_earned  = GREATEST(0, total_earned  - v_ref.bonus_amount),
           updated_at = now()
     WHERE user_id = v_ref.referrer_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_ref.referrer_id, -v_ref.bonus_amount, 'refund',
            'Estorno de indicação cancelada');
  END IF;

  UPDATE public.referrals
     SET status = 'cancelled',
         cancelled_at = now()
   WHERE id = p_referral_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9) Config inicial
INSERT INTO public.referral_program_config (cocon_value_brl, cocons_per_referral, bonus_percentage, program_active)
VALUES (1.00, 1, 0, true)
ON CONFLICT (singleton) DO NOTHING;

-- 10) updated_at trigger util (reuso)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_config_updated ON public.referral_program_config;
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.referral_program_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payout_updated ON public.referrer_payout_info;
CREATE TRIGGER trg_payout_updated BEFORE UPDATE ON public.referrer_payout_info
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
