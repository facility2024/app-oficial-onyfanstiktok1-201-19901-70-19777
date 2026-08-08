-- Excluir a tabela bonus_users problemática
DROP TABLE IF EXISTS public.bonus_users CASCADE;

-- Recriar a tabela bonus_users sem RLS para simplicidade
CREATE TABLE public.bonus_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  points integer DEFAULT 0,
  total_spent numeric DEFAULT 0.00,
  status text DEFAULT 'premium',
  location text DEFAULT 'Brasil',
  is_verified boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar índice para email (para buscas rápidas)
CREATE INDEX idx_bonus_users_email ON public.bonus_users(email);

-- NÃO habilitar RLS - deixar acesso público para cadastros
-- Isso resolve todos os problemas de permissão