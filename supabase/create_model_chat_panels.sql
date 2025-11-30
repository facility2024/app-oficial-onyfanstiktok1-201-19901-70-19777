-- =====================================================
-- CRIAR TABELA model_chat_panels
-- =====================================================
-- Painel de configuração de chat IA para cada modelo

CREATE TABLE IF NOT EXISTS public.model_chat_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  
  -- Configurações básicas
  is_active boolean DEFAULT false,
  is_online boolean DEFAULT false,
  
  -- Configurações de IA
  ai_provider text CHECK (ai_provider IN ('gemini', 'openai')),
  api_key_encrypted text,
  prompt text,
  
  -- Saudação inicial
  greeting_message text,
  greeting_image_url text,
  
  -- Delays e limites
  message_delay_seconds integer DEFAULT 1,
  
  -- Capacidades habilitadas
  can_read_images boolean DEFAULT false,
  can_send_audio boolean DEFAULT false,
  can_send_images boolean DEFAULT false,
  can_send_links boolean DEFAULT true,
  
  -- Metadados
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices
CREATE INDEX idx_model_chat_panels_model_id ON public.model_chat_panels(model_id);
CREATE INDEX idx_model_chat_panels_is_active ON public.model_chat_panels(is_active);

-- Garantir um único painel por modelo
CREATE UNIQUE INDEX idx_model_chat_panels_unique_model ON public.model_chat_panels(model_id);

-- Habilitar RLS
ALTER TABLE public.model_chat_panels ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Apenas admins podem gerenciar
CREATE POLICY "model_chat_panels_admin_all"
ON public.model_chat_panels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS: Usuários autenticados podem visualizar painéis ativos
CREATE POLICY "model_chat_panels_public_read"
ON public.model_chat_panels
FOR SELECT
TO authenticated
USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_model_chat_panels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_model_chat_panels_updated_at
BEFORE UPDATE ON public.model_chat_panels
FOR EACH ROW
EXECUTE FUNCTION update_model_chat_panels_updated_at();

-- =====================================================
-- ✅ TABELA model_chat_panels CRIADA
-- =====================================================
