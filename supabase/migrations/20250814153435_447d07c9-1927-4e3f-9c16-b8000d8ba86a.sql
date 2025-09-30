-- Fix critical security vulnerabilities by enabling RLS and creating proper policies

-- Enable RLS on vulnerable tables
ALTER TABLE public.premium_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing public policies that are too permissive
DROP POLICY IF EXISTS "Allow public insert premium_access" ON public.premium_access;
DROP POLICY IF EXISTS "Allow public read premium_access" ON public.premium_access;
DROP POLICY IF EXISTS "Allow public insert gamification_users" ON public.gamification_users;
DROP POLICY IF EXISTS "Allow public read gamification_users" ON public.gamification_users;
DROP POLICY IF EXISTS "Allow public update gamification_users" ON public.gamification_users;
DROP POLICY IF EXISTS "Allow public insert model_messages" ON public.model_messages;
DROP POLICY IF EXISTS "Allow public read model_messages" ON public.model_messages;
DROP POLICY IF EXISTS "Allow public insert pix_payments" ON public.pix_payments;
DROP POLICY IF EXISTS "Allow public read pix_payments" ON public.pix_payments;
DROP POLICY IF EXISTS "Allow public insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow public read transactions" ON public.transactions;

-- Premium Access Table Policies (contains sensitive customer data)
CREATE POLICY "Users can only view their own premium access" 
ON public.premium_access 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all premium access" 
ON public.premium_access 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Users can insert their own premium access" 
ON public.premium_access 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their own premium access" 
ON public.premium_access 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

-- Gamification Users Table Policies (contains email and names)
CREATE POLICY "Users can view their own gamification profile" 
ON public.gamification_users 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all gamification users" 
ON public.gamification_users 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Users can insert their own gamification profile" 
ON public.gamification_users 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their own gamification profile" 
ON public.gamification_users 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR email = (auth.jwt() ->> 'email'));

-- Model Messages Table Policies (contains private conversations)
CREATE POLICY "Users can only see messages they are involved in" 
ON public.model_messages 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Models can see messages sent to them" 
ON public.model_messages 
FOR SELECT 
TO authenticated 
USING (auth.uid() = model_id);

CREATE POLICY "Admins can view all messages" 
ON public.model_messages 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Users can send messages" 
ON public.model_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- PIX Payments Table Policies (contains financial data)
CREATE POLICY "Users can only view their own payments" 
ON public.pix_payments 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all payments" 
ON public.pix_payments 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Users can create their own payments" 
ON public.pix_payments 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their own payments" 
ON public.pix_payments 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

-- Transactions Table Policies (contains financial data, no direct user_id link)
-- Only admins can see transactions since they don't have user_id field
CREATE POLICY "Only admins can view transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Only admins can insert transactions" 
ON public.transactions 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update transactions" 
ON public.transactions 
FOR UPDATE 
TO authenticated 
USING (public.is_admin());

-- Allow system/service account access for payment processing (for specific operations)
CREATE POLICY "Service accounts can manage transactions" 
ON public.transactions 
FOR ALL 
TO service_role;