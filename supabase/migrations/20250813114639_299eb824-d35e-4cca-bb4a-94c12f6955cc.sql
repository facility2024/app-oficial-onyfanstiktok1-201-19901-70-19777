-- Verificar e corrigir tabela posts_agendados
DROP TABLE IF EXISTS public.posts_agendados CASCADE;

CREATE TABLE public.posts_agendados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  modelo_username TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  conteudo_url TEXT NOT NULL,
  tipo_conteudo TEXT NOT NULL DEFAULT 'image',
  data_agendamento TIMESTAMP WITH TIME ZONE NOT NULL,
  data_publicacao TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'publicado', 'cancelado', 'erro')),
  enviar_tela_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts_agendados ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can manage scheduled posts" 
ON public.posts_agendados 
FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Create policy for public read of published posts
CREATE POLICY "Public can read published posts" 
ON public.posts_agendados 
FOR SELECT 
USING (status = 'publicado');

-- Create trigger for updated_at
CREATE TRIGGER update_posts_agendados_updated_at
BEFORE UPDATE ON public.posts_agendados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_posts_agendados_modelo_id ON public.posts_agendados(modelo_id);
CREATE INDEX idx_posts_agendados_data_agendamento ON public.posts_agendados(data_agendamento);
CREATE INDEX idx_posts_agendados_status ON public.posts_agendados(status);

-- Create table for scheduled job executions
CREATE TABLE IF NOT EXISTS public.agendamento_execucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_agendado_id UUID NOT NULL REFERENCES public.posts_agendados(id) ON DELETE CASCADE,
  data_execucao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status_execucao TEXT NOT NULL DEFAULT 'pendente' CHECK (status_execucao IN ('pendente', 'executado', 'erro', 'cancelado')),
  erro_mensagem TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for executions
ALTER TABLE public.agendamento_execucoes ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access to executions
CREATE POLICY "Admin can manage executions" 
ON public.agendamento_execucoes 
FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Create function to schedule post execution
CREATE OR REPLACE FUNCTION public.processar_posts_agendados()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_record RECORD;
  resultado TEXT := '';
BEGIN
  -- Find posts scheduled for now or past
  FOR post_record IN 
    SELECT * FROM public.posts_agendados 
    WHERE status = 'agendado' 
    AND data_agendamento <= now()
    ORDER BY data_agendamento ASC
  LOOP
    -- Update post status to published
    UPDATE public.posts_agendados 
    SET 
      status = 'publicado',
      data_publicacao = now(),
      updated_at = now()
    WHERE id = post_record.id;
    
    -- Record execution
    INSERT INTO public.agendamento_execucoes (
      post_agendado_id,
      status_execucao
    ) VALUES (
      post_record.id,
      'executado'
    );
    
    resultado := resultado || 'Post ' || post_record.titulo || ' publicado. ';
  END LOOP;
  
  IF resultado = '' THEN
    resultado := 'Nenhum post agendado para publicar no momento.';
  END IF;
  
  RETURN resultado;
END;
$$;