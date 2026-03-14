import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Check, Sparkles, Star, Zap, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import coconudiLogo from '@/assets/coconudi-logo-new.png';

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
      'Acesso às Lives',
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
  const { user, profile, loading: userLoading, updateProfile } = useCurrentUser();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [vipPlans, setVipPlans] = useState<VIPPlans>(defaultVIPPlans);
  const [loading, setLoading] = useState(true);
  const [phoneInput, setPhoneInput] = useState('');
  const [cpfInput, setCpfInput] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'vip_plans')
          .maybeSingle();

        if (error) throw error;
        if (data?.setting_value) {
          setVipPlans(data.setting_value as unknown as VIPPlans);
        }
      } catch (error) {
        console.error('Error fetching VIP plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Preencher telefone do perfil se existir
  useEffect(() => {
    if (profile?.phone) {
      setPhoneInput(profile.phone);
    }
  }, [profile]);

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  // Função para salvar telefone no perfil
  const savePhoneToProfile = async () => {
    if (!user) return false;
    
    const normalizedPhone = phoneInput.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      toast.error('Telefone inválido. Use DDD + número (ex: 15988163462)');
      return false;
    }

    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: normalizedPhone } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Telefone salvo com sucesso!');
      setShowPhoneModal(false);
      return true;
    } catch (error: any) {
      console.error('Erro ao salvar telefone:', error);
      toast.error('Erro ao salvar telefone');
      return false;
    } finally {
      setSavingPhone(false);
    }
  };

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleSelectPlan = async (planKey: string) => {
    setSelectedPlan(planKey);
    
    // Verificar se usuário está logado
    if (!user) {
      toast.error('Você precisa estar logado para assinar VIP');
      localStorage.setItem('returnTo', '/subscribe');
      navigate('/auth');
      return;
    }

    // Verificar se tem telefone e CPF
    const currentPhone = profile?.phone || phoneInput.replace(/\D/g, '');
    const currentCpf = cpfInput.replace(/\D/g, '');
    if (!currentPhone || currentPhone.length < 10 || !currentCpf || currentCpf.length < 11) {
      setShowPhoneModal(true);
      toast.info('Por favor, informe seu telefone e CPF para continuar');
      return;
    }

    // Salvar telefone antes de redirecionar (se ainda não salvou)
    if (!profile?.phone && phoneInput) {
      await savePhoneToProfile();
    }

    // Chamar Edge Function do Asaas para criar checkout
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asaas-checkout', {
        body: {
          name: profile?.username || user.email?.split('@')[0] || 'Usuário',
          phone: currentPhone,
          cpf: cpfInput.replace(/\D/g, ''),
          plan_type: planKey,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.checkoutUrl) {
        throw new Error(data?.error || 'Erro ao gerar link de pagamento');
      }

      // Salvar paymentId para verificação posterior
      if (data.paymentId) {
        sessionStorage.setItem('pending_payment_id', data.paymentId);
      }

      // Abrir checkout do Asaas - redirecionar na mesma aba
      window.open(data.checkoutUrl, '_blank');
      toast.success('Pagamento aberto em nova aba!', {
        description: 'Após pagar, volte aqui e clique em "Verificar Pagamento".',
        duration: 10000,
      });

      // Redirecionar para a página de confirmação
      navigate('/payment-confirmation');
    } catch (error: any) {
      console.error('Erro ao criar checkout Asaas:', error);
      toast.error(error.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePhoneSubmit = async () => {
    const success = await savePhoneToProfile();
    if (success && selectedPlan) {
      // Tentar novamente após salvar telefone
      handleSelectPlan(selectedPlan);
    }
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

  if (loading || userLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Modal de Telefone */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-900 border-amber-500/30">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Phone className="w-8 h-8 text-amber-500" />
              </div>
              <CardTitle className="text-white text-center">Dados para Pagamento</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Precisamos do seu CPF e telefone para processar o pagamento no Asaas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-white">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpfInput.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                  onChange={(e) => setCpfInput(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="bg-gray-800 border-gray-700 text-white"
                  maxLength={14}
                />
                <p className="text-xs text-gray-500">
                  Obrigatório para pagamento no Asaas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">Telefone (com DDD)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(15) 98816-3462"
                  value={formatPhone(phoneInput)}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  className="bg-gray-800 border-gray-700 text-white"
                  maxLength={15}
                />
                <p className="text-xs text-gray-500">
                  Ex: 15988163462 (DDD + número)
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowPhoneModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                  onClick={handlePhoneSubmit}
                  disabled={savingPhone || phoneInput.replace(/\D/g, '').length < 10 || cpfInput.replace(/\D/g, '').length < 11}
                >
                  {savingPhone ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

      {/* Info de usuário logado */}
      {user && (
        <div className="px-4 py-2 bg-green-900/30 border-b border-green-500/20">
          <p className="text-sm text-green-400 text-center">
            ✓ Logado como: <strong>{user.email}</strong>
            {profile?.phone && (
              <span className="ml-2">| Tel: {formatPhone(profile.phone)}</span>
            )}
          </p>
        </div>
      )}

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

      {/* Plans - Apenas Mensal visível */}
      <div className="px-4 pb-8 space-y-4">
        {(['mensal'] as Array<keyof VIPPlans>).map((planKey) => {
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
          disabled={!selectedPlan || checkoutLoading}
        >
          {checkoutLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Crown className="w-5 h-5 mr-2" />
          )}
          {checkoutLoading ? 'Gerando pagamento...' : selectedPlan ? `Assinar ${planNames[selectedPlan as keyof typeof planNames]}` : 'Selecione um plano'}
        </Button>
        
        <p className="text-center text-gray-500 text-xs mt-3">
          🔒 Pagamento seguro • Cancele quando quiser
        </p>
      </div>
    </div>
  );
};

export default SubscribePage;
