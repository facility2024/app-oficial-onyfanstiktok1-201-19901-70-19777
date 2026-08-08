-- Create sales table for tracking sales data
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sale_value DECIMAL(10,2) NOT NULL,
  customer_id UUID,
  customer_name TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow public insert sales" ON public.sales FOR INSERT WITH CHECK (true);

-- Create premium members table for tracking premium signups
CREATE TABLE IF NOT EXISTS public.premium_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  plan_type TEXT DEFAULT 'premium',
  monthly_fee DECIMAL(10,2) DEFAULT 29.90,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.premium_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read premium_members" ON public.premium_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert premium_members" ON public.premium_members FOR INSERT WITH CHECK (true);

-- Insert sample data for demonstration
INSERT INTO public.sales (model_id, model_name, product_name, sale_value, customer_name) VALUES
(gen_random_uuid(), 'Ana Silva', 'Conteúdo Premium Mensal', 49.90, 'Cliente Premium 1'),
(gen_random_uuid(), 'Maria Santos', 'Pack Especial VIP', 79.90, 'Cliente VIP 1'),
(gen_random_uuid(), 'Julia Costa', 'Assinatura Anual', 299.90, 'Cliente Anual 1'),
(gen_random_uuid(), 'Carla Oliveira', 'Conteúdo Exclusivo', 39.90, 'Cliente Exclusivo 1'),
(gen_random_uuid(), 'Beatriz Lima', 'Pack Deluxe', 99.90, 'Cliente Deluxe 1');

INSERT INTO public.premium_members (user_id, user_name, user_email, plan_type, monthly_fee) VALUES
(gen_random_uuid(), 'João Premium', 'joao@premium.com', 'Premium Gold', 29.90),
(gen_random_uuid(), 'Maria Premium', 'maria@premium.com', 'Premium Silver', 19.90),
(gen_random_uuid(), 'Pedro Premium', 'pedro@premium.com', 'Premium Platinum', 49.90),
(gen_random_uuid(), 'Ana Premium', 'ana@premium.com', 'Premium Gold', 29.90);