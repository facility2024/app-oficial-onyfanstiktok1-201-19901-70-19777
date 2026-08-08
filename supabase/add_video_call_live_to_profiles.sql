-- Adicionar campos de Vídeo Chamada e Live ao perfil dos criadores
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS video_call_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_call_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS live_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS live_url TEXT DEFAULT '';
