-- Corrigir políticas RLS para todas as tabelas relacionadas ao sistema de usuário

-- Política para permitir inserção na tabela user_sessions
CREATE POLICY "Public can insert user sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir seleção na tabela user_sessions 
CREATE POLICY "Public can read user sessions" 
ON public.user_sessions 
FOR SELECT 
USING (true);

-- Política para permitir atualização na tabela user_sessions
CREATE POLICY "Public can update user sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (true);

-- Verificar se existe tabela bonus_users e permitir inserção
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_users' AND table_schema = 'public') THEN
        -- Política para inserção pública
        EXECUTE 'CREATE POLICY "Public can insert bonus users" ON public.bonus_users FOR INSERT WITH CHECK (true)';
        
        -- Política para leitura pública
        EXECUTE 'CREATE POLICY "Public can read bonus users" ON public.bonus_users FOR SELECT USING (true)';
        
        -- Política para atualização pública
        EXECUTE 'CREATE POLICY "Public can update bonus users" ON public.bonus_users FOR UPDATE USING (true)';
    END IF;
END $$;

-- Verificar se existe tabela gamification_users e permitir operações
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gamification_users' AND table_schema = 'public') THEN
        -- Política para inserção pública
        EXECUTE 'CREATE POLICY "Public can insert gamification users" ON public.gamification_users FOR INSERT WITH CHECK (true)';
        
        -- Política para leitura pública  
        EXECUTE 'CREATE POLICY "Public can read gamification users" ON public.gamification_users FOR SELECT USING (true)';
        
        -- Política para atualização pública
        EXECUTE 'CREATE POLICY "Public can update gamification users" ON public.gamification_users FOR UPDATE USING (true)';
    END IF;
END $$;