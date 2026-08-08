-- Criar políticas RLS para permitir acesso público aos dados essenciais
-- Videos: acesso público para leitura
CREATE POLICY "Allow public read access to videos"
ON public.videos
FOR SELECT
USING (is_active = true);

-- Models: acesso público para leitura
CREATE POLICY "Allow public read access to models"
ON public.models
FOR SELECT
USING (is_active = true);

-- Comments: acesso público para leitura e inserção
CREATE POLICY "Allow public read access to comments"
ON public.comments
FOR SELECT
USING (is_active = true);

CREATE POLICY "Allow public insert comments"
ON public.comments
FOR INSERT
WITH CHECK (true);

-- Likes: acesso público para leitura e inserção
CREATE POLICY "Allow public read access to likes"
ON public.likes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Allow public insert likes"
ON public.likes
FOR INSERT
WITH CHECK (true);

-- Shares: acesso público para leitura e inserção
CREATE POLICY "Allow public read access to shares"
ON public.shares
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert shares"
ON public.shares
FOR INSERT
WITH CHECK (true);