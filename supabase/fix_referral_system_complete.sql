-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE REFERÊNCIA/AFILIADOS
-- Garante que bônus N$ 1,00 seja creditado imediatamente
-- =====================================================

-- 1. Garantir colunas em profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Criar/Recriar tabela user_wallets
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    nudix_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar/Recriar tabela referrals
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    referral_code TEXT,
    referred_email TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'expired')),
    bonus_amount DECIMAL(10,2) DEFAULT 1.00,
    bonus_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referrer_id, referred_id)
);

-- 4. Criar/Recriar tabela wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('referral_bonus', 'welcome_bonus', 'purchase', 'refund', 'credit', 'debit')),
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Função para gerar código de referência único
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := upper(substr(md5(random()::text), 1, 8));
        SELECT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Atualizar perfis existentes sem referral_code
UPDATE public.profiles 
SET referral_code = public.generate_unique_referral_code()
WHERE referral_code IS NULL;

-- 7. Trigger para gerar referral_code automaticamente em novos perfis
CREATE OR REPLACE FUNCTION public.set_referral_code_on_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_unique_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON public.profiles;
CREATE TRIGGER trigger_set_referral_code
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_referral_code_on_profile();

-- 8. Função principal de processamento de referência (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.process_referral_completion(
    p_referrer_id UUID,
    p_referred_id UUID,
    p_referred_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_bonus DECIMAL(10,2) := 1.00;
    v_existing_count INTEGER;
BEGIN
    -- Log início
    RAISE NOTICE 'Processando referência: referrer=%, referred=%', p_referrer_id, p_referred_id;
    
    -- Verificar parâmetros
    IF p_referrer_id IS NULL OR p_referred_id IS NULL THEN
        RAISE NOTICE 'Parâmetros inválidos';
        RETURN FALSE;
    END IF;
    
    -- Verificar se são usuários diferentes
    IF p_referrer_id = p_referred_id THEN
        RAISE NOTICE 'Não pode auto-referenciar';
        RETURN FALSE;
    END IF;
    
    -- Verificar se já foi processado
    SELECT COUNT(*) INTO v_existing_count
    FROM public.referrals 
    WHERE referrer_id = p_referrer_id AND referred_id = p_referred_id;
    
    IF v_existing_count > 0 THEN
        RAISE NOTICE 'Referência já existe, ignorando duplicata';
        RETURN TRUE;
    END IF;
    
    -- Criar carteira do referenciador se não existir
    INSERT INTO public.user_wallets (user_id, nudix_balance, total_earned)
    VALUES (p_referrer_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Criar carteira do referido se não existir
    INSERT INTO public.user_wallets (user_id, nudix_balance, total_earned)
    VALUES (p_referred_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Registrar a referência
    INSERT INTO public.referrals (referrer_id, referred_id, referred_email, status, bonus_amount, bonus_paid, completed_at)
    VALUES (p_referrer_id, p_referred_id, p_referred_email, 'completed', v_bonus, TRUE, NOW());
    
    RAISE NOTICE 'Referência registrada';
    
    -- Creditar bônus ao referenciador
    UPDATE public.user_wallets
    SET 
        nudix_balance = nudix_balance + v_bonus,
        total_earned = total_earned + v_bonus,
        updated_at = NOW()
    WHERE user_id = p_referrer_id;
    
    RAISE NOTICE 'Bônus creditado: N$ %', v_bonus;
    
    -- Registrar transação
    INSERT INTO public.wallet_transactions (user_id, amount, type, description, reference_id)
    VALUES (
        p_referrer_id, 
        v_bonus, 
        'referral_bonus', 
        'Bônus por indicação de novo usuário', 
        p_referred_id
    );
    
    RAISE NOTICE 'Transação registrada';
    RAISE NOTICE 'Referência processada com sucesso!';
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao processar referência: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Trigger automático quando referred_by é definido
CREATE OR REPLACE FUNCTION public.auto_process_referral()
RETURNS TRIGGER AS $$
BEGIN
    -- Só processa se referred_by foi definido e não era nulo antes
    IF NEW.referred_by IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.referred_by IS NULL)) THEN
        RAISE NOTICE 'Trigger auto_process_referral ativado para user %', NEW.id;
        PERFORM public.process_referral_completion(NEW.referred_by, NEW.id, NEW.email);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_referral ON public.profiles;
CREATE TRIGGER trigger_auto_referral
    AFTER INSERT OR UPDATE OF referred_by ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_process_referral();

-- 10. Habilitar RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para user_wallets
DROP POLICY IF EXISTS "user_wallets_select_own" ON public.user_wallets;
CREATE POLICY "user_wallets_select_own" ON public.user_wallets
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_wallets_update_own" ON public.user_wallets;
CREATE POLICY "user_wallets_update_own" ON public.user_wallets
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_wallets_insert_system" ON public.user_wallets;
CREATE POLICY "user_wallets_insert_system" ON public.user_wallets
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- 12. Políticas RLS para referrals
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals
    FOR SELECT TO authenticated
    USING (referrer_id = auth.uid() OR referred_id = auth.uid());

DROP POLICY IF EXISTS "referrals_insert_system" ON public.referrals;
CREATE POLICY "referrals_insert_system" ON public.referrals
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- 13. Políticas RLS para wallet_transactions
DROP POLICY IF EXISTS "wallet_transactions_select_own" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_select_own" ON public.wallet_transactions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet_transactions_insert_system" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_insert_system" ON public.wallet_transactions
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- 14. Criar carteiras para usuários existentes que não têm
INSERT INTO public.user_wallets (user_id, nudix_balance, total_earned)
SELECT id, 0, 0 FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 15. Índices para performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 16. Verificação final
DO $$
DECLARE
    v_profiles_with_code INTEGER;
    v_wallets INTEGER;
    v_referrals INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_profiles_with_code FROM profiles WHERE referral_code IS NOT NULL;
    SELECT COUNT(*) INTO v_wallets FROM user_wallets;
    SELECT COUNT(*) INTO v_referrals FROM referrals;
    
    RAISE NOTICE '✅ Sistema de referência configurado:';
    RAISE NOTICE '   - Perfis com código: %', v_profiles_with_code;
    RAISE NOTICE '   - Carteiras criadas: %', v_wallets;
    RAISE NOTICE '   - Referências registradas: %', v_referrals;
END $$;
