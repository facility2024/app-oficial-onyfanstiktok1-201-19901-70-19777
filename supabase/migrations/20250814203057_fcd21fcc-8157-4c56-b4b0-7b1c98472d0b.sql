-- Corrigir definitivamente as políticas RLS da tabela comments

-- Remover TODAS as políticas existentes da tabela comments
DROP POLICY IF EXISTS "comments_admin_only_manage" ON public.comments;
DROP POLICY IF EXISTS "comments_admin_only_view" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Garantir que RLS está habilitado
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Política para permitir visualização pública de comentários
CREATE POLICY "Public can view comments" 
ON public.comments 
FOR SELECT 
USING (true);

-- Política para permitir inserção pública de comentários
CREATE POLICY "Public can insert comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (true);

-- Política para admins gerenciarem tudo
CREATE POLICY "Admins can manage all comments" 
ON public.comments 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());