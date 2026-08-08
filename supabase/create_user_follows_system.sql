-- =====================================================
-- SISTEMA DE FOLLOW PARA CRIADORES DE CONTEÚDO
-- Tabela: user_follows + Trigger para followers_count
-- =====================================================

-- 1️⃣ CRIAR TABELA user_follows
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL, -- ID do usuário que está seguindo (pode ser anônimo)
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- ID do criador sendo seguido
  follower_name TEXT NOT NULL,
  follower_email TEXT NOT NULL,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(follower_id, following_id)
);

-- 2️⃣ ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_active ON public.user_follows(is_active);

-- 3️⃣ ENABLE RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- 4️⃣ POLÍTICAS RLS (Permitir qualquer usuário seguir)
DROP POLICY IF EXISTS "Anyone can follow users" ON public.user_follows;
CREATE POLICY "Anyone can follow users" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
CREATE POLICY "Anyone can view follows" 
ON public.user_follows 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Anyone can update follows" ON public.user_follows;
CREATE POLICY "Anyone can update follows" 
ON public.user_follows 
FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Anyone can delete follows" ON public.user_follows;
CREATE POLICY "Anyone can delete follows" 
ON public.user_follows 
FOR DELETE 
USING (true);

-- 5️⃣ ADICIONAR CAMPO followers_count NA TABELA profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;

-- 6️⃣ TRIGGER PARA ATUALIZAR followers_count AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.update_user_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        -- Novo follow ativo
        UPDATE public.profiles 
        SET followers_count = followers_count + 1 
        WHERE id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Toggle de follow
        IF OLD.is_active = false AND NEW.is_active = true THEN
            -- Reativou follow
            UPDATE public.profiles 
            SET followers_count = followers_count + 1 
            WHERE id = NEW.following_id;
        ELSIF OLD.is_active = true AND NEW.is_active = false THEN
            -- Desativou follow
            UPDATE public.profiles 
            SET followers_count = followers_count - 1 
            WHERE id = NEW.following_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Removeu follow
        IF OLD.is_active = true THEN
            UPDATE public.profiles 
            SET followers_count = followers_count - 1 
            WHERE id = OLD.following_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_followers_count_trigger ON public.user_follows;
CREATE TRIGGER update_user_followers_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_follows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_followers_count();

-- 7️⃣ VERIFICAÇÃO
SELECT 
  'user_follows table' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_follows';

SELECT 
  'followers_count column' as check_type,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'followers_count';

-- ✅ RESULTADO ESPERADO: Ambos devem retornar count = 1
