import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Lock, Star, Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ModelPlan } from '@/hooks/useModelSubscription';
import { toast } from 'sonner';

interface ModelSubscriptionOverlayProps {
  modelName: string;
  modelAvatar?: string;
  plans: ModelPlan[];
  onClose?: () => void;
  thumbnailUrl?: string;
}

export const ModelSubscriptionOverlay: React.FC<ModelSubscriptionOverlayProps> = ({
  modelName,
  modelAvatar,
  plans,
  onClose,
  thumbnailUrl,
}) => {
  const navigate = useNavigate();

  const handleSubscribe = (plan: ModelPlan) => {
    if (plan.payment_url) {
      // Abrir link de pagamento em nova aba
      window.open(plan.payment_url, '_blank');
      toast.info('Redirecionando para pagamento...', {
        description: 'Após o pagamento, seu acesso será liberado automaticamente.',
      });
    } else {
      // Redirecionar para página de assinatura com parâmetros
      navigate(`/subscribe?model=${plan.model_id}&plan=${plan.plan_type}`);
    }
  };

  const handleVIPGlobal = () => {
    navigate('/subscribe');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case 'mensal': return 'Mensal';
      case 'trimestral': return 'Trimestral';
      case 'anual': return 'Anual';
      default: return planType;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center"
    >
      {/* Background com blur */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        style={{
          backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70" />
      </div>

      {/* Partículas decorativas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0.3,
            }}
            animate={{
              y: [null, -20, 20],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Conteúdo principal */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative z-10 w-full max-w-sm mx-4 p-6 rounded-2xl bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 border border-amber-500/30 shadow-2xl"
      >
        {/* Botão fechar */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Ícone de cadeado */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30"
        >
          <Lock className="w-8 h-8 text-white" />
        </motion.div>

        {/* Avatar e nome da modelo */}
        <div className="text-center mb-4">
          {modelAvatar && (
            <img
              src={modelAvatar}
              alt={modelName}
              className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-amber-500"
            />
          )}
          <h3 className="text-xl font-bold text-white mb-1">
            Conteúdo Exclusivo
          </h3>
          <p className="text-amber-400 font-medium">@{modelName}</p>
        </div>

        {/* Descrição */}
        <p className="text-gray-300 text-sm text-center mb-4">
          Assine para desbloquear todo o conteúdo premium de <span className="text-amber-400 font-semibold">{modelName}</span>
        </p>

        {/* Planos disponíveis */}
        <div className="space-y-2 mb-4">
          {plans.map((plan, index) => (
            <motion.button
              key={plan.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              onClick={() => handleSubscribe(plan)}
              className={`w-full p-3 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                plan.plan_type === 'trimestral'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500 hover:border-amber-400'
                  : 'bg-white/5 border-white/20 hover:border-white/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  plan.plan_type === 'trimestral' ? 'bg-amber-500' : 'bg-gray-700'
                }`}>
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{getPlanLabel(plan.plan_type)}</p>
                  {plan.discount_label && (
                    <span className="text-xs text-green-400">{plan.discount_label}</span>
                  )}
                </div>
              </div>
              <span className="text-lg font-bold text-white">
                {formatPrice(plan.price)}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Benefícios */}
        <div className="bg-white/5 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Incluído na assinatura:
          </p>
          <div className="space-y-1">
            {[
              'Todos os vídeos premium',
              'Fotos exclusivas',
              'Conteúdo novo toda semana',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                <Check className="w-3 h-3 text-green-400" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* Opção VIP Global */}
        <div className="border-t border-white/10 pt-4">
          <button
            onClick={handleVIPGlobal}
            className="w-full text-center text-xs text-gray-400 hover:text-amber-400 transition-colors"
          >
            Ou assine o <span className="font-semibold">VIP Global</span> e libere TODAS as modelos →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
