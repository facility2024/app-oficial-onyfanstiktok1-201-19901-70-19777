-- Fix RLS policies for model_followers table
-- Permite que usuários vejam e gerenciem suas próprias relações de seguir

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own follows" ON public.model_followers;
DROP POLICY IF EXISTS "Users can insert their own follows" ON public.model_followers;
DROP POLICY IF EXISTS "Users can update their own follows" ON public.model_followers;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.model_followers;

-- Enable RLS
ALTER TABLE public.model_followers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own follows
CREATE POLICY "Users can view their own follows"
ON public.model_followers
FOR SELECT
USING (
  user_id = auth.uid()
);

-- Policy 2: Users can insert their own follows
CREATE POLICY "Users can insert their own follows"
ON public.model_followers
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- Policy 3: Users can update their own follows
CREATE POLICY "Users can update their own follows"
ON public.model_followers
FOR UPDATE
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Policy 4: Users can delete their own follows
CREATE POLICY "Users can delete their own follows"
ON public.model_followers
FOR DELETE
USING (
  user_id = auth.uid()
);

-- Verify policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'model_followers'
ORDER BY policyname;
