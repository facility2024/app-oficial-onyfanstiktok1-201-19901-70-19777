-- Corrigir políticas RLS para visualizações aparecerem no painel admin

-- Criar política para permitir inserção de visualizações
CREATE POLICY "Public can insert video views" 
ON public.video_views 
FOR INSERT 
WITH CHECK (true);

-- Criar política para admins lerem visualizações
CREATE POLICY "Admins can read video views" 
ON public.video_views 
FOR SELECT 
USING (is_admin());

-- Verificar se a tabela shares existe e criar política se necessário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shares' AND table_schema = 'public') THEN
        -- Política para inserção pública de compartilhamentos
        EXECUTE 'CREATE POLICY "Public can insert shares" ON public.shares FOR INSERT WITH CHECK (true)';
        
        -- Política para admins lerem compartilhamentos
        EXECUTE 'CREATE POLICY "Admins can read shares" ON public.shares FOR SELECT USING (is_admin())';
    END IF;
END $$;

-- Verificar se a tabela model_followers existe e criar política se necessário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_followers' AND table_schema = 'public') THEN
        -- Política para inserção pública de seguidores
        EXECUTE 'CREATE POLICY "Public can insert model followers" ON public.model_followers FOR INSERT WITH CHECK (true)';
        
        -- Política para admins lerem seguidores
        EXECUTE 'CREATE POLICY "Admins can read model followers" ON public.model_followers FOR SELECT USING (is_admin())';
    END IF;
END $$;