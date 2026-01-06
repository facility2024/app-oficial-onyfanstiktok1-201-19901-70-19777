import { useNavigate } from 'react-router-dom';
import { Crown, Lock, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PremiumContentOverlayProps {
  thumbnailUrl?: string;
  onClose?: () => void;
  modelName?: string;
  onSubscribeClick?: () => void; // Callback para abrir opções de assinatura individual
  contentType?: 'premium' | 'private'; // Tipo de bloqueio: premium (VIP Global) ou private (assinatura individual)
}

export const PremiumContentOverlay = ({ 
  thumbnailUrl, 
  onClose,
  modelName,
  onSubscribeClick,
  contentType = 'premium'
}: PremiumContentOverlayProps) => {
  const navigate = useNavigate();
  const isPrivate = contentType === 'private';

  const handleSubscribe = () => {
    // Se é vídeo privado e existe callback de assinatura individual, usar ele
    if (isPrivate && onSubscribeClick) {
      onSubscribeClick();
    } else {
      // Para vídeos premium ou sem callback, ir para página VIP Global
      navigate('/subscribe');
    }
  };

  return (
    <motion.div 
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background blur with gradient */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Thumbnail as faded background */}
      {thumbnailUrl && (
        <img 
          src={thumbnailUrl} 
          alt="Preview"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
      )}

      {/* Content Card */}
      <motion.div 
        className="relative z-10 w-80 max-w-[90%]"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {/* Lock Icon with glow */}
        <div className="flex justify-center mb-4">
          <motion.div 
            className="relative"
            animate={{ 
              boxShadow: isPrivate 
                ? ['0 0 20px rgba(168, 85, 247, 0.3)', '0 0 40px rgba(168, 85, 247, 0.5)', '0 0 20px rgba(168, 85, 247, 0.3)']
                : ['0 0 20px rgba(251, 191, 36, 0.3)', '0 0 40px rgba(251, 191, 36, 0.5)', '0 0 20px rgba(251, 191, 36, 0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${
              isPrivate 
                ? 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600' 
                : 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500'
            }`}>
              <Lock className="w-10 h-10 text-black" />
            </div>
            <motion.div
              className={`absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center ${
                isPrivate 
                  ? 'bg-gradient-to-br from-purple-300 to-purple-500' 
                  : 'bg-gradient-to-br from-yellow-300 to-amber-500'
              }`}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Crown className="w-4 h-4 text-black" />
            </motion.div>
          </motion.div>
        </div>

        {/* Card content */}
        <div className={`bg-gradient-to-b from-gray-900/95 to-black/95 border rounded-2xl p-6 backdrop-blur-xl shadow-2xl ${
          isPrivate ? 'border-purple-500/30' : 'border-amber-500/30'
        }`}>
          {/* Title */}
          <h3 className="text-xl font-bold text-white text-center mb-2 flex items-center justify-center gap-2">
            <Sparkles className={isPrivate ? 'w-5 h-5 text-purple-400' : 'w-5 h-5 text-amber-400'} />
            {isPrivate ? 'Conteúdo Privado' : 'Conteúdo Premium'}
            <Sparkles className={isPrivate ? 'w-5 h-5 text-purple-400' : 'w-5 h-5 text-amber-400'} />
          </h3>

          {/* Description */}
          <p className="text-gray-400 text-center text-sm mb-4">
            {isPrivate 
              ? (modelName 
                  ? `Este conteúdo é exclusivo para assinantes de ${modelName}.`
                  : 'Este conteúdo é exclusivo para assinantes desta criadora.')
              : (modelName 
                  ? `Este conteúdo de ${modelName} é exclusivo para VIP Global.`
                  : 'Este conteúdo é exclusivo para assinantes VIP Global.')
            }
          </p>

          {/* Benefits list */}
          <div className="space-y-2 mb-5">
            {(isPrivate 
              ? [
                  `Todos os vídeos privados de ${modelName || 'esta criadora'}`,
                  'Fotos exclusivas',
                  'Conteúdo novo toda semana',
                  'Acesso antecipado'
                ]
              : [
                  'Acesso ilimitado a conteúdos premium',
                  'Sem anúncios',
                  'Chat exclusivo com criadores',
                  'Badge VIP no perfil'
                ]
            ).map((benefit, i) => (
              <motion.div 
                key={i}
                className="flex items-center gap-2 text-sm text-gray-300"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Star className={`w-4 h-4 flex-shrink-0 ${isPrivate ? 'text-purple-400' : 'text-amber-400'}`} />
                {benefit}
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleSubscribe}
            className={`w-full py-6 text-lg font-bold text-black shadow-lg transition-all ${
              isPrivate 
                ? 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-600 hover:from-purple-600 hover:via-purple-500 hover:to-purple-700 shadow-purple-500/25'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:via-amber-500 hover:to-orange-600 shadow-amber-500/25'
            }`}
          >
            <Crown className="w-5 h-5 mr-2" />
            {isPrivate ? `Assinar ${modelName || 'Criadora'}` : 'Seja VIP Global'}
          </Button>

          {/* Price hint */}
          <p className="text-center text-gray-500 text-xs mt-3">
            {isPrivate 
              ? 'Planos a partir de R$ 14,90/mês'
              : 'A partir de R$ 19,99/mês • Cancele quando quiser'
            }
          </p>
        </div>

        {/* Skip button */}
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
