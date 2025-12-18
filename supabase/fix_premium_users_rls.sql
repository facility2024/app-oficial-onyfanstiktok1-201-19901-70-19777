-- Fix RLS policies for premium_users table
-- Execute this in Supabase SQL Editor

-- Drop existing policies if any (ignore errors if they don't exist)
DROP POLICY IF EXISTS "admins_select_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_insert_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_update_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_delete_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "users_select_own_premium" ON public.premium_users;

-- Enable RLS on the table
ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

-- Allow admins to SELECT all premium users
CREATE POLICY "admins_select_premium_users" ON public.premium_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Allow admins to INSERT premium users
CREATE POLICY "admins_insert_premium_users" ON public.premium_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Allow admins to UPDATE premium users
CREATE POLICY "admins_update_premium_users" ON public.premium_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Allow admins to DELETE premium users
CREATE POLICY "admins_delete_premium_users" ON public.premium_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Allow users to see their own premium status
CREATE POLICY "users_select_own_premium" ON public.premium_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
