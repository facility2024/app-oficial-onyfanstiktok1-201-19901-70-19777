-- Adicionar coluna de benefícios aos planos de assinatura
-- Cada criador pode definir seus próprios benefícios

ALTER TABLE public.model_subscription_plans 
ADD COLUMN IF NOT EXISTS benefits TEXT[] DEFAULT ARRAY[
  'Conteúdo exclusivo ilimitado',
  'Chat privado direto',
  'Acesso antecipado a novidades',
  'Sem anúncios no perfil'
];

-- Comentário para documentação
COMMENT ON COLUMN public.model_subscription_plans.benefits IS 'Lista de benefícios personalizados oferecidos pelo criador neste plano';
