import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Calendar, Clock, CreditCard, Shield, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import coconudiLogo from '@/assets/coconudi-logo-new.png';

interface PaymentHistory {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
}

export default function VIPManagementPage() {
  const navigate = useNavigate();
  const { isPremium, premiumData, loading, getDaysRemaining } = usePremiumStatus();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (premiumData?.email) {
      fetchPaymentHistory(premiumData.email);
    } else {
      setLoadingHistory(false);
    }
  }, [premiumData]);

  const fetchPaymentHistory = async (email: string) => {
    try {
      const { data, error } = await (supabase
        .from('pix_payments') as any)
        .select('id, amount, created_at, status')
        .eq('customer_email', email)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const history = (data as any[]).map(p => ({
          id: p.id,
          amount: p.amount || 0,
          payment_date: p.created_at,
          payment_method: 'PIX',
          status: p.status || 'completed'
        }));
        setPaymentHistory(history);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getPlanName = (type: string) => {
    switch (type) {
      case 'mensal': return 'Plano Mensal';
      case 'trimestral': return 'Plano Trimestral';
      case 'anual': return 'Plano Anual';
      default: return 'Plano VIP';
    }
  };

  const getPlanPrice = (type: string) => {
    switch (type) {
      case 'mensal': return 'R$ 29,90/mês';
      case 'trimestral': return 'R$ 69,90/trimestre';
      case 'anual': return 'R$ 199,90/ano';
      default: return '-';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10" style={{
        background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
      }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
            className="text-gray-800 hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          
          <img src={coconudiLogo} alt="CocoNudi" className="h-8" />
          
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* VIP Status Card */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isPremium && premiumData ? (
            <div className="bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/20 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
              {/* Background decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-500/30 rounded-full">
                    <Crown className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Você é VIP!</h1>
                    <p className="text-amber-300/80">{getPlanName(premiumData.subscription_type)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Dias Restantes</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{getDaysRemaining()}</p>
                  </div>
                  
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Início</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {format(new Date(premiumData.subscription_start), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Renovação</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {format(new Date(premiumData.subscription_end), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-xs">Valor</span>
                    </div>
                    <p className="text-sm font-medium text-green-400">
                      {getPlanPrice(premiumData.subscription_type)}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-black/20 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Seus Benefícios VIP
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Conteúdo Premium Exclusivo',
                      'Sem Anúncios',
                      'Chat Prioritário',
                      'Badge VIP no Perfil',
                      'Acesso Antecipado',
                      'Suporte Prioritário'
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <Shield className="w-3 h-3 text-green-400" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 text-center">
              <Crown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Você ainda não é VIP</h2>
              <p className="text-gray-400 mb-6">
                Assine agora e tenha acesso a conteúdo exclusivo e benefícios especiais!
              </p>
              <Button 
                onClick={() => navigate('/subscribe')}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold"
              >
                <Crown className="w-4 h-4 mr-2" />
                Tornar-se VIP
              </Button>
            </div>
          )}
        </motion.div>

        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            Histórico de Pagamentos
          </h2>

          {loadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-900/50 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className="space-y-3">
              {paymentHistory.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-900/50 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <CreditCard className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {payment.payment_method}
                      </p>
                      <p className="text-sm text-gray-400">
                        {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">
                      R$ {payment.amount.toFixed(2).replace('.', ',')}
                    </p>
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                      Aprovado
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900/50 border border-white/10 rounded-xl p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum pagamento encontrado</p>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        {isPremium && (
          <motion.div
            className="mt-8 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              variant="outline"
              onClick={() => navigate('/subscribe')}
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Alterar Plano
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              disabled
            >
              Cancelar Assinatura
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
