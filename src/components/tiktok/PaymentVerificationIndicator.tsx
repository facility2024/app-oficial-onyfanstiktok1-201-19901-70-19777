import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Função para criar som de celebração usando Web Audio API
const playCelebrationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Criar múltiplos "pops" de confete
    const playPop = (delay: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + delay);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, audioContext.currentTime + delay + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.15);
      
      oscillator.start(audioContext.currentTime + delay);
      oscillator.stop(audioContext.currentTime + delay + 0.15);
    };

    // Sequência de "pops" de confete
    const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    frequencies.forEach((freq, i) => {
      playPop(i * 0.08, freq);
    });

    // Som de "fanfarra" final
    setTimeout(() => {
      const fanfare = audioContext.createOscillator();
      const fanfareGain = audioContext.createGain();
      
      fanfare.connect(fanfareGain);
      fanfareGain.connect(audioContext.destination);
      
      fanfare.type = 'triangle';
      fanfare.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      fanfare.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
      fanfare.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3); // G5
      fanfare.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.45); // C6
      
      fanfareGain.gain.setValueAtTime(0.4, audioContext.currentTime);
      fanfareGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      fanfare.start(audioContext.currentTime);
      fanfare.stop(audioContext.currentTime + 0.8);
    }, 500);

    console.log('🎉 Som de celebração tocado!');
  } catch (error) {
    console.error('Erro ao tocar som de celebração:', error);
  }
};

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
  const soundPlayedRef = useRef(false);

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
    
    // Evitar tocar som múltiplas vezes
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      playCelebrationSound();
    }
    
    // Atualizar estados
    setIsVerifying(false);
    setIsVIPActivated(true);
    sessionStorage.removeItem('checking_payment');
    
    // Status VIP agora é verificado exclusivamente pelo banco de dados
    
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
