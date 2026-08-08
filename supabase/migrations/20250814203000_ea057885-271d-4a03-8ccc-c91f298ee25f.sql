-- Corrigir políticas RLS da tabela comments para permitir inserção de comentários

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Habilitar RLS na tabela comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer usuário visualize comentários
CREATE POLICY "Anyone can view comments" 
ON public.comments 
FOR SELECT 
USING (true);

-- Permitir que qualquer usuário insira comentários (mesmo anônimos)
CREATE POLICY "Anyone can insert comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (true);

-- Se existir a coluna user_id, permitir que usuários editem seus próprios comentários
-- (caso contrário, comentários são somente leitura após inserção)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        -- Permitir que usuários editem seus próprios comentários
        EXECUTE 'CREATE POLICY "Users can update own comments" 
                 ON public.comments 
                 FOR UPDATE 
                 USING (user_id = current_setting(''app.current_user_id'', true)::uuid)';
        
        -- Permitir que usuários deletem seus próprios comentários  
        EXECUTE 'CREATE POLICY "Users can delete own comments"
                 ON public.comments 
                 FOR DELETE 
                 USING (user_id = current_setting(''app.current_user_id'', true)::uuid)';
    END IF;
END $$;