import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PremiumContentOverlayProps {
  thumbnailUrl?: string;
  onClose?: () => void;
  modelName?: string;
  modelId?: string;
  modelType?: 'model' | 'creator';
  onSubscribeClick?: () => void;
  /** mantido por compatibilidade — agora apenas "private" é suportado */
  contentType?: 'private';
}

export const PremiumContentOverlay = ({
  thumbnailUrl,
  onClose,
  modelName,
  modelId,
  modelType = 'creator',
  onSubscribeClick,
}: PremiumContentOverlayProps) => {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    if (onSubscribeClick) {
      onSubscribeClick();
      return;
    }
    const params = new URLSearchParams();
    if (modelId) params.set('model', modelId);
    params.set('type', modelType);
    if (modelName) params.set('name', modelName);
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
      )}

      <motion.div
        className="relative z-10 w-80 max-w-[90%]"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="flex justify-center mb-4">
          <motion.div
            className="relative"
            animate={{
              boxShadow: ['0 0 20px rgba(168,85,247,0.3)', '0 0 40px rgba(168,85,247,0.5)', '0 0 20px rgba(168,85,247,0.3)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </motion.div>
        </div>

        <div className="bg-gradient-to-b from-gray-900/95 to-black/95 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <h3 className="text-xl font-bold text-white text-center mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Conteúdo Privado
            <Sparkles className="w-5 h-5 text-purple-400" />
          </h3>

          <p className="text-gray-400 text-center text-sm mb-4">
            {modelName
              ? `Este conteúdo é exclusivo para assinantes de ${modelName}.`
              : 'Este conteúdo é exclusivo para assinantes desta criadora.'}
          </p>

          <div className="space-y-2 mb-5">
            {[
              `Todos os vídeos privados de ${modelName || 'esta criadora'}`,
              'Fotos exclusivas',
              'Conteúdo novo toda semana',
              'Acesso antecipado',
            ].map((benefit, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 text-sm text-gray-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Star className="w-4 h-4 flex-shrink-0 text-purple-400" />
                {benefit}
              </motion.div>
            ))}
          </div>

          <Button
            onClick={handleSubscribe}
            className="w-full py-6 text-lg font-bold text-white shadow-lg transition-all bg-gradient-to-r from-purple-500 via-purple-400 to-purple-600 hover:from-purple-600 hover:via-purple-500 hover:to-purple-700 shadow-purple-500/25"
          >
            <Lock className="w-5 h-5 mr-2" />
            Desbloquear Acesso Privado
          </Button>

          <p className="text-center text-gray-500 text-xs mt-3">A partir de R$ 14,90</p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            Continuar navegando
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};
