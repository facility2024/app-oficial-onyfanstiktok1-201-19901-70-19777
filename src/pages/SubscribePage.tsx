import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Check, Sparkles, Star, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import coconudiLogo from '@/assets/coconudi-logo-header.png';

interface VIPPlan {
  price: number;
  discount?: string;
  popular?: boolean;
  features: string[];
  paymentUrl?: string;
}

interface VIPPlans {
  mensal: VIPPlan;
  trimestral: VIPPlan;
  anual: VIPPlan;
}

const defaultVIPPlans: VIPPlans = {
  mensal: {
    price: 19.99,
    features: [
      'Acesso a conteúdo premium',
      'Sem anúncios',
      'Chat exclusivo com modelos',
      'Badge VIP no perfil'
    ],
    paymentUrl: 'https://pay.hoopay.com.br/?productId[]=6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1&qty[]=1'
  },
  trimestral: {
    price: 49.99,
    discount: '17% OFF',
    popular: true,
    features: [
      'Tudo do plano Mensal',
      'Acesso antecipado a novidades',
      'Suporte prioritário',
      'Conteúdo exclusivo semanal'
    ],
    paymentUrl: 'https://p.hoopay.com.br/v/f488d9e1-3e79-4ea5-a9cc-4a108bb03c92'
  },
  anual: {
    price: 149.99,
    discount: '38% OFF',
    features: [
      'Tudo do plano Trimestral',
      'Lives exclusivas VIP',
      'Sorteios e brindes',
      'Perfil verificado especial'
    ],
    paymentUrl: 'https://p.hoopay.com.br/v/61207e4a-9455-4cb8-8207-9002a87c5fe6'
  }
};

const SubscribePage = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [vipPlans, setVipPlans] = useState<VIPPlans>(defaultVIPPlans);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch VIP plans from localStorage
    const fetchPlans = () => {
      try {
        const stored = localStorage.getItem('vip_plans');
        if (stored) {
          setVipPlans(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error fetching VIP plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = (planKey: string) => {
    setSelectedPlan(planKey);
    
    const plan = vipPlans[planKey as keyof VIPPlans];
    if (plan?.paymentUrl) {
      window.open(plan.paymentUrl, '_blank');
      return;
    }
    
    toast.info('Sistema de pagamento em breve!', {
      description: 'Estamos preparando a melhor experiência de pagamento para você.',
      duration: 3000
    });
  };

  const planIcons = {
    mensal: <Star className="w-6 h-6" />,
    trimestral: <Crown className="w-6 h-6" />,
    anual: <Zap className="w-6 h-6" />
  };

  const planNames = {
    mensal: 'Mensal',
    trimestral: 'Trimestral',
    anual: 'Anual'
  };

  const planPeriods = {
    mensal: '/mês',
    trimestral: '/3 meses',
    anual: '/ano'
  };

  const planDescriptions = {
    mensal: '30 dias de acesso',
    trimestral: '90 dias de acesso',
    anual: '365 dias de acesso'
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Header */}
      <header 
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(90deg, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
        }}
      >
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="text-black hover:bg-black/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <h1 className="text-xl font-bold text-black">Seja VIP</h1>
        
        <img 
          src={coconudiLogo} 
          alt="CocoNudi" 
          className="h-8 w-auto"
        />
      </header>

      {/* Hero Section */}
      <div className="relative px-4 py-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-transparent to-transparent" />
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Torne-se <span className="text-amber-400">VIP</span>
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Desbloqueie acesso exclusivo a conteúdos premium, recursos especiais e muito mais!
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="px-4 pb-8 space-y-4">
        {(Object.keys(vipPlans) as Array<keyof VIPPlans>).map((planKey) => {
          const plan = vipPlans[planKey];
          return (
            <Card 
              key={planKey}
              className={`relative bg-gray-900/50 border transition-all cursor-pointer ${
                selectedPlan === planKey 
                  ? 'border-amber-500 shadow-lg shadow-amber-500/20' 
                  : 'border-white/10 hover:border-white/20'
              } ${plan.popular ? 'ring-2 ring-amber-500/50' : ''}`}
              onClick={() => setSelectedPlan(planKey)}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Mais Popular
                </Badge>
              )}
              
              {plan.discount && (
                <Badge className="absolute -top-3 right-4 bg-green-500 text-white font-semibold">
                  {plan.discount}
                </Badge>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      plan.popular 
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' 
                        : 'bg-white/10 text-white'
                    }`}>
                      {planIcons[planKey]}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{planNames[planKey]}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {planDescriptions[planKey]}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-gray-500 text-sm">{planPeriods[planKey]}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA Button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <Button 
          className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
          onClick={() => handleSelectPlan(selectedPlan || 'mensal')}
          disabled={!selectedPlan}
        >
          <Crown className="w-5 h-5 mr-2" />
          {selectedPlan ? `Assinar ${planNames[selectedPlan as keyof typeof planNames]}` : 'Selecione um plano'}
        </Button>
        
        <p className="text-center text-gray-500 text-xs mt-3">
          🔒 Pagamento seguro • Cancele quando quiser
        </p>
      </div>
    </div>
  );
};

export default SubscribePage;
