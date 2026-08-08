-- Habilitar as extensões necessárias se não existirem
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover cron job existente se houver
SELECT cron.unschedule('process-scheduled-posts') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-posts'
);

-- Criar cron job para executar a cada minuto
SELECT cron.schedule(
    'process-scheduled-posts',
    '* * * * *', -- Todo minuto
    $$
    SELECT net.http_post(
        url := 'https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/process-scheduled-posts',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuenZod2FwZmhraHFqZ3lpb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjM5MzUsImV4cCI6MjA2OTQzOTkzNX0.mWv0UEbkeczgKUMRaDm94Azo3Olgu3-sOnkZ7kamWuM"}'::jsonb,
        body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
    $$
);

-- Criar tabela para agendamento_execucoes se não existir
CREATE TABLE IF NOT EXISTS public.agendamento_execucoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_agendado_id UUID NOT NULL,
    status_execucao TEXT NOT NULL CHECK (status_execucao IN ('executado', 'erro')),
    erro_mensagem TEXT,
    data_execucao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agendamento_execucoes ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Allow public read agendamento_execucoes" 
ON public.agendamento_execucoes 
FOR SELECT 
USING (true);

-- Política para permitir inserção pública
CREATE POLICY "Allow public insert agendamento_execucoes" 
ON public.agendamento_execucoes 
FOR INSERT 
WITH CHECK (true);