import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Check, Sparkles, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import coconudiLogo from '@/assets/coconudi-logo-header.png';

interface PlanProps {
  name: string;
  price: string;
  period: string;
  discount?: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
}

const plans: PlanProps[] = [
  {
    name: 'Mensal',
    price: 'R$ 19,99',
    period: '/mês',
    features: [
      'Acesso a conteúdo premium',
      'Sem anúncios',
      'Chat exclusivo com modelos',
      'Badge VIP no perfil'
    ],
    icon: <Star className="w-6 h-6" />
  },
  {
    name: 'Trimestral',
    price: 'R$ 49,99',
    period: '/3 meses',
    discount: '17% OFF',
    popular: true,
    features: [
      'Tudo do plano Mensal',
      'Acesso antecipado a novidades',
      'Suporte prioritário',
      'Conteúdo exclusivo semanal'
    ],
    icon: <Crown className="w-6 h-6" />
  },
  {
    name: 'Anual',
    price: 'R$ 149,99',
    period: '/ano',
    discount: '38% OFF',
    features: [
      'Tudo do plano Trimestral',
      'Lives exclusivas VIP',
      'Sorteios e brindes',
      'Perfil verificado especial'
    ],
    icon: <Zap className="w-6 h-6" />
  }
];

const SubscribePage = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    
    // Redirect to Hoopay payment URL for Mensal plan
    if (planName === 'Mensal') {
      window.open('https://pay.hoopay.com.br/?productId[]=6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1&qty[]=1', '_blank');
      return;
    }
    
    // Redirect to Hoopay payment URL for Trimestral plan
    if (planName === 'Trimestral') {
      window.open('https://p.hoopay.com.br/v/f488d9e1-3e79-4ea5-a9cc-4a108bb03c92', '_blank');
      return;
    }
    
    // Redirect to Hoopay payment URL for Anual plan
    if (planName === 'Anual') {
      window.open('https://p.hoopay.com.br/v/61207e4a-9455-4cb8-8207-9002a87c5fe6', '_blank');
      return;
    }
    
    toast.info('Sistema de pagamento em breve!', {
      description: 'Estamos preparando a melhor experiência de pagamento para você.',
      duration: 3000
    });
  };

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Header */}
      <header 
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(90deg, rgba(0, 245, 212, 0.95) 0%, rgba(0, 255, 135, 0.9) 25%, rgba(150, 255, 0, 0.85) 50%, rgba(255, 230, 0, 0.9) 75%, rgba(255, 217, 61, 0.95) 100%)'
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
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={`relative bg-gray-900/50 border transition-all cursor-pointer ${
              selectedPlan === plan.name 
                ? 'border-amber-500 shadow-lg shadow-amber-500/20' 
                : 'border-white/10 hover:border-white/20'
            } ${plan.popular ? 'ring-2 ring-amber-500/50' : ''}`}
            onClick={() => setSelectedPlan(plan.name)}
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
                    {plan.icon}
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {plan.name === 'Mensal' && '30 dias de acesso'}
                      {plan.name === 'Trimestral' && '90 dias de acesso'}
                      {plan.name === 'Anual' && '365 dias de acesso'}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
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
        ))}
      </div>

      {/* CTA Button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <Button 
          className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
          onClick={() => handleSelectPlan(selectedPlan || 'Mensal')}
          disabled={!selectedPlan}
        >
          <Crown className="w-5 h-5 mr-2" />
          {selectedPlan ? `Assinar ${selectedPlan}` : 'Selecione um plano'}
        </Button>
        
        <p className="text-center text-gray-500 text-xs mt-3">
          🔒 Pagamento seguro • Cancele quando quiser
        </p>
        
        {/* Coming Soon Notice */}
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 text-center text-sm font-medium">
            ⚡ Sistema de pagamento em desenvolvimento
          </p>
          <p className="text-gray-400 text-center text-xs mt-1">
            Em breve você poderá assinar e aproveitar todos os benefícios VIP!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscribePage;
