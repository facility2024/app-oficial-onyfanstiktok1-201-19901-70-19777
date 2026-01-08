import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para processar referências pendentes após login
 * Verifica se há uma referência pendente no localStorage e processa
 * Também verifica referrals não creditados e reprocessa
 */
export function usePendingReferral(userId: string | undefined) {
  const processedRef = useRef(false);
  
  useEffect(() => {
    if (!userId || processedRef.current) return;

    const processPendingReferral = async () => {
      try {
        processedRef.current = true;
        
        // Verificar se há referência pendente
        const pendingData = localStorage.getItem('pending_referral');
        if (!pendingData) {
          // Mesmo sem pendente, verificar se precisa reprocessar
          await checkAndReprocessReferral(userId);
          return;
        }

        const pending = JSON.parse(pendingData);
        
        // Verificar se não expirou (48h para dar mais margem)
        if (Date.now() - pending.timestamp > 48 * 60 * 60 * 1000) {
          localStorage.removeItem('pending_referral');
          return;
        }

        // Verificar se o userId corresponde
        if (pending.userId !== userId) return;

        console.log('🔄 Processando referência pendente:', pending);

        // Buscar referenciador se não temos o ID
        let referrerId = pending.referrerId;
        if (!referrerId && pending.referralCode) {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .ilike('referral_code', pending.referralCode)
            .maybeSingle();
          
          referrerId = referrer?.id;
        }

        if (!referrerId) {
          console.warn('⚠️ Referenciador não encontrado');
          localStorage.removeItem('pending_referral');
          return;
        }

        // Verificar se perfil já tem referred_by
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        // Se não tem referred_by, atualizar
        if (!(profile as any)?.referred_by) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ referred_by: referrerId } as any)
            .eq('id', userId);

          if (updateError) {
            console.error('❌ Erro ao atualizar perfil:', updateError);
          } else {
            console.log('✅ Perfil atualizado com referred_by');
          }
        }

        // Verificar se bônus já foi creditado
        const { data: existingReferral } = await (supabase
          .from('referrals' as any)
          .select('id, bonus_paid')
          .eq('referrer_id', referrerId)
          .eq('referred_id', userId)
          .maybeSingle() as any);

        if (existingReferral && existingReferral.bonus_paid) {
          console.log('✅ Bônus já foi creditado anteriormente');
          localStorage.removeItem('pending_referral');
          return;
        }

        // Processar bônus via RPC (múltiplas tentativas)
        let bonusProcessed = false;
        for (let attempt = 1; attempt <= 5 && !bonusProcessed; attempt++) {
          const { data: result, error: rpcError } = await (supabase.rpc as any)('process_referral_completion', {
            p_referrer_id: referrerId,
            p_referred_id: userId,
            p_referred_email: pending.email
          });

          if (!rpcError && result === true) {
            bonusProcessed = true;
            console.log('✅ Bônus processado via RPC!');
            toast.success('🎁 Sua indicação foi processada! Seu amigo ganhou N$ 1,00!');
          } else {
            console.log(`⏳ RPC tentativa ${attempt}/5:`, rpcError?.message);
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }

        if (!bonusProcessed) {
          console.log('ℹ️ RPC não confirmou, trigger SQL deve processar');
        }

        localStorage.removeItem('pending_referral');
      } catch (error) {
        console.error('❌ Erro ao processar referência pendente:', error);
      }
    };

    // Função para verificar e reprocessar referências não creditadas
    const checkAndReprocessReferral = async (uid: string) => {
      try {
        // Verificar se usuário tem referred_by mas não tem referral registrado
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        const referredBy = (profile as any)?.referred_by;
        if (!referredBy) return;

        // Verificar se existe referral com bônus pago
        const { data: existingReferral } = await (supabase
          .from('referrals' as any)
          .select('id, bonus_paid')
          .eq('referrer_id', referredBy)
          .eq('referred_id', uid)
          .maybeSingle() as any);

        if (existingReferral && existingReferral.bonus_paid) {
          console.log('✅ Referral já processado');
          return;
        }

        // Tentar reprocessar
        console.log('🔄 Reprocessando referral não creditado...');
        const { data: result, error: rpcError } = await (supabase.rpc as any)('process_referral_completion', {
          p_referrer_id: referredBy,
          p_referred_id: uid,
          p_referred_email: (profile as any)?.email || ''
        });

        if (!rpcError && result === true) {
          console.log('✅ Bônus reprocessado com sucesso!');
          toast.success('🎁 Bônus de indicação creditado!');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar referral:', error);
      }
    };

    // Aguardar um pouco antes de processar para garantir que perfil existe
    const timer = setTimeout(processPendingReferral, 2000);
    return () => clearTimeout(timer);
  }, [userId]);
}
