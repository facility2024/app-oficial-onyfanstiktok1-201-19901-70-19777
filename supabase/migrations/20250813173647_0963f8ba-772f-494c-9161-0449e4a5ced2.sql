-- Create transactions table for real financial data
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'tip', 'content', 'private_message', 'gift')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'bank_transfer', 'boleto')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  external_transaction_id TEXT,
  gateway_provider TEXT,
  gateway_response JSONB,
  fees DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  processed_at TIMESTAMP WITH TIME ZONE,
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read transactions" 
ON public.transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_transactions_model_id ON public.transactions(model_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_transactions_payment_method ON public.transactions(payment_method);

-- Create trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample real-looking data
INSERT INTO public.transactions (
  customer_name, customer_email, transaction_type, amount, payment_method, status, processed_at, metadata
) VALUES 
('Isabella Santos', 'isabella.santos@email.com', 'subscription', 250.00, 'pix', 'completed', NOW() - INTERVAL '2 hours', '{"model_username": "bella_model", "subscription_tier": "premium"}'),
('Gabriela Silva', 'gabriela.silva@email.com', 'tip', 89.90, 'credit_card', 'completed', NOW() - INTERVAL '4 hours', '{"model_username": "gabi_model", "tip_message": "Adorei o show!"}'),
('Maria Oliveira', 'maria.oliveira@email.com', 'content', 150.00, 'pix', 'pending', NOW() - INTERVAL '5 hours', '{"model_username": "maria_model", "content_type": "private_video"}'),
('Ana Costa', 'ana.costa@email.com', 'subscription', 320.00, 'credit_card', 'completed', NOW() - INTERVAL '6 hours', '{"model_username": "ana_model", "subscription_tier": "vip"}'),
('Julia Ferreira', 'julia.ferreira@email.com', 'tip', 45.00, 'pix', 'completed', NOW() - INTERVAL '8 hours', '{"model_username": "julia_model", "tip_message": "Continue assim!"}'),
('Caroline Lima', 'caroline.lima@email.com', 'private_message', 75.00, 'credit_card', 'completed', NOW() - INTERVAL '10 hours', '{"model_username": "carol_model", "message_duration": "30min"}'),
('Beatriz Mendes', 'beatriz.mendes@email.com', 'gift', 180.00, 'pix', 'completed', NOW() - INTERVAL '12 hours', '{"model_username": "bia_model", "gift_type": "virtual_flowers"}'),
('Fernanda Costa', 'fernanda.costa@email.com', 'subscription', 280.00, 'boleto', 'completed', NOW() - INTERVAL '1 day', '{"model_username": "fer_model", "subscription_tier": "gold"}'),
('Patrícia Rocha', 'patricia.rocha@email.com', 'tip', 120.00, 'pix', 'completed', NOW() - INTERVAL '1 day', '{"model_username": "pat_model", "tip_message": "Obrigada por tudo!"}'),
('Larissa Alves', 'larissa.alves@email.com', 'content', 200.00, 'credit_card', 'completed', NOW() - INTERVAL '2 days', '{"model_username": "lari_model", "content_type": "exclusive_photos"}');

-- Update net_amount based on payment method fees
UPDATE public.transactions SET 
  fees = CASE 
    WHEN payment_method = 'pix' THEN amount * 0.02
    WHEN payment_method = 'credit_card' THEN amount * 0.035
    WHEN payment_method = 'debit_card' THEN amount * 0.025
    WHEN payment_method = 'bank_transfer' THEN amount * 0.015
    WHEN payment_method = 'boleto' THEN amount * 0.03
    ELSE 0
  END,
  net_amount = amount - (CASE 
    WHEN payment_method = 'pix' THEN amount * 0.02
    WHEN payment_method = 'credit_card' THEN amount * 0.035
    WHEN payment_method = 'debit_card' THEN amount * 0.025
    WHEN payment_method = 'bank_transfer' THEN amount * 0.015
    WHEN payment_method = 'boleto' THEN amount * 0.03
    ELSE 0
  END);