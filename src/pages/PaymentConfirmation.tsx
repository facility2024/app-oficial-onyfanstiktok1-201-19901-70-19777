import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import coconudiLogo from '@/assets/coconudi-logo-header.png';

const PaymentConfirmation = () => {
  const navigate = useNavigate();
  const { isPremium, loading, checkPremiumStatus, getDaysRemaining } = usePremiumStatus();
  const [checkCount, setCheckCount] = useState(0);

  // Verificar status a cada 5 segundos até confirmar ou 6 tentativas (30s)
  useEffect(() => {
    if (!isPremium && checkCount < 6) {
      const timer = setTimeout(() => {
        checkPremiumStatus();
        setCheckCount(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPremium, checkCount, checkPremiumStatus]);

  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div 
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.95) 0%, rgba(0, 255, 150, 0.9) 25%, rgba(180, 255, 100, 0.9) 50%, rgba(255, 230, 80, 0.95) 75%, rgba(255, 217, 61, 0.95) 100%)',
        }}
      >
        <img src={coconudiLogo} alt="CocoNudi" className="h-8" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          {loading ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Verificando seu pagamento...</p>
            </div>
          ) : isPremium ? (
            /* Sucesso - VIP Ativo */
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                className="relative w-24 h-24 mx-auto mb-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full animate-pulse" />
                <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center">
                  <Crown className="w-10 h-10 text-amber-400" />
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-1 -right-1"
                >
                  <CheckCircle className="w-8 h-8 text-green-500 fill-green-500" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-white mb-2">
                  Parabéns! 🎉
                </h1>
                <p className="text-xl text-amber-400 font-semibold mb-4">
                  Você agora é VIP!
                </p>
                <p className="text-gray-400 mb-6">
                  Sua assinatura está ativa por <span className="text-white font-medium">{daysRemaining} dias</span>.
                  Aproveite todo o conteúdo exclusivo!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-semibold">Benefícios VIP</span>
                </div>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>✓ Acesso a todos os vídeos premium</li>
                  <li>✓ Conteúdo exclusivo de criadores</li>
                  <li>✓ Sem anúncios</li>
                  <li>✓ Badge VIP no perfil</li>
                </ul>
              </motion.div>

              <Button
                onClick={() => navigate('/app')}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-6 text-lg"
              >
                Explorar Conteúdo VIP
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          ) : (
            /* Aguardando Confirmação */
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-6 relative"
              >
                <Clock className="w-20 h-20 text-amber-400" />
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Processando Pagamento
              </h1>
              <p className="text-gray-400 mb-6">
                Estamos confirmando seu pagamento. Isso pode levar alguns instantes...
              </p>

              <div className="bg-gray-900/50 border border-white/10 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-400">
                  {checkCount < 6 ? (
                    <>Verificando automaticamente... ({checkCount}/6)</>
                  ) : (
                    <>Se você já pagou, seu status será atualizado em breve. 
                    Você pode continuar navegando e verificar depois.</>
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setCheckCount(0);
                    checkPremiumStatus();
                  }}
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  Verificar Novamente
                </Button>
                <Button
                  onClick={() => navigate('/app')}
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white"
                >
                  Voltar ao App
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
