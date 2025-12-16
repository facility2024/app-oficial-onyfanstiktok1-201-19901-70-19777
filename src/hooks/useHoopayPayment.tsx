import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  days: number;
  discount?: number;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'mensal',
    name: 'Mensal',
    price: 19.99,
    priceFormatted: 'R$ 19,99',
    days: 30,
  },
  {
    id: 'trimestral',
    name: 'Trimestral',
    price: 49.99,
    priceFormatted: 'R$ 49,99',
    days: 90,
    discount: 17,
    popular: true,
  },
  {
    id: 'anual',
    name: 'Anual',
    price: 149.99,
    priceFormatted: 'R$ 149,99',
    days: 365,
    discount: 38,
  },
];

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  document: string; // CPF
}

// Keep these for backwards compatibility (credit card coming soon)
export interface CardData {
  number: string;
  holder_name: string;
  expiration_month: string;
  expiration_year: string;
  cvv: string;
}

export interface AddressData {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
}

export interface ChargeResponse {
  success: boolean;
  payment_id?: string;
  order_uuid?: string;
  charge_uuid?: string;
  status?: string;
  pix_code?: string;
  pix_qr_code?: string;
  amount?: number;
  plan_name?: string;
  plan_days?: number;
  error?: string;
}

export interface VerifyResponse {
  success: boolean;
  status?: string;
  is_paid?: boolean;
  error?: string;
}

export function useHoopayPayment() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentData, setPaymentData] = useState<ChargeResponse | null>(null);

  const createCharge = async (
    planId: string,
    paymentMethod: 'pix' | 'credit_card',
    customer: CustomerData,
    _cardData?: CardData,
    _address?: AddressData
  ): Promise<ChargeResponse> => {
    setLoading(true);
    try {
      // Credit card not supported via RPC yet
      if (paymentMethod === 'credit_card') {
        toast.error('Pagamento por cartão em breve! Use PIX por enquanto.');
        return { success: false, error: 'Credit card not available yet' };
      }

      // Use RPC function instead of Edge Function
      const { data, error } = await supabase.rpc('create_pix_charge' as any, {
        p_plan_id: planId,
        p_customer_name: customer.name,
        p_customer_email: customer.email,
        p_customer_phone: customer.phone,
        p_customer_document: customer.document,
      });

      if (error) {
        console.error('Error creating charge:', error);
        toast.error('Erro ao criar cobrança: ' + error.message);
        return { success: false, error: error.message };
      }

      const result = data as unknown as ChargeResponse;

      if (!result || !result.success) {
        const errorMsg = result?.error || 'Erro ao processar pagamento';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      setPaymentData(result);
      toast.success('PIX gerado com sucesso! Escaneie o QR Code para pagar.');

      return result;
    } catch (err: any) {
      console.error('Error in createCharge:', err);
      toast.error('Erro ao processar pagamento');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (orderUuid: string): Promise<VerifyResponse> => {
    setVerifying(true);
    try {
      // Use RPC function instead of Edge Function
      const { data, error } = await supabase.rpc('verify_pix_payment' as any, {
        p_order_uuid: orderUuid,
      });

      if (error) {
        console.error('Error verifying payment:', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      
      const isPaid = result?.status === 'paid' || result?.is_paid;
      
      if (isPaid) {
        toast.success('Pagamento confirmado! Bem-vindo ao VIP!');
      }

      return { 
        success: result?.success ?? false, 
        status: result?.status,
        is_paid: isPaid,
        error: result?.error 
      };
    } catch (err: any) {
      console.error('Error in verifyPayment:', err);
      return { success: false, error: err.message };
    } finally {
      setVerifying(false);
    }
  };

  const copyPixCode = (pixCode: string) => {
    navigator.clipboard.writeText(pixCode);
    toast.success('Código PIX copiado!');
  };

  const checkPremiumStatus = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('premium_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error || !data) return false;

      // Check subscription_end if it exists
      const subscriptionEnd = (data as any).subscription_end;
      if (subscriptionEnd) {
        const isExpired = new Date(subscriptionEnd) < new Date();
        return !isExpired;
      }
      return true;
    } catch {
      return false;
    }
  };

  return {
    loading,
    verifying,
    paymentData,
    createCharge,
    verifyPayment,
    copyPixCode,
    checkPremiumStatus,
    plans: SUBSCRIPTION_PLANS,
  };
}
