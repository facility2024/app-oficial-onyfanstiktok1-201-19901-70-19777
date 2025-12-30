-- Fix RLS policies for premium_users table - V3
-- Corrige problema de comparação de email case-insensitive e user_id
-- Execute this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "premium_users_select_own" ON public.premium_users;
DROP POLICY IF EXISTS "users_select_own_premium" ON public.premium_users;
DROP POLICY IF EXISTS "admins_select_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_insert_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_update_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_delete_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "service_role_all_premium_users" ON public.premium_users;

-- Enable RLS
ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own premium status
-- Uses LOWER() for case-insensitive email comparison
-- Also checks user_id for linked accounts
CREATE POLICY "users_select_own_premium" ON public.premium_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Allow admins full access
CREATE POLICY "admins_all_premium_users" ON public.premium_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Allow anon/service role for webhooks (N8N)
CREATE POLICY "service_insert_premium_users" ON public.premium_users
  FOR INSERT
  TO anon, service_role
  WITH CHECK (true);

CREATE POLICY "service_update_premium_users" ON public.premium_users
  FOR UPDATE
  TO anon, service_role
  USING (true);

-- Normalize existing emails to lowercase
UPDATE public.premium_users
SET email = LOWER(email)
WHERE email IS NOT NULL AND email != LOWER(email);

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Premium users RLS V3 policies applied successfully!';
END $$;
