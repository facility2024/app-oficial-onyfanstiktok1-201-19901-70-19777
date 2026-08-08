
-- 1) Restringir leitura pública de profiles: remover exposição para 'anon'
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 2) Remover coluna 'senha' da tabela legada 'usuarios' (nenhum código a utiliza)
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS senha;
