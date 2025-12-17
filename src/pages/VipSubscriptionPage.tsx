import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, Star, Zap, ArrowLeft, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { usePixPayment } from '@/hooks/usePixPayment';
import { supabase } from '@/integrations/supabase/client';
import coconudiLogo from '@/assets/coconudi-logo-header.png';

interface Plan {
  id: 'monthly' | 'quarterly' | 'yearly';
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  days: number;
  popular?: boolean;
  icon: React.ReactNode;
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 19.99,
    days: 30,
    icon: <Star className="w-6 h-6" />
  },
  {
    id: 'quarterly',
    name: 'Trimestral',
    price: 49.99,
    originalPrice: 59.97,
    discount: '17% OFF',
    days: 90,
    popular: true,
    icon: <Zap className="w-6 h-6" />
  },
  {
    id: 'yearly',
    name: 'Anual',
    price: 149.99,
    originalPrice: 239.88,
    discount: '38% OFF',
    days: 365,
    icon: <Crown className="w-6 h-6" />
  }
];

const benefits = [
  'Acesso ilimitado a conteúdo premium',
  'Vídeos exclusivos de criadores',
  'Sem anúncios',
  'Badge VIP no perfil',
  'Chat prioritário com modelos',
  'Acesso antecipado a novos recursos'
];

export default function VipSubscriptionPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[1]);
  const [step, setStep] = useState<'select' | 'payment' | 'waiting'>('select');
  const [userData, setUserData] = useState({ name: '', email: '', whatsapp: '' });
  const [pixCode, setPixCode] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const { loading, generatePixPayment, verifyPayment, copyPixCode } = usePixPayment();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserData(prev => ({
            ...prev,
            name: profile.name || user.email?.split('@')[0] || '',
            email: profile.email || user.email || ''
          }));
        }
      }
    };
    loadUserData();
  }, []);

  const handleGeneratePix = async () => {
    if (!userData.name || !userData.email) {
      toast({ title: 'Erro', description: 'Preencha nome e email', variant: 'destructive' });
      return;
    }

    try {
      const response = await generatePixPayment({
        name: userData.name,
        email: userData.email,
        whatsapp: userData.whatsapp || '',
        plan: selectedPlan.id,
        amount: selectedPlan.price
      });

      if (response.success && response.pix_code) {
        setPixCode(response.pix_code);
        setPaymentId(response.payment_id || '');
        setStep('waiting');
        startPaymentPolling(response.payment_id || '');
      }
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
    }
  };

  const startPaymentPolling = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const result = await verifyPayment(id);
        if (result.status === 'paid') {
          clearInterval(interval);
          toast({ title: '🎉 Pagamento Confirmado!', description: 'Você agora é VIP!' });
          localStorage.setItem('is_premium', 'true');
          navigate('/app');
        }
      } catch (error) {
        console.error('Erro ao verificar:', error);
      }
    }, 5000);

    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 bg-gradient-to-r from-[rgba(0,245,212,0.95)] via-[rgba(134,239,172,0.95)] to-[rgba(255,217,61,0.95)]">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-black">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <img src={coconudiLogo} alt="CocoNudi" className="h-8" />
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mb-4">
            <Crown className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Seja VIP</h1>
          <p className="text-gray-400">Desbloqueie todo o conteúdo premium</p>
        </div>

        {step === 'select' && (
          <>
            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative p-6 cursor-pointer transition-all duration-300 ${
                    selectedPlan.id === plan.id
                      ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500'
                      : 'bg-gray-900/50 border-white/10 hover:border-white/30'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full text-xs font-bold text-black">
                      MAIS POPULAR
                    </div>
                  )}
                  {plan.discount && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 rounded text-xs font-bold text-white">
                      {plan.discount}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${selectedPlan.id === plan.id ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}>
                      {plan.icon}
                    </div>
                    <span className="text-lg font-semibold text-white">{plan.name}</span>
                  </div>

                  <div className="mb-4">
                    {plan.originalPrice && (
                      <span className="text-gray-500 line-through text-sm mr-2">
                        R$ {plan.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-2xl font-bold text-white">
                      R$ {plan.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-400">
                    {plan.days} dias de acesso
                  </div>

                  {selectedPlan.id === plan.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Benefits */}
            <Card className="p-6 bg-gray-900/50 border-white/10 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Benefícios VIP
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* User Form */}
            <Card className="p-6 bg-gray-900/50 border-white/10 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Seus dados</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={userData.name}
                  onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder:text-gray-500 focus:border-yellow-500 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={userData.email}
                  onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder:text-gray-500 focus:border-yellow-500 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (opcional)"
                  value={userData.whatsapp}
                  onChange={(e) => setUserData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder:text-gray-500 focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </Card>

            {/* CTA */}
            <Button
              onClick={handleGeneratePix}
              disabled={loading}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Crown className="w-5 h-5 mr-2" />
              )}
              Gerar PIX - R$ {selectedPlan.price.toFixed(2)}
            </Button>
          </>
        )}

        {step === 'waiting' && (
          <Card className="p-6 bg-gray-900/50 border-white/10 text-center">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Pague com PIX</h2>
            <p className="text-gray-400 mb-6">Copie o código e pague no seu banco</p>
            
            <div className="bg-black/50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-400 mb-2">Código PIX (copia e cola)</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixCode}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                />
                <Button
                  onClick={() => copyPixCode(pixCode)}
                  variant="outline"
                  size="icon"
                  className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-yellow-500 mb-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Aguardando pagamento...</span>
            </div>

            <p className="text-xs text-gray-500">
              O pagamento será confirmado automaticamente
            </p>

            <Button
              variant="ghost"
              onClick={() => setStep('select')}
              className="mt-4 text-gray-400"
            >
              Voltar aos planos
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
