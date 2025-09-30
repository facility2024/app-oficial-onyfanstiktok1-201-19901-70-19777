-- Criar usuário admin
-- Primeiro, vamos inserir o usuário na tabela auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'otaviogcasartelli@gmail.com',
  crypt('Otavio1020@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Criar tabela de perfis se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  name text,
  role text DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura dos perfis
CREATE POLICY "public_read_profiles" ON public.profiles
  FOR SELECT
  USING (true);

-- Política para permitir que usuários atualizem seus próprios perfis
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Inserir perfil admin
INSERT INTO public.profiles (id, email, name, role)
SELECT 
  id,
  'otaviogcasartelli@gmail.com',
  'Otavio Admin',
  'admin'
FROM auth.users 
WHERE email = 'otaviogcasartelli@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  name = 'Otavio Admin';

-- Criar função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;