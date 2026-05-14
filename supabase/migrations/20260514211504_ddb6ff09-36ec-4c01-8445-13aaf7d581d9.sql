-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the password in auth.users
-- This uses bcrypt (the default for Supabase Auth)
UPDATE auth.users 
SET encrypted_password = crypt('Otavio141716141716', gen_salt('bf')),
    updated_at = now()
WHERE email = 'coconudi@gmail.com';

-- Clear/update any legacy password in the public.usuarios table
-- Even though we didn't find it, we'll run this to be sure
UPDATE public.usuarios
SET senha = 'Otavio141716141716'
WHERE email = 'coconudi@gmail.com';
