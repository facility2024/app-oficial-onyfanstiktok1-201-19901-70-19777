-- ============================================
-- CORREÇÃO COMPLETA DO SISTEMA DE REFERÊNCIA
-- Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Garantir que a coluna referral_code existe em profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Criar tabela user_wallets se não existir
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nudix_balance DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela referrals se não existir
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'expired')),
  bonus_paid BOOLEAN DEFAULT TRUE,
  bonus_amount DECIMAL(10,2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- 4. Criar tabela wallet_transactions se não existir
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('referral_bonus', 'welcome_bonus', 'purchase', 'refund')),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Função para gerar código de referência único
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Atualizar perfis existentes sem código de referência
UPDATE profiles 
SET referral_code = generate_unique_referral_code()
WHERE referral_code IS NULL;

-- 7. Trigger para gerar código automaticamente em novos perfis
CREATE OR REPLACE FUNCTION set_referral_code_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_unique_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON profiles;
CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code_on_profile();

-- 8. Função principal de processamento de referência
CREATE OR REPLACE FUNCTION process_referral_completion(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_referred_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_bonus DECIMAL(10,2) := 1.00;
BEGIN
  -- Verificar se já foi processado
  IF EXISTS (
    SELECT 1 FROM referrals 
    WHERE referrer_id = p_referrer_id AND referred_id = p_referred_id
  ) THEN
    RETURN TRUE; -- Já processado, retorna sucesso
  END IF;
  
  -- Criar carteira do referrer se não existir
  INSERT INTO user_wallets (user_id, nudix_balance, total_earned)
  VALUES (p_referrer_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar carteira do referido se não existir
  INSERT INTO user_wallets (user_id, nudix_balance, total_earned)
  VALUES (p_referred_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Registrar a referência
  INSERT INTO referrals (referrer_id, referred_id, status, bonus_amount, bonus_paid, completed_at)
  VALUES (p_referrer_id, p_referred_id, 'completed', v_bonus, TRUE, NOW())
  ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  
  -- Creditar bônus ao referrer
  UPDATE user_wallets
  SET 
    nudix_balance = nudix_balance + v_bonus,
    total_earned = total_earned + v_bonus,
    updated_at = NOW()
  WHERE user_id = p_referrer_id;
  
  -- Registrar transação
  INSERT INTO wallet_transactions (user_id, amount, type, description, reference_id)
  VALUES (
    p_referrer_id, 
    v_bonus, 
    'referral_bonus', 
    'Bônus por indicação de novo usuário', 
    p_referred_id
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao processar referência: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger automático quando referred_by é definido
CREATE OR REPLACE FUNCTION auto_process_referral()
RETURNS TRIGGER AS $$
BEGIN
  -- Se novo usuário tem referred_by e é INSERT ou UPDATE que define referred_by
  IF NEW.referred_by IS NOT NULL AND 
     (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.referred_by IS NULL)) THEN
    PERFORM process_referral_completion(NEW.referred_by, NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_referral ON profiles;
CREATE TRIGGER trigger_auto_referral
  AFTER INSERT OR UPDATE OF referred_by ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_referral();

-- 10. Habilitar RLS nas tabelas
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para user_wallets
DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
CREATE POLICY "Users can view own wallet" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage wallets" ON user_wallets;
CREATE POLICY "System can manage wallets" ON user_wallets
  FOR ALL USING (true) WITH CHECK (true);

-- 12. Políticas RLS para referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "System can manage referrals" ON referrals;
CREATE POLICY "System can manage referrals" ON referrals
  FOR ALL USING (true) WITH CHECK (true);

-- 13. Políticas RLS para wallet_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
CREATE POLICY "Users can view own transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage transactions" ON wallet_transactions;
CREATE POLICY "System can manage transactions" ON wallet_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- 14. Criar carteiras para usuários existentes
INSERT INTO user_wallets (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 15. Processar referências retroativas (usuários que cadastraram mas não foram processados)
INSERT INTO referrals (referrer_id, referred_id, status, bonus_amount, bonus_paid, completed_at)
SELECT 
  p.referred_by,
  p.id,
  'completed',
  1.00,
  TRUE,
  NOW()
FROM profiles p
WHERE p.referred_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM referrals r 
  WHERE r.referrer_id = p.referred_by AND r.referred_id = p.id
)
ON CONFLICT (referrer_id, referred_id) DO NOTHING;

-- 16. Creditar bônus retroativos
UPDATE user_wallets w
SET 
  nudix_balance = nudix_balance + sub.total_bonus,
  total_earned = total_earned + sub.total_bonus,
  updated_at = NOW()
FROM (
  SELECT 
    referrer_id,
    COUNT(*) * 1.00 as total_bonus
  FROM referrals r
  WHERE NOT EXISTS (
    SELECT 1 FROM wallet_transactions t 
    WHERE t.user_id = r.referrer_id 
    AND t.reference_id = r.referred_id 
    AND t.type = 'referral_bonus'
  )
  GROUP BY referrer_id
) sub
WHERE w.user_id = sub.referrer_id;

-- 17. Registrar transações retroativas
INSERT INTO wallet_transactions (user_id, amount, type, description, reference_id)
SELECT 
  r.referrer_id,
  1.00,
  'referral_bonus',
  'Bônus por indicação (retroativo)',
  r.referred_id
FROM referrals r
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions t 
  WHERE t.user_id = r.referrer_id 
  AND t.reference_id = r.referred_id 
  AND t.type = 'referral_bonus'
);

-- 18. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 'Perfis com código de referência:', COUNT(*) FROM profiles WHERE referral_code IS NOT NULL;
SELECT 'Total de referências:', COUNT(*) FROM referrals;
SELECT 'Carteiras criadas:', COUNT(*) FROM user_wallets;
SELECT 'Transações registradas:', COUNT(*) FROM wallet_transactions;
