-- Criar tabela posts_principais se ela não existir
CREATE TABLE IF NOT EXISTS public.posts_principais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL,
  modelo_username TEXT NOT NULL,
  titulo TEXT,
  descricao TEXT,
  conteudo_url TEXT,
  imagem_url TEXT,
  tipo_conteudo TEXT DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.posts_principais ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Allow public read posts_principais" 
ON public.posts_principais 
FOR SELECT 
USING (true);

-- Política para permitir inserção pública
CREATE POLICY "Allow public insert posts_principais" 
ON public.posts_principais 
FOR INSERT 
WITH CHECK (true);

-- Política para permitir deleção pública (para limpeza de posts)
CREATE POLICY "Allow public delete posts_principais" 
ON public.posts_principais 
FOR DELETE 
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_posts_principais_updated_at
BEFORE UPDATE ON public.posts_principais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();