-- ============================================
-- PARTE 1: Criar tabela de categorias
-- ============================================

CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categorias
CREATE POLICY "Categories são públicas para leitura" 
ON public.marketplace_categories FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "Admins podem gerenciar categorias - SELECT" 
ON public.marketplace_categories FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar categorias - INSERT" 
ON public.marketplace_categories FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar categorias - UPDATE" 
ON public.marketplace_categories FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar categorias - DELETE" 
ON public.marketplace_categories FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PARTE 2: Corrigir RLS de marketplace_products
-- ============================================

-- Garantir que RLS está habilitado
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins podem deletar produtos" ON public.marketplace_products;
DROP POLICY IF EXISTS "Admins podem atualizar produtos" ON public.marketplace_products;
DROP POLICY IF EXISTS "Admins podem criar produtos" ON public.marketplace_products;
DROP POLICY IF EXISTS "Produtos ativos são públicos" ON public.marketplace_products;
DROP POLICY IF EXISTS "public_read_active" ON public.marketplace_products;
DROP POLICY IF EXISTS "admin_all_access" ON public.marketplace_products;

-- Política de SELECT pública (todos podem ver produtos ativos)
CREATE POLICY "Produtos ativos são públicos - SELECT"
ON public.marketplace_products FOR SELECT 
TO authenticated, anon
USING (is_active = true);

-- Política de SELECT para admins (podem ver todos)
CREATE POLICY "Admins podem ver todos produtos - SELECT"
ON public.marketplace_products FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Política de INSERT para admins
CREATE POLICY "Admins podem criar produtos - INSERT"
ON public.marketplace_products FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política de UPDATE para admins
CREATE POLICY "Admins podem atualizar produtos - UPDATE"
ON public.marketplace_products FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política de DELETE para admins
CREATE POLICY "Admins podem deletar produtos - DELETE"
ON public.marketplace_products FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PARTE 3: Inserir categorias padrão
-- ============================================

INSERT INTO public.marketplace_categories (name, description, icon, order_index) VALUES
  ('Roupas', 'Vestuário e moda', '👗', 1),
  ('Eletrônicos', 'Dispositivos e tecnologia', '📱', 2),
  ('Acessórios', 'Complementos e detalhes', '👜', 3),
  ('Cosméticos', 'Beleza e cuidados pessoais', '💄', 4),
  ('Calçados', 'Sapatos e tênis', '👟', 5),
  ('Joias', 'Bijuterias e joalheria', '💍', 6),
  ('Esportes', 'Fitness e atividades físicas', '⚽', 7),
  ('Casa', 'Decoração e utilidades', '🏠', 8),
  ('Cornos', 'Conteúdo de cornos', '🐂', 9),
  ('Novinas', 'Conteúdo de novinas', '🌸', 10),
  ('Coroas', 'Conteúdo de coroas', '👑', 11),
  ('Gordinhas', 'Conteúdo de gordinhas', '🍒', 12),
  ('Bombadas', 'Conteúdo de bombadas', '💪', 13),
  ('Trisal', 'Conteúdo de trisal', '💞', 14),
  ('Swing', 'Conteúdo de swing', '🔄', 15)
ON CONFLICT (name) DO NOTHING;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela marketplace_categories criada com sucesso!';
  RAISE NOTICE '✅ Políticas RLS de marketplace_products corrigidas!';
  RAISE NOTICE '✅ Categorias padrão inseridas!';
END $$;
