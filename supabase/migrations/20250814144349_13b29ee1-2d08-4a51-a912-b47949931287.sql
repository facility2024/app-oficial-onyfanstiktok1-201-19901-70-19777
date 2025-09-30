-- Criar tabela para gerenciar pagamentos PIX
CREATE TABLE public.pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 19.99,
  pix_code TEXT NOT NULL,
  txid TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar tabela para usuários premium
CREATE TABLE public.premium_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  subscription_type TEXT NOT NULL DEFAULT 'monthly',
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  subscription_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  subscription_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  payment_id UUID REFERENCES public.pix_payments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar tabela para notificações
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para pix_payments
CREATE POLICY "Users can view own payments" ON public.pix_payments
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage payments" ON public.pix_payments
FOR ALL USING (true);

-- Políticas para premium_users  
CREATE POLICY "Users can view own premium status" ON public.premium_users
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage premium users" ON public.premium_users
FOR ALL USING (true);

-- Políticas para user_notifications
CREATE POLICY "Anyone can read notifications" ON public.user_notifications
FOR SELECT USING (true);

CREATE POLICY "Edge functions can manage notifications" ON public.user_notifications
FOR ALL USING (true);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_pix_payments_updated_at
    BEFORE UPDATE ON public.pix_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_premium_users_updated_at
    BEFORE UPDATE ON public.premium_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();