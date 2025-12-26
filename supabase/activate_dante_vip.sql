-- ===========================================
-- Ativar VIP manualmente para dante@gmail.com
-- Execute este SQL no Supabase SQL Editor
-- ===========================================

-- 1. Verificar se o usuário existe na tabela profiles
SELECT id, email, full_name, phone 
FROM profiles 
WHERE email = 'dante@gmail.com';

-- 2. Verificar se já existe registro em premium_users
SELECT * FROM premium_users WHERE email = 'dante@gmail.com';

-- 3. Inserir ou atualizar VIP (UPSERT)
INSERT INTO premium_users (
  email,
  name,
  whatsapp,
  cpf,
  subscription_status,
  subscription_type,
  subscription_start,
  subscription_end,
  user_id
)
SELECT 
  'dante@gmail.com',
  COALESCE(p.full_name, 'Dante Testa'),
  COALESCE(p.phone, '15988163462'),
  '18724380830',
  'active',
  'mensal',
  NOW(),
  NOW() + INTERVAL '30 days',
  p.id
FROM profiles p
WHERE p.email = 'dante@gmail.com'
UNION ALL
SELECT 
  'dante@gmail.com',
  'Dante Testa',
  '15988163462',
  '18724380830',
  'active',
  'mensal',
  NOW(),
  NOW() + INTERVAL '30 days',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'dante@gmail.com')
ON CONFLICT (email) 
DO UPDATE SET
  subscription_status = 'active',
  subscription_type = 'mensal',
  subscription_start = NOW(),
  subscription_end = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- 4. Verificar resultado
SELECT 
  id, 
  email, 
  name, 
  subscription_status, 
  subscription_type,
  subscription_start,
  subscription_end,
  user_id
FROM premium_users 
WHERE email = 'dante@gmail.com';

-- 5. Verificar webhook_logs para diagnóstico
SELECT 
  id,
  webhook_type,
  created_at,
  processed,
  email,
  plan_type,
  error_message,
  payload
FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 10;
