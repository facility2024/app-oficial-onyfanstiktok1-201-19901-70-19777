-- Corrigir os últimos erros de RLS desabilitado

-- Habilitar RLS na tabela agendamento_execucoes
ALTER TABLE public.agendamento_execucoes ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela agent_messages
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;