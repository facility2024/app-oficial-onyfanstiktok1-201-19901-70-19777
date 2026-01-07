-- Sistema de Afiliados COCONUDI com Moeda Virtual Nudix
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de Carteiras Nudix
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nudix_balance DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Indicações
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  referred_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  bonus_paid BOOLEAN DEFAULT false,
  bonus_amount DECIMAL(10,2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 3. Tabela de Transações da Carteira
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT CHECK (type IN ('referral_bonus', 'welcome_bonus', 'purchase', 'refund')),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Adicionar colunas na tabela profiles (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
    ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
    ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 5. Função para gerar código de referência único
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código de 8 caracteres alfanuméricos
    new_code := UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 8));
    
    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para gerar código de referência automaticamente
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

-- 7. Função para criar carteira automaticamente
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (user_id) 
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_wallet ON auth.users;
CREATE TRIGGER trigger_create_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_user();

-- 8. Função para processar bônus de indicação
CREATE OR REPLACE FUNCTION process_referral_completion(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_referred_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_bonus_amount DECIMAL(10,2) := 1.00;
BEGIN
  -- Verificar se já foi processado
  IF EXISTS (
    SELECT 1 FROM referrals 
    WHERE referrer_id = p_referrer_id 
    AND referred_email = LOWER(p_referred_email) 
    AND status = 'completed'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Atualizar ou inserir indicação
  INSERT INTO referrals (referrer_id, referred_id, referral_code, referred_email, status, bonus_paid, completed_at)
  SELECT 
    p_referrer_id,
    p_referred_id,
    p.referral_code,
    LOWER(p_referred_email),
    'completed',
    true,
    now()
  FROM profiles p
  WHERE p.id = p_referrer_id
  ON CONFLICT (id) DO UPDATE SET
    referred_id = p_referred_id,
    status = 'completed',
    bonus_paid = true,
    completed_at = now();

  -- Creditar Nudix para o indicador
  UPDATE user_wallets 
  SET 
    nudix_balance = nudix_balance + v_bonus_amount,
    total_earned = total_earned + v_bonus_amount,
    updated_at = now()
  WHERE user_id = p_referrer_id;

  -- Criar carteira se não existir
  INSERT INTO user_wallets (user_id, nudix_balance, total_earned)
  VALUES (p_referrer_id, v_bonus_amount, v_bonus_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    nudix_balance = user_wallets.nudix_balance + v_bonus_amount,
    total_earned = user_wallets.total_earned + v_bonus_amount,
    updated_at = now();

  -- Registrar transação
  INSERT INTO wallet_transactions (user_id, amount, type, description, reference_id)
  VALUES (
    p_referrer_id, 
    v_bonus_amount, 
    'referral_bonus', 
    'Bônus por indicação de ' || p_referred_email,
    p_referred_id
  );

  -- Atualizar perfil do indicado
  UPDATE profiles 
  SET referred_by = p_referrer_id 
  WHERE id = p_referred_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função RPC para buscar indicador por código
CREATE OR REPLACE FUNCTION get_referrer_by_code(p_code TEXT)
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE referral_code = UPPER(p_code) LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 10. Habilitar RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para user_wallets
DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
CREATE POLICY "Users can view own wallet" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallet" ON user_wallets;
CREATE POLICY "Users can update own wallet" ON user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert wallets" ON user_wallets;
CREATE POLICY "System can insert wallets" ON user_wallets
  FOR INSERT WITH CHECK (true);

-- 12. Políticas RLS para referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can insert referrals" ON referrals;
CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "System can update referrals" ON referrals;
CREATE POLICY "System can update referrals" ON referrals
  FOR UPDATE USING (true);

-- 13. Políticas RLS para wallet_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
CREATE POLICY "Users can view own transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert transactions" ON wallet_transactions;
CREATE POLICY "System can insert transactions" ON wallet_transactions
  FOR INSERT WITH CHECK (true);

-- 14. Atualizar códigos de referência para usuários existentes
UPDATE profiles 
SET referral_code = generate_unique_referral_code() 
WHERE referral_code IS NULL;

-- 15. Criar carteiras para usuários existentes
INSERT INTO user_wallets (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 16. Índices para performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email ON referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
