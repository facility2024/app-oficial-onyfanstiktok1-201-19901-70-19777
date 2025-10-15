-- Permitir inserção pública na tabela app_users para verificação de idade
DROP POLICY IF EXISTS "Public can insert app_users for age verification" ON public.app_users;

CREATE POLICY "Public can insert app_users for age verification"
ON public.app_users
FOR INSERT
WITH CHECK (true);

-- Também permitir leitura pública para o admin visualizar
DROP POLICY IF EXISTS "Public can read app_users" ON public.app_users;

CREATE POLICY "Public can read app_users"
ON public.app_users
FOR SELECT
USING (true);