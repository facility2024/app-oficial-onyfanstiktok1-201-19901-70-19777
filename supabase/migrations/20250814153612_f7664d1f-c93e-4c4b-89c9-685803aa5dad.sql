-- CRITICAL SECURITY FIX: Remove dangerous public access policies that expose customer data

-- Fix premium_access table - Remove public access to customer personal information
DROP POLICY IF EXISTS "Allow public read premium access" ON public.premium_access;
DROP POLICY IF EXISTS "Allow public insert premium access" ON public.premium_access;

-- Fix premium_members table - Remove public access to premium member data  
DROP POLICY IF EXISTS "Allow public read premium_members" ON public.premium_members;
DROP POLICY IF EXISTS "Allow public insert premium_members" ON public.premium_members;

-- Fix model_messages table - Remove public access to private messages
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON public.model_messages;
DROP POLICY IF EXISTS "Anyone can insert profile messages" ON public.model_messages;

-- Fix pix_payments table - Remove dangerous public access to payment data
DROP POLICY IF EXISTS "Edge functions can manage payments" ON public.pix_payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.pix_payments;

-- Create secure edge function access for payments (service_role only)
CREATE POLICY "Service role can manage payments" ON public.pix_payments
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Create secure policy for premium_members registration (authenticated users only)
CREATE POLICY "Authenticated users can register as premium members" ON public.premium_members
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own premium membership" ON public.premium_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all premium members" ON public.premium_members
FOR SELECT TO authenticated
USING (is_admin());