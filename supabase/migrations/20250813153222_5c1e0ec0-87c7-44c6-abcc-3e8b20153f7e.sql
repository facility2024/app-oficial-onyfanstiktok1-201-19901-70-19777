-- Criar tabela para usuários cadastrados no formulário
CREATE TABLE public.bonus_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  points INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'standard' CHECK (status IN ('standard', 'premium')),
  is_verified BOOLEAN DEFAULT false,
  location TEXT DEFAULT 'Brasil',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bonus_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can insert bonus users" ON public.bonus_users
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read bonus users" ON public.bonus_users
FOR SELECT USING (true);

CREATE POLICY "Admins can update bonus users" ON public.bonus_users
FOR UPDATE USING (is_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bonus_users_updated_at
  BEFORE UPDATE ON public.bonus_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para ações diárias dos usuários bonus
CREATE TABLE public.bonus_user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_user_id UUID REFERENCES public.bonus_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('like', 'comment', 'share')),
  video_id UUID,
  model_id UUID,
  points_earned INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para bonus_user_actions
ALTER TABLE public.bonus_user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert bonus user actions" ON public.bonus_user_actions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read bonus user actions" ON public.bonus_user_actions
FOR SELECT USING (true);

-- Função para validar email Gmail
CREATE OR REPLACE FUNCTION public.validate_gmail(email_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se termina com @gmail.com (case insensitive)
  RETURN LOWER(email_input) LIKE '%@gmail.com';
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar pontos do usuário bonus
CREATE OR REPLACE FUNCTION public.update_bonus_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar pontos totais do usuário
  UPDATE public.bonus_users 
  SET 
    points = points + NEW.points_earned,
    total_spent = total_spent + (NEW.points_earned * 0.50), -- Cada ponto vale R$ 0,50
    updated_at = now()
  WHERE id = NEW.bonus_user_id;
  
  -- Atualizar status para premium se tiver mais de 50 pontos
  UPDATE public.bonus_users 
  SET status = 'premium' 
  WHERE id = NEW.bonus_user_id AND points >= 50;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar pontos automaticamente
CREATE TRIGGER update_bonus_points_trigger
  AFTER INSERT ON public.bonus_user_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bonus_user_points();