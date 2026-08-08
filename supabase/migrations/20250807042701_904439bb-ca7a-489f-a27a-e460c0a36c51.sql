-- Adicionar políticas de INSERT para a tabela models
CREATE POLICY "Allow public insert models" 
ON public.models 
FOR INSERT 
WITH CHECK (true);

-- Adicionar políticas de UPDATE para a tabela models
CREATE POLICY "Allow public update models" 
ON public.models 
FOR UPDATE 
USING (true);

-- Verificar se a tabela videos também precisa de políticas de INSERT
CREATE POLICY "Allow public insert videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (true);

-- Verificar se a tabela videos também precisa de políticas de UPDATE  
CREATE POLICY "Allow public update videos" 
ON public.videos 
FOR UPDATE 
USING (true);