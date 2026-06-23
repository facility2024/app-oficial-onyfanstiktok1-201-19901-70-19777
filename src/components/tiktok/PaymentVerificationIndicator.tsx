import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Lock, Sparkles } from 'lucide-react';
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
  onPrivateAccessActivated?: () => void;
}

export const PaymentVerificationIndicator = ({ 
  userEmail, 
  userId,
  onPrivateAccessActivated 
}: PaymentVerificationIndicatorProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPrivateAccessActivated, setIsPrivateAccessActivated] = useState(false);
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

  // Ouvir mudanças em tempo real na liberação de conteúdo privado
  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Configurando listener realtime para acesso privado:', { userEmail, userId });

    const channel = supabase
      .channel(`private-access-activation-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'model_subscriptions',
          filter: `subscriber_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Novo acesso privado detectado:', payload.new);
          handlePrivateAccessActivation(payload.new as any);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'model_subscriptions',
          filter: `subscriber_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Acesso privado atualizado:', payload.new);
          const updatedAccess = payload.new as any;
          if (updatedAccess.subscription_status === 'active') {
            handlePrivateAccessActivation(updatedAccess);
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

  const handlePrivateAccessActivation = useCallback((accessData: any) => {
    console.log('🎉 Acesso privado ATIVADO!', accessData);
    
    // Evitar tocar som múltiplas vezes
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      playCelebrationSound();
    }
    
    // Atualizar estados
    setIsVerifying(false);
    setIsPrivateAccessActivated(true);
    sessionStorage.removeItem('checking_payment');
    
    // Mostrar notificação
    toast({
      title: "🎉 Acesso privado liberado!",
      description: `Seu plano ${accessData.subscription_type} foi ativado com sucesso!`,
      duration: 10000,
    });
    
    // Callback
    onPrivateAccessActivated?.();
    window.dispatchEvent(new Event('private-access-updated'));
    
    // Esconder animação após alguns segundos
    setTimeout(() => {
      setIsPrivateAccessActivated(false);
    }, 5000);
  }, [toast, onPrivateAccessActivated]);

  if (!isVerifying && !isPrivateAccessActivated) return null;

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

      {isPrivateAccessActivated && (
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
                <Lock className="w-20 h-20 text-white mx-auto mb-4 drop-shadow-lg" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                Acesso Privado Liberado! 🎉
              </h2>
              <p className="text-yellow-100/90 text-lg">
                Conteúdo privado ativado com sucesso!
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
