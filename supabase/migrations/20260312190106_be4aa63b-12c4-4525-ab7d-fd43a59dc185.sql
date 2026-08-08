
-- Create dedicated marketplace_feedback table with auto-cleanup
CREATE TABLE public.marketplace_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback
CREATE POLICY "anyone_can_insert_feedback" ON public.marketplace_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read feedback
CREATE POLICY "admins_read_feedback" ON public.marketplace_feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "admins_delete_feedback" ON public.marketplace_feedback
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to cleanup feedback older than 48 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_marketplace_feedback()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.marketplace_feedback
  WHERE created_at < (now() - interval '48 hours');
END;
$$;
