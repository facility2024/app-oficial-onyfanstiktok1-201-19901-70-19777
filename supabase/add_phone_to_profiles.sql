-- Adicionar campo phone na tabela profiles para vincular pagamentos via Hoopay
-- O Hoopay envia apenas o telefone do cliente, então precisamos dele para identificar o usuário

-- 1. Adicionar coluna phone na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Criar índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. Função para normalizar telefone (remove caracteres especiais)
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remove tudo que não é número
  RETURN regexp_replace(phone_input, '[^0-9]', '', 'g');
END;
$$;

-- 4. Criar índice funcional para busca por telefone normalizado
CREATE INDEX IF NOT EXISTS idx_profiles_phone_normalized 
ON public.profiles(public.normalize_phone(phone));

-- 5. Atualizar política RLS para permitir que usuários atualizem seu próprio phone
DROP POLICY IF EXISTS "Users can update own profile phone" ON public.profiles;
CREATE POLICY "Users can update own profile phone"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Permitir busca por telefone (service role já tem acesso total)
-- Adicionar política para que o webhook possa buscar por telefone
DROP POLICY IF EXISTS "Service role can search by phone" ON public.profiles;

COMMENT ON COLUMN public.profiles.phone IS 'Telefone do usuário para identificação de pagamentos Hoopay';
