-- Verificar se bianca@gmail.com é criadora
SELECT 
  p.id,
  p.email,
  p.name,
  ur.role,
  ur.created_at as role_granted_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'bianca@gmail.com';

-- Verificar se existe algum follow para bianca
SELECT 
  uf.*,
  p.email as creator_email
FROM public.user_follows uf
JOIN public.profiles p ON p.id = uf.following_id
WHERE p.email = 'bianca@gmail.com';
