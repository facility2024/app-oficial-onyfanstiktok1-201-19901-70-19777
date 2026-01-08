import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para processar referências pendentes após login
 * Verifica se há uma referência pendente no localStorage e processa
 */
export function usePendingReferral(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const processPendingReferral = async () => {
      try {
        // Verificar se há referência pendente
        const pendingData = localStorage.getItem('pending_referral');
        if (!pendingData) return;

        const pending = JSON.parse(pendingData);
        
        // Verificar se não expirou (24h)
        if (Date.now() - pending.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('pending_referral');
          return;
        }

        // Verificar se o userId corresponde
        if (pending.userId !== userId) return;

        console.log('🔄 Processando referência pendente:', pending);

        // Verificar se já foi processado
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if ((profile as any)?.referred_by) {
          console.log('✅ Referência já processada');
          localStorage.removeItem('pending_referral');
          return;
        }

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

        // Atualizar perfil com referred_by
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ referred_by: referrerId } as any)
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Erro ao atualizar perfil:', updateError);
          return;
        }

        console.log('✅ Perfil atualizado com referred_by');

        // Processar bônus via RPC
        const { data: result, error: rpcError } = await (supabase.rpc as any)('process_referral_completion', {
          p_referrer_id: referrerId,
          p_referred_id: userId,
          p_referred_email: pending.email
        });

        if (!rpcError && result === true) {
          console.log('✅ Bônus processado!');
          toast.success('🎁 Sua indicação foi processada! Seu amigo ganhou N$ 1,00!');
        } else {
          console.log('ℹ️ Bônus será processado pelo trigger');
        }

        localStorage.removeItem('pending_referral');
      } catch (error) {
        console.error('❌ Erro ao processar referência pendente:', error);
      }
    };

    processPendingReferral();
  }, [userId]);
}
