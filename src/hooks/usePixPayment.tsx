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

interface PixPaymentRecord {
  id: string;
  user_id: string;
  email: string;
  name: string;
  whatsapp: string;
  amount: number;
  plan_type: string;
  plan_days: number;
  pix_code: string;
  qr_code: string;
  txid: string;
  hoopay_order_uuid: string | null;
  status: string;
  expires_at: string;
  paid_at: string | null;
}

// LXPay API Configuration
const LXPAY_CONFIG = {
  api_url: 'https://api.lxpay.com.br',
  public_key: 'otaviogcasartelli_1762996382405',
  secret_key: 'fcc312bb-01b3-482d-90c5-919155bb082d'
};

export const usePixPayment = () => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentData, setPaymentData] = useState<PixPaymentResponse | null>(null);

  // Generate simulated PIX as fallback
  const generateSimulatedPix = (amount: number): { pix_code: string; pix_qrcode: string; txid: string } => {
    const txid = `SIM${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const pix_code = `00020126580014br.gov.bcb.pix0136${txid}520400005303986540${amount.toFixed(2)}5802BR5925COCONUDI VIP6009SAO PAULO62070503***6304`;
    const pix_qrcode = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="white" width="200" height="200"/><text x="100" y="100" text-anchor="middle" font-size="12">PIX Simulado</text><text x="100" y="120" text-anchor="middle" font-size="8">${txid}</text></svg>`)}`;
    return { pix_code, pix_qrcode, txid };
  };

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

      // Generate unique identifier for this payment
      const identifier = `COCO${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      let pix_code: string;
      let pix_qrcode: string;
      let txid: string;
      let lxpayTransactionId: string | null = null;

      try {
        // Build request payload according to LXPay API documentation
        const requestPayload = {
          amount: amount, // LXPay uses decimal value (49.99), not cents
          client: {
            name: data.name || 'Cliente CocoNudi',
            email: data.email
          },
          identifier: identifier,
          products: [{
            title: `CocoNudi VIP ${planType === 'yearly' ? 'Anual' : planType === 'quarterly' ? 'Trimestral' : 'Mensal'}`,
            price: amount,
            quantity: 1
          }]
        };

        console.log('🔗 LXPay API URL:', `${LXPAY_CONFIG.api_url}/api/v1/gateway/pix/receive`);
        console.log('📦 LXPay Request Payload:', JSON.stringify(requestPayload, null, 2));
        
        const lxpayResponse = await fetch(`${LXPAY_CONFIG.api_url}/api/v1/gateway/pix/receive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-public-key': LXPAY_CONFIG.public_key,
            'x-secret-key': LXPAY_CONFIG.secret_key
          },
          body: JSON.stringify(requestPayload)
        });

        console.log('📡 LXPay Response Status:', lxpayResponse.status);
        
        const lxpayData = await lxpayResponse.json();
        console.log('📄 LXPay Response Data:', lxpayData);

        if (lxpayResponse.ok && lxpayData) {
          // Extract PIX data from LXPay response
          // Response structure: { id, externalId, pixInformation: { qrCode, image } }
          const pixInfo = lxpayData.pixInformation || lxpayData;
          
          pix_code = pixInfo.qrCode || pixInfo.pixCode || lxpayData.qrCode || '';
          pix_qrcode = pixInfo.image || pixInfo.qrCodeImage || lxpayData.image || '';
          txid = lxpayData.externalId || lxpayData.id || identifier;
          lxpayTransactionId = lxpayData.id || null;
          
          console.log('✅ LXPay PIX created successfully:', txid);
          console.log('✅ PIX Code:', pix_code ? 'presente' : 'ausente');
          console.log('✅ QR Code Image:', pix_qrcode ? 'presente' : 'ausente');
          console.log('✅ Transaction ID:', lxpayTransactionId);
        } else {
          console.error('❌ LXPay API error:', lxpayData);
          console.error('❌ Status:', lxpayResponse.status, lxpayResponse.statusText);
          throw new Error(lxpayData.message || lxpayData.error || `Erro na API LXPay: ${lxpayResponse.status}`);
        }
      } catch (apiError) {
        console.error('❌ LXPay API call failed, using simulated PIX:', apiError);
        const simulated = generateSimulatedPix(amount);
        pix_code = simulated.pix_code;
        pix_qrcode = simulated.pix_qrcode;
        txid = simulated.txid;
      }

      // Calculate expiration (30 minutes from now)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // Save payment to database
      const { data: paymentRecord, error: insertError } = await supabase
        .from('pix_payments' as any)
        .insert({
          user_id: user.id,
          email: data.email,
          name: data.name,
          whatsapp: data.whatsapp || '',
          amount: amount,
          plan_type: planType,
          plan_days: planDays,
          pix_code: pix_code,
          qr_code: pix_qrcode,
          txid: txid,
          hoopay_order_uuid: lxpayTransactionId, // Reusing column for LXPay transaction ID
          status: 'pending',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to save payment:', insertError);
        throw new Error('Erro ao salvar pagamento');
      }

      const record = paymentRecord as unknown as PixPaymentRecord;

      const response: PixPaymentResponse = {
        success: true,
        payment_id: record.id,
        pix_code: pix_code,
        pix_qrcode: pix_qrcode,
        txid: txid,
        amount: amount,
        expires_at: expiresAt,
        message: lxpayTransactionId ? 'PIX gerado com sucesso via LXPay' : 'PIX simulado gerado com sucesso'
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
      // Fetch payment from database
      const { data: paymentData, error: fetchError } = await supabase
        .from('pix_payments' as any)
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError || !paymentData) {
        throw new Error('Pagamento não encontrado');
      }

      const payment = paymentData as unknown as PixPaymentRecord;

      // If already paid or expired, return current status
      if (payment.status === 'paid') {
        return {
          success: true,
          status: 'paid',
          premium_user_id: payment.user_id,
          message: 'Pagamento já confirmado!',
          expires_at: payment.expires_at
        };
      }

      if (payment.status === 'expired' || new Date(payment.expires_at) < new Date()) {
        return {
          success: true,
          status: 'expired',
          message: 'Pagamento expirado',
          expires_at: payment.expires_at
        };
      }

      // If we have a LXPay transaction ID, check with LXPay API
      if (payment.hoopay_order_uuid || payment.txid) {
        try {
          // Query by externalId (identifier we sent) or by id
          const queryParam = payment.txid.startsWith('COCO') 
            ? `externalId=${payment.txid}` 
            : `id=${payment.hoopay_order_uuid}`;
          
          console.log('🔍 Verificando pagamento LXPay:', queryParam);
          
          const consultResponse = await fetch(
            `${LXPAY_CONFIG.api_url}/api/v1/transactions?${queryParam}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'x-public-key': LXPAY_CONFIG.public_key,
                'x-secret-key': LXPAY_CONFIG.secret_key
              }
            }
          );

          console.log('📡 LXPay Consult Status:', consultResponse.status);
          
          const consultData = await consultResponse.json();
          console.log('📄 LXPay Consult Data:', consultData);

          if (consultResponse.ok) {
            // LXPay returns transaction data, check status
            // Status can be: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
            const transaction = consultData.data || consultData;
            const lxpayStatus = (transaction.status || '').toUpperCase();
            
            console.log('🔍 LXPay Transaction Status:', lxpayStatus);

            if (lxpayStatus === 'COMPLETED' || lxpayStatus === 'PAID' || lxpayStatus === 'APPROVED') {
              // Update payment status
              await supabase
                .from('pix_payments' as any)
                .update({ 
                  status: 'paid',
                  paid_at: new Date().toISOString()
                })
                .eq('id', paymentId);

              // Create premium user
              const subscriptionEnd = new Date();
              subscriptionEnd.setDate(subscriptionEnd.getDate() + payment.plan_days);

              await supabase
                .from('premium_users')
                .upsert({
                  email: payment.email,
                  name: payment.name,
                  whatsapp: payment.whatsapp,
                  subscription_status: 'active',
                  subscription_start: new Date().toISOString(),
                  subscription_end: subscriptionEnd.toISOString(),
                  subscription_type: payment.plan_type
                }, { onConflict: 'email' });

              toast({
                title: "Pagamento Confirmado!",
                description: "Sua assinatura VIP foi ativada com sucesso!",
              });

              return {
                success: true,
                status: 'paid',
                premium_user_id: payment.user_id,
                message: 'Pagamento confirmado! Assinatura VIP ativada.',
                expires_at: payment.expires_at
              };
            }
          }
        } catch (apiError) {
          console.error('LXPay consult error:', apiError);
        }
      }

      // Return pending status
      return {
        success: true,
        status: 'pending',
        message: 'Aguardando pagamento...',
        expires_at: payment.expires_at
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
        .maybeSingle();

      if (error) {
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
