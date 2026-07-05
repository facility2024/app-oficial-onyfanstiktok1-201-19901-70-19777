
-- Adicionar policies de SELECT em public.profiles
-- Owner lê o próprio perfil
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admin lê todos
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Leitura pública de campos básicos (necessária para feed/busca já usarem profiles)
CREATE POLICY "profiles_select_public"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Garantir GRANTs para o PostgREST
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
