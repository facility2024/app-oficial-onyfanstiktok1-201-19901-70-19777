import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentVerificationIndicatorProps {
  userEmail?: string;
  userId?: string;
  onVIPActivated?: () => void;
}

export const PaymentVerificationIndicator = ({ 
  userEmail, 
  userId,
  onVIPActivated 
}: PaymentVerificationIndicatorProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVIPActivated, setIsVIPActivated] = useState(false);
  const { toast } = useToast();

  // Verificar se veio da página de assinatura
  useEffect(() => {
    const checkingPayment = sessionStorage.getItem('checking_payment');
    if (checkingPayment === 'true') {
      setIsVerifying(true);
      // Limpar flag após 60 segundos (timeout)
      const timeout = setTimeout(() => {
        sessionStorage.removeItem('checking_payment');
        setIsVerifying(false);
      }, 60000);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Ouvir mudanças em tempo real na tabela premium_users
  useEffect(() => {
    if (!userEmail && !userId) return;

    console.log('🔔 Configurando listener realtime para VIP:', { userEmail, userId });

    const channel = supabase
      .channel('vip-activation')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'premium_users'
        },
        (payload) => {
          console.log('🔔 Novo VIP detectado:', payload.new);
          const newVIP = payload.new as any;
          
          // Verificar se é o usuário atual
          if (
            (userEmail && newVIP.email?.toLowerCase() === userEmail.toLowerCase()) ||
            (userId && newVIP.user_id === userId)
          ) {
            handleVIPActivation(newVIP);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'premium_users'
        },
        (payload) => {
          console.log('🔔 VIP atualizado:', payload.new);
          const updatedVIP = payload.new as any;
          
          // Verificar se é o usuário atual e se foi ativado
          if (
            updatedVIP.subscription_status === 'active' &&
            (
              (userEmail && updatedVIP.email?.toLowerCase() === userEmail.toLowerCase()) ||
              (userId && updatedVIP.user_id === userId)
            )
          ) {
            handleVIPActivation(updatedVIP);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Status do canal realtime:', status);
      });

    return () => {
      console.log('🔔 Removendo listener realtime');
      supabase.removeChannel(channel);
    };
  }, [userEmail, userId]);

  const handleVIPActivation = useCallback((vipData: any) => {
    console.log('🎉 VIP ATIVADO!', vipData);
    
    // Atualizar estados
    setIsVerifying(false);
    setIsVIPActivated(true);
    sessionStorage.removeItem('checking_payment');
    
    // Salvar no localStorage
    localStorage.setItem('premium_user', 'true');
    if (vipData.email) {
      localStorage.setItem('premium_email', vipData.email);
    }
    
    // Mostrar notificação
    toast({
      title: "🎉 Parabéns! Você é VIP!",
      description: `Seu plano ${vipData.subscription_type} foi ativado com sucesso!`,
      duration: 10000,
    });
    
    // Callback
    onVIPActivated?.();
    
    // Esconder animação após alguns segundos
    setTimeout(() => {
      setIsVIPActivated(false);
    }, 5000);
  }, [toast, onVIPActivated]);

  if (!isVerifying && !isVIPActivated) return null;

  return (
    <AnimatePresence>
      {isVerifying && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border border-yellow-300/30">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <div>
                <p className="text-white font-semibold text-sm">Verificando pagamento...</p>
                <p className="text-yellow-100/80 text-xs">Aguardando confirmação</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {isVIPActivated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Background overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Celebration card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 rounded-3xl p-8 shadow-2xl max-w-sm mx-4"
          >
            {/* Sparkles */}
            <div className="absolute -top-4 -right-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-10 h-10 text-yellow-200" />
              </motion.div>
            </div>
            
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Crown className="w-20 h-20 text-white mx-auto mb-4 drop-shadow-lg" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                Você é VIP! 🎉
              </h2>
              <p className="text-yellow-100/90 text-lg">
                Acesso premium ativado com sucesso!
              </p>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4"
              >
                <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
