-- Add capability configuration fields to model_chat_panels table
ALTER TABLE public.model_chat_panels
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS custom_link TEXT;

COMMENT ON COLUMN public.model_chat_panels.audio_url IS 'URL do áudio MP3 para envio quando can_send_audio está ativo';
COMMENT ON COLUMN public.model_chat_panels.image_url IS 'URL da imagem para envio quando can_send_images está ativo';
COMMENT ON COLUMN public.model_chat_panels.whatsapp_number IS 'Número do WhatsApp para envio quando can_send_links está ativo';
COMMENT ON COLUMN public.model_chat_panels.custom_link IS 'Link customizado para envio quando can_send_links está ativo';
