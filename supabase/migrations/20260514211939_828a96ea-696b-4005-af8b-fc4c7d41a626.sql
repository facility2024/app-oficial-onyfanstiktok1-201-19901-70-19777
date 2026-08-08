-- Update any other accounts with the old password in the legacy table
UPDATE public.usuarios
SET senha = 'Otavio141716141716'
WHERE senha = '123456';

-- Just to be absolutely sure about auth.users
UPDATE auth.users 
SET encrypted_password = crypt('Otavio141716141716', gen_salt('bf')),
    updated_at = now()
WHERE email IN ('coconudi@gmail.com', 'otaviogcasartelli@gmail.com');
