-- Enable RLS on premium_access table
ALTER TABLE public.premium_access ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public insert into premium_access
CREATE POLICY "Allow public insert premium_access" 
ON public.premium_access 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow public read access to premium_access (for duplicate email check)
CREATE POLICY "Allow public read premium_access" 
ON public.premium_access 
FOR SELECT 
USING (true);