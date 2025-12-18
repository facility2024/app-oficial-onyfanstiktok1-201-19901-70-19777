-- Fix RLS policies for premium_users table
-- Execute this in Supabase SQL Editor

-- Drop existing policies if any
DROP POLICY IF EXISTS "admins_select_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_insert_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_update_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "admins_delete_premium_users" ON public.premium_users;
DROP POLICY IF EXISTS "users_select_own_premium" ON public.premium_users;
DROP POLICY IF EXISTS "premium_users_select_own" ON public.premium_users;
DROP POLICY IF EXISTS "Users can view own premium status" ON public.premium_users;

-- Enable RLS on the table
ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own premium status by email OR user_id
CREATE POLICY "users_select_own_premium" ON public.premium_users
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

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

-- Allow service role to insert/update (for webhooks)
-- This is automatic with service_role key, but we add explicit policy for clarity
CREATE POLICY "service_role_all_premium_users" ON public.premium_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- OPTIONAL: Also add user_id column if it doesn't exist (for future linking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'premium_users' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.premium_users ADD COLUMN user_id UUID REFERENCES auth.users(id);
    CREATE INDEX idx_premium_users_user_id ON public.premium_users(user_id);
  END IF;
END $$;

-- Create function to link premium_users to auth.users by email
CREATE OR REPLACE FUNCTION public.link_premium_user_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find the auth user by email and link them
  UPDATE public.premium_users 
  SET user_id = (SELECT id FROM auth.users WHERE email = NEW.email LIMIT 1)
  WHERE id = NEW.id AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-link premium users
DROP TRIGGER IF EXISTS trigger_link_premium_user ON public.premium_users;
CREATE TRIGGER trigger_link_premium_user
  AFTER INSERT ON public.premium_users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_premium_user_to_auth();

-- Update existing premium_users to link with auth.users
UPDATE public.premium_users pu
SET user_id = au.id
FROM auth.users au
WHERE pu.email = au.email AND pu.user_id IS NULL;

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Premium users RLS policies updated successfully!';
END $$;
