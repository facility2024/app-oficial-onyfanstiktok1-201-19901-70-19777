-- =====================================================
-- CORREÇÃO DE TRIGGERS DE CADASTRO
-- Resolve: "Database error saving new user"
-- =====================================================

-- 1. Corrigir trigger handle_new_user com tratamento de erro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir perfil com ON CONFLICT para evitar duplicatas
    INSERT INTO public.profiles (id, email, username, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log do erro mas NÃO bloqueia cadastro
    RAISE WARNING 'Erro ao criar perfil para user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Corrigir trigger create_wallet_for_user com tratamento de erro
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_wallets (user_id) 
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Não bloqueia cadastro se tabela não existir ou outro erro
    RAISE WARNING 'Erro ao criar carteira para user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recriar triggers (se não existirem)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_create_wallet ON auth.users;
CREATE TRIGGER trigger_create_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();

-- 4. Verificar estrutura (debug)
DO $$
BEGIN
    RAISE NOTICE 'Triggers atualizados com sucesso!';
END $$;
