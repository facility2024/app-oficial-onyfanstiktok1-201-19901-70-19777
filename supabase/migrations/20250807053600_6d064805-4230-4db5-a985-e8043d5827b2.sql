-- Remover política de update restritiva e criar uma nova
DROP POLICY IF EXISTS "Allow public update models" ON public.models;

-- Criar nova política de UPDATE mais permissiva para permitir bloqueio/desbloqueio
CREATE POLICY "Allow public update models" 
ON public.models 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Garantir que a política de SELECT funcione corretamente
DROP POLICY IF EXISTS "Allow public read access to models" ON public.models;

CREATE POLICY "Allow public read access to models" 
ON public.models 
FOR SELECT 
USING (true);