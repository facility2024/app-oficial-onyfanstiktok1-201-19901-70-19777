UPDATE public.payment_transactions SET status = 'APPROVED' WHERE asaas_payment_id = 'cmqqv7d7g5zvx01pr953bcax4';

INSERT INTO public.premium_users (user_id, email, name, subscription_status, subscription_type, subscription_start, subscription_end)
SELECT 'a4054c8f-6d03-4685-ba31-b8150c56571f'::uuid, p.email, COALESCE(p.name, 'Assinante VIP'), 'active', 'mensal', now(), now() + interval '30 days'
FROM public.profiles p WHERE p.id = 'a4054c8f-6d03-4685-ba31-b8150c56571f'
ON CONFLICT (email) DO UPDATE SET
  subscription_status = 'active',
  subscription_type = 'mensal',
  subscription_start = now(),
  subscription_end = now() + interval '30 days',
  user_id = EXCLUDED.user_id;