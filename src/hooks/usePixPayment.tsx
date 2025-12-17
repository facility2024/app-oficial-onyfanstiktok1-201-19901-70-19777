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

      // Try to call RPC function (bypassing TypeScript strict checking)
      const { data: rpcResponse, error: rpcError } = await (supabase.rpc as any)('create_pix_charge', {
        p_user_id: user.id,
        p_email: data.email,
        p_name: data.name,
        p_whatsapp: data.whatsapp,
        p_amount: amount,
        p_plan_type: planType,
        p_plan_days: planDays
      });

      // If RPC doesn't exist, fallback to direct payment creation
      if (rpcError) {
        console.log('RPC not available, using fallback:', rpcError.message);
        
        // Create payment record directly
        const txid = `PIX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min expiry
        
        // Generate a simulated PIX code for demo purposes
        const pixCode = `00020126580014br.gov.bcb.pix0136${user.id.slice(0, 20)}520400005303986540${amount.toFixed(2)}5802BR5913COCONUDI VIP6008SAOPAULO62070503***6304`;
        
        // Generate a simple QR Code placeholder (base64 encoded SVG)
        const qrCodeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="white">
          <rect width="200" height="200" fill="#1a1a1a"/>
          <text x="100" y="90" text-anchor="middle" fill="#fbbf24" font-size="14" font-family="Arial">PIX</text>
          <text x="100" y="115" text-anchor="middle" fill="white" font-size="12" font-family="Arial">R$ ${amount.toFixed(2)}</text>
          <text x="100" y="140" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Arial">Modo Demo</text>
        </svg>`;
        const qrCodeBase64 = `data:image/svg+xml;base64,${btoa(qrCodeSvg)}`;
        
        const { data: payment, error: insertError } = await supabase
          .from('pix_payments')
          .insert({
            user_id: user.id,
            email: data.email,
            name: data.name,
            whatsapp: data.whatsapp,
            amount: amount,
            txid: txid,
            pix_code: pixCode,
            qr_code_base64: qrCodeBase64,
            status: 'pending',
            expires_at: expiresAt
          })
          .select()
          .single();

        if (insertError) {
          throw new Error('Erro ao criar pagamento: ' + insertError.message);
        }
        
        const response: PixPaymentResponse = {
          success: true,
          payment_id: payment.id,
          pix_code: pixCode,
          pix_qrcode: qrCodeBase64,
          txid: txid,
          amount: amount,
          expires_at: expiresAt,
          message: 'PIX gerado com sucesso (modo demonstração)'
        };

        setPaymentData(response);
        
        toast({
          title: "PIX Gerado!",
          description: "Código PIX gerado. Em ambiente de produção, conecte com Hoopay.",
        });

        return response;
      }

      // RPC succeeded
      const response: PixPaymentResponse = {
        success: true,
        payment_id: rpcResponse?.payment_id,
        pix_code: rpcResponse?.pix_code,
        pix_qrcode: rpcResponse?.pix_qrcode,
        txid: rpcResponse?.txid,
        amount: amount,
        expires_at: rpcResponse?.expires_at,
        message: 'PIX gerado com sucesso'
      };

      setPaymentData(response);
      
      toast({
        title: "PIX Gerado!",
        description: "Código PIX gerado com sucesso. Copie e cole para pagar.",
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
      // Try RPC first
      const { data: rpcResponse, error: rpcError } = await (supabase.rpc as any)('verify_pix_payment', {
        p_payment_id: paymentId
      });

      if (rpcError) {
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
          message: `Status do pagamento: ${payment.status}`,
          expires_at: payment.expires_at
        };
      }

      return {
        success: rpcResponse?.success || false,
        status: rpcResponse?.status || 'pending',
        premium_user_id: rpcResponse?.premium_user_id,
        message: rpcResponse?.message || 'Verificação concluída',
        expires_at: rpcResponse?.expires_at
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
