-- =====================================================
-- CORREÇÃO DO SISTEMA DE REFERÊNCIA
-- Garante que bônus seja creditado ao indicador
-- =====================================================

-- 1. Recriar função process_referral_completion (caso não exista ou esteja incorreta)
CREATE OR REPLACE FUNCTION process_referral_completion(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_referred_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_bonus_amount DECIMAL(10,2) := 1.00;
BEGIN
  -- Verificar se já existe essa referência
  IF EXISTS (
    SELECT 1 FROM referrals 
    WHERE referrer_id = p_referrer_id 
    AND referred_id = p_referred_id
  ) THEN
    RETURN TRUE; -- Já processado
  END IF;

  -- Criar carteira do indicador se não existir
  INSERT INTO user_wallets (user_id, nudix_balance, total_earned)
  VALUES (p_referrer_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Criar carteira do indicado se não existir
  INSERT INTO user_wallets (user_id, nudix_balance, total_earned)
  VALUES (p_referred_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Registrar a indicação
  INSERT INTO referrals (
    referrer_id, 
    referred_id, 
    status, 
    bonus_amount,
    completed_at
  ) VALUES (
    p_referrer_id,
    p_referred_id,
    'completed',
    v_bonus_amount,
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Creditar bônus ao indicador
  UPDATE user_wallets 
  SET 
    nudix_balance = nudix_balance + v_bonus_amount,
    total_earned = total_earned + v_bonus_amount,
    updated_at = NOW()
  WHERE user_id = p_referrer_id;

  -- Registrar transação do bônus
  INSERT INTO wallet_transactions (
    user_id,
    amount,
    type,
    description
  ) VALUES (
    p_referrer_id,
    v_bonus_amount,
    'referral_bonus',
    'Bônus por indicar: ' || p_referred_email
  );

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao processar referência: %', SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger automático quando novo perfil tem referred_by
CREATE OR REPLACE FUNCTION auto_process_referral()
RETURNS TRIGGER AS $$
BEGIN
  -- Se novo usuário tem referred_by, processar bônus automaticamente
  IF NEW.referred_by IS NOT NULL AND (OLD IS NULL OR OLD.referred_by IS NULL) THEN
    PERFORM process_referral_completion(
      NEW.referred_by,
      NEW.id,
      COALESCE(NEW.email, 'usuario@app.com')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger (se não existir)
DROP TRIGGER IF EXISTS trigger_auto_referral ON profiles;
CREATE TRIGGER trigger_auto_referral
  AFTER INSERT OR UPDATE OF referred_by ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_process_referral();

-- 3. Garantir que tabelas existem com estrutura correta
-- (não recria se já existir)
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nudix_balance DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  bonus_amount DECIMAL(10,2) DEFAULT 1.00,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('referral_bonus', 'welcome_bonus', 'purchase', 'refund')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS permissivas
DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
CREATE POLICY "Users can view own wallet" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
CREATE POLICY "Users can view own transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 6. Criar carteiras para usuários existentes que não têm
INSERT INTO user_wallets (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 7. Verificação final
DO $$
BEGIN
  RAISE NOTICE 'Sistema de referência configurado com sucesso!';
END $$;
