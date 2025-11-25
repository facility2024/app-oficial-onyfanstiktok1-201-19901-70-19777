-- Verificar follows registrados na tabela user_follows
SELECT 
  uf.id,
  uf.follower_id,
  uf.following_id,
  uf.follower_name,
  uf.follower_email,
  uf.is_active,
  uf.followed_at,
  p.name as creator_name,
  p.email as creator_email
FROM public.user_follows uf
LEFT JOIN public.profiles p ON p.id = uf.following_id
ORDER BY uf.followed_at DESC;

-- Verificar se bruno@gmail.com segue alguém
SELECT 
  uf.*,
  p_follower.email as follower_email_from_auth,
  p_creator.email as creator_email
FROM public.user_follows uf
LEFT JOIN public.profiles p_follower ON p_follower.id = uf.follower_id
LEFT JOIN public.profiles p_creator ON p_creator.id = uf.following_id
WHERE p_follower.email = 'bruno@gmail.com'
  OR uf.follower_email = 'bruno@gmail.com';
