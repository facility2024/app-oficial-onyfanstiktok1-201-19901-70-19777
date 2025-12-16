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
    cardData?: CardData,
    address?: AddressData
  ): Promise<ChargeResponse> => {
    setLoading(true);
    try {
      const payload: any = {
        plan_id: planId,
        payment_method: paymentMethod,
        customer,
      };

      if (paymentMethod === 'credit_card' && cardData && address) {
        payload.card_data = cardData;
        payload.address = address;
      }

      const { data, error } = await supabase.functions.invoke('hoopay-charge', {
        body: payload,
      });

      if (error) {
        console.error('Error creating charge:', error);
        toast.error('Erro ao criar cobrança');
        return { success: false, error: error.message };
      }

      if (!data.success) {
        toast.error(data.error || 'Erro ao processar pagamento');
        return { success: false, error: data.error };
      }

      setPaymentData(data);
      
      if (paymentMethod === 'pix') {
        toast.success('PIX gerado com sucesso! Escaneie o QR Code para pagar.');
      } else if (data.status === 'paid') {
        toast.success('Pagamento aprovado! Bem-vindo ao VIP!');
      }

      return data;
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
      const { data, error } = await supabase.functions.invoke('hoopay-verify', {
        body: { order_uuid: orderUuid },
      });

      if (error) {
        console.error('Error verifying payment:', error);
        return { success: false, error: error.message };
      }

      if (data.is_paid) {
        toast.success('Pagamento confirmado! Bem-vindo ao VIP!');
      }

      return data;
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
