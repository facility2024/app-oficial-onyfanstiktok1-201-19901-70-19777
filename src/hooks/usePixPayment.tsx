import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PaymentData {
  name: string;
  email: string;
  whatsapp: string;
  plan?: 'monthly' | 'quarterly' | 'yearly';
  amount?: number;
}

interface PixPaymentResponse {
  success: boolean;
  payment_id?: string;
  pix_code?: string;
  pix_qrcode?: string;
  txid?: string;
  amount?: number;
  expires_at?: string;
  message: string;
}

interface PaymentVerificationResponse {
  success: boolean;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  premium_user_id?: string;
  message: string;
  expires_at?: string;
}

export const usePixPayment = () => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentData, setPaymentData] = useState<PixPaymentResponse | null>(null);

  const generatePixPayment = useCallback(async (data: PaymentData): Promise<PixPaymentResponse> => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Determine plan details
      const planDays = data.plan === 'yearly' ? 365 : data.plan === 'quarterly' ? 90 : 30;
      const planType = data.plan || 'monthly';
      const amount = data.amount || 19.99;

      // Call existing generate-pix Edge Function
      const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke('generate-pix', {
        body: {
          user_id: user.id,
          email: data.email,
          name: data.name,
          whatsapp: data.whatsapp || '',
          amount: amount,
          plan: planType
        }
      });

      // Handle response
      if (edgeError) {
        console.error('Edge Function Error:', edgeError);
        throw new Error('Erro ao gerar PIX: ' + edgeError.message);
      }

      if (!edgeResponse.success) {
        throw new Error(edgeResponse.message || edgeResponse.error || 'Erro ao gerar PIX');
      }

      // Build response from Edge Function data
      const response: PixPaymentResponse = {
        success: true,
        payment_id: edgeResponse.payment_id,
        pix_code: edgeResponse.pix_code,
        pix_qrcode: edgeResponse.pix_qrcode,
        txid: edgeResponse.txid,
        amount: amount,
        expires_at: edgeResponse.expires_at,
        message: edgeResponse.message || 'PIX gerado com sucesso'
      };

      setPaymentData(response);
      
      toast({
        title: "PIX Gerado!",
        description: "Escaneie o QR Code ou copie o código para pagar.",
      });

      return response;
    } catch (error: any) {
      console.error('Erro ao gerar PIX:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar código PIX",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPayment = useCallback(async (paymentId: string): Promise<PaymentVerificationResponse> => {
    setVerifying(true);
    try {
      // Call existing verify-payment Edge Function
      const { data: edgeResponse, error: edgeError } = await supabase.functions.invoke('verify-payment', {
        body: {
          payment_id: paymentId
        }
      });

      if (edgeError) {
        console.error('Verify Edge Error:', edgeError);
        // Fallback: check payment status directly
        const { data: payment, error: fetchError } = await supabase
          .from('pix_payments')
          .select('*')
          .eq('id', paymentId)
          .single();

        if (fetchError) {
          throw new Error('Pagamento não encontrado');
        }

        return {
          success: true,
          status: payment.status as any,
          message: `Status: ${payment.status}`,
          expires_at: payment.expires_at
        };
      }

      return {
        success: edgeResponse.success || false,
        status: edgeResponse.status || 'pending',
        premium_user_id: edgeResponse.premium_user_id,
        message: edgeResponse.message || 'Verificando...',
        expires_at: edgeResponse.expires_at
      };
    } catch (error: any) {
      console.error('Erro ao verificar pagamento:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar pagamento",
        variant: "destructive",
      });
      throw error;
    } finally {
      setVerifying(false);
    }
  }, []);

  const copyPixCode = useCallback((pixCode: string) => {
    navigator.clipboard.writeText(pixCode).then(() => {
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência",
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o código PIX",
        variant: "destructive",
      });
    });
  }, []);

  const checkPremiumStatus = useCallback(async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('premium_users')
        .select('*')
        .eq('email', email)
        .eq('subscription_status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar status premium:', error);
      return false;
    }
  }, []);

  return {
    loading,
    verifying,
    paymentData,
    generatePixPayment,
    verifyPayment,
    copyPixCode,
    checkPremiumStatus,
  };
};
