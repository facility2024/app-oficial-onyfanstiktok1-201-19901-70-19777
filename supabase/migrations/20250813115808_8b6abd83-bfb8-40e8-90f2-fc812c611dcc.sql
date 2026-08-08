-- Create table for main screen posts
CREATE TABLE IF NOT EXISTS public.posts_principais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  modelo_username TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  conteudo_url TEXT NOT NULL,
  tipo_conteudo TEXT NOT NULL DEFAULT 'image',
  post_agendado_id UUID REFERENCES public.posts_agendados(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts_principais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can read active main posts" 
ON public.posts_principais 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin can manage main posts" 
ON public.posts_principais 
FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_posts_principais_updated_at
BEFORE UPDATE ON public.posts_principais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_posts_principais_modelo_id ON public.posts_principais(modelo_id);
CREATE INDEX idx_posts_principais_is_active ON public.posts_principais(is_active);
CREATE INDEX idx_posts_principais_created_at ON public.posts_principais(created_at DESC);

-- Enable pg_cron extension for scheduled processing
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the processing function to run every minute
SELECT cron.schedule(
  'process-scheduled-posts',
  '* * * * *', -- every minute
  $$
  SELECT net.http_post(
      url:='https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/process-scheduled-posts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuenZod2FwZmhraHFqZ3lpb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg2MzkzNSwiZXhwIjoyMDY5NDM5OTM1fQ.1mvajWvHgkGqZx4LvvV8y6qMHiuTDo--JCa0sI5fHo8"}'::jsonb,
      body:=concat('{"timestamp": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Update configuration file permissions
ALTER TABLE public.posts_agendados ENABLE ROW LEVEL SECURITY;