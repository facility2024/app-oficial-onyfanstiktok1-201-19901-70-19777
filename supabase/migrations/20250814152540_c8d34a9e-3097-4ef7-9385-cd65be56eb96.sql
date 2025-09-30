-- Fix security vulnerability in bonus_users table
-- Remove the overly permissive "Anyone can read bonus users" policy
DROP POLICY IF EXISTS "Anyone can read bonus users" ON public.bonus_users;

-- Create secure RLS policies for bonus_users table
-- Users can only view their own data
CREATE POLICY "Users can view own bonus data" 
ON public.bonus_users 
FOR SELECT 
USING (auth.uid()::text = id::text OR email = auth.jwt() ->> 'email');

-- Admins can view all bonus users (for admin dashboard)
CREATE POLICY "Admins can view all bonus users" 
ON public.bonus_users 
FOR SELECT 
USING (is_admin());

-- Allow public registration (needed for the registration flow)
-- But limit to essential fields only via application logic
CREATE POLICY "Allow registration of new bonus users" 
ON public.bonus_users 
FOR INSERT 
WITH CHECK (true);

-- Ensure admins can still update bonus users
-- Keep existing admin update policy as it's already secure