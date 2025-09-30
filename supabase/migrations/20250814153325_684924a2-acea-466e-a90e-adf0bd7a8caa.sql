-- Fix critical security vulnerabilities by enabling RLS and creating proper policies

-- Enable RLS on premium_access table if not already enabled
ALTER TABLE public.premium_access ENABLE ROW LEVEL SECURITY;

-- Enable RLS on other vulnerable tables
ALTER TABLE public.gamification_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Premium Access Table Policies
DROP POLICY IF EXISTS "Users can only view their own premium access" ON public.premium_access;
DROP POLICY IF EXISTS "Admins can view all premium access" ON public.premium_access;

CREATE POLICY "Users can only view their own premium access" 
ON public.premium_access 
FOR SELECT 
TO authenticated 
USING (auth.uid()::text = user_id::text OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all premium access" 
ON public.premium_access 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Users can insert their own premium access" 
ON public.premium_access 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id::text OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their own premium access" 
ON public.premium_access 
FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id::text OR email = (auth.jwt() ->> 'email'));

-- Model Messages Table Policies
DROP POLICY IF EXISTS "Users can only see their own messages" ON public.model_messages;
DROP POLICY IF EXISTS "Models can see messages sent to them" ON public.model_messages;

CREATE POLICY "Users can only see their own messages" 
ON public.model_messages 
FOR SELECT 
TO authenticated 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" 
ON public.model_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" 
ON public.model_messages 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = sender_id);

-- PIX Payments Table Policies
DROP POLICY IF EXISTS "Users can only view their own payments" ON public.pix_payments;

CREATE POLICY "Users can only view their own payments" 
ON public.pix_payments 
FOR SELECT 
TO authenticated 
USING (auth.uid()::text = user_id::text OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all payments" 
ON public.pix_payments 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Users can create their own payments" 
ON public.pix_payments 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id::text OR email = (auth.jwt() ->> 'email'));

-- Transactions Table Policies
DROP POLICY IF EXISTS "Users can only view their own transactions" ON public.transactions;

CREATE POLICY "Users can only view their own transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (auth.uid()::text = user_id::text OR email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id::text OR email = (auth.jwt() ->> 'email'));

-- Remove overly permissive public policies if they exist
DROP POLICY IF EXISTS "Allow public read access to premium_access" ON public.premium_access;
DROP POLICY IF EXISTS "Allow public insert premium_access" ON public.premium_access;
DROP POLICY IF EXISTS "Allow public read access to gamification_users" ON public.gamification_users;
DROP POLICY IF EXISTS "Allow public read access to model_messages" ON public.model_messages;
DROP POLICY IF EXISTS "Allow public read access to pix_payments" ON public.pix_payments;
DROP POLICY IF EXISTS "Allow public read access to transactions" ON public.transactions;