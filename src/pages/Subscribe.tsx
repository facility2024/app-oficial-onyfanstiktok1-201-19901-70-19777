import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Crown, 
  Check, 
  Copy, 
  ArrowLeft, 
  CreditCard, 
  QrCode,
  Shield,
  Star,
  Zap,
  Heart,
  Gift,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useHoopayPayment, SUBSCRIPTION_PLANS, type CustomerData, type CardData, type AddressData } from '@/hooks/useHoopayPayment';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

type Step = 'plan' | 'info' | 'payment' | 'success';
type PaymentMethod = 'pix' | 'credit_card';

const benefits = [
  { icon: Star, text: 'Acesso a todos os conteúdos exclusivos' },
  { icon: Heart, text: 'Chat direto com modelos' },
  { icon: Zap, text: 'Vídeos em alta qualidade' },
  { icon: Gift, text: 'Promoções e descontos especiais' },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const { loading, verifying, paymentData, createCharge, verifyPayment, copyPixCode, plans } = useHoopayPayment();
  
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<string>('trimestral');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  
  // Customer data
  const [customer, setCustomer] = useState<CustomerData>({
    name: '',
    email: '',
    phone: '',
    document: '',
  });
  
  // Card data
  const [cardData, setCardData] = useState<CardData>({
    number: '',
    holder_name: '',
    expiration_month: '',
    expiration_year: '',
    cvv: '',
  });
  
  // Address data
  const [address, setAddress] = useState<AddressData>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = 'Assine o VIP - CocoNudi';
  }, []);

  // Polling for PIX payment
  useEffect(() => {
    if (step === 'payment' && paymentMethod === 'pix' && paymentData?.order_uuid) {
      const interval = setInterval(async () => {
        const result = await verifyPayment(paymentData.order_uuid!);
        if (result.is_paid) {
          setStep('success');
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [step, paymentMethod, paymentData]);

  const validateCustomerData = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!customer.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!customer.email.trim() || !customer.email.includes('@')) newErrors.email = 'Email inválido';
    if (!customer.phone.trim() || customer.phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Telefone inválido';
    if (!customer.document.trim() || customer.document.replace(/\D/g, '').length !== 11) newErrors.document = 'CPF inválido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCardData = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!cardData.number.trim() || cardData.number.replace(/\s/g, '').length < 16) newErrors.cardNumber = 'Número do cartão inválido';
    if (!cardData.holder_name.trim()) newErrors.holderName = 'Nome do titular é obrigatório';
    if (!cardData.expiration_month.trim()) newErrors.expMonth = 'Mês inválido';
    if (!cardData.expiration_year.trim()) newErrors.expYear = 'Ano inválido';
    if (!cardData.cvv.trim() || cardData.cvv.length < 3) newErrors.cvv = 'CVV inválido';
    
    if (!address.street.trim()) newErrors.street = 'Rua é obrigatória';
    if (!address.number.trim()) newErrors.addressNumber = 'Número é obrigatório';
    if (!address.neighborhood.trim()) newErrors.neighborhood = 'Bairro é obrigatório';
    if (!address.city.trim()) newErrors.city = 'Cidade é obrigatória';
    if (!address.state.trim()) newErrors.state = 'Estado é obrigatório';
    if (!address.zipcode.trim() || address.zipcode.replace(/\D/g, '').length !== 8) newErrors.zipcode = 'CEP inválido';
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToInfo = () => {
    setStep('info');
  };

  const handleContinueToPayment = async () => {
    if (!validateCustomerData()) return;
    
    if (paymentMethod === 'credit_card') {
      setStep('payment');
    } else {
      // For PIX, create charge immediately
      const result = await createCharge(selectedPlan, 'pix', customer);
      if (result.success) {
        setStep('payment');
      }
    }
  };

  const handleProcessCardPayment = async () => {
    if (!validateCardData()) return;
    
    const result = await createCharge(selectedPlan, 'credit_card', customer, cardData, address);
    if (result.success && result.status === 'paid') {
      setStep('success');
    }
  };

  const handleManualCheck = async () => {
    if (paymentData?.order_uuid) {
      const result = await verifyPayment(paymentData.order_uuid);
      if (result.is_paid) {
        setStep('success');
      }
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\s\d{4})\d+?$/, '$1');
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  // Redirect if already premium
  if (isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-900/80 border-yellow-500/30">
          <CardContent className="p-8 text-center">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Você já é VIP!</h2>
            <p className="text-gray-400 mb-6">Aproveite todos os benefícios exclusivos.</p>
            <Button onClick={() => navigate('/app')} className="bg-gradient-to-r from-yellow-500 to-orange-500">
              Voltar ao App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => step === 'plan' ? navigate('/app') : setStep(step === 'payment' ? 'info' : 'plan')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              Assinatura VIP
            </h1>
            <p className="text-gray-400 text-sm">
              {step === 'plan' && 'Escolha seu plano'}
              {step === 'info' && 'Seus dados'}
              {step === 'payment' && 'Pagamento'}
              {step === 'success' && 'Confirmado!'}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['plan', 'info', 'payment', 'success'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s ? 'bg-yellow-500 text-black' : 
                ['plan', 'info', 'payment', 'success'].indexOf(step) > i ? 'bg-green-500 text-white' : 
                'bg-gray-700 text-gray-400'
              }`}>
                {['plan', 'info', 'payment', 'success'].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 3 && <div className={`w-12 h-1 mx-1 ${['plan', 'info', 'payment', 'success'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step: Plan Selection */}
        {step === 'plan' && (
          <div className="space-y-6">
            {/* Benefits */}
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Benefícios VIP</h3>
                <div className="grid grid-cols-2 gap-3">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-300">
                      <benefit.icon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <span className="text-sm">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Plans */}
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    selectedPlan === plan.id 
                      ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500' 
                      : 'bg-gray-900/50 border-white/10 hover:border-white/30'
                  } ${plan.popular ? 'ring-2 ring-yellow-500' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardContent className="p-6 text-center relative">
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                        MAIS POPULAR
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold text-yellow-500 mb-1">{plan.priceFormatted}</div>
                    <p className="text-gray-400 text-sm mb-4">
                      {plan.id === 'mensal' && '/mês'}
                      {plan.id === 'trimestral' && '/3 meses'}
                      {plan.id === 'anual' && '/ano'}
                    </p>
                    {plan.discount && (
                      <div className="inline-block bg-green-500/20 text-green-400 text-sm px-3 py-1 rounded-full">
                        Economia de {plan.discount}%
                      </div>
                    )}
                    <div className={`mt-4 w-6 h-6 mx-auto rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'border-yellow-500 bg-yellow-500' : 'border-gray-500'
                    }`}>
                      {selectedPlan === plan.id && <Check className="w-4 h-4 text-black" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Payment Method */}
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Forma de Pagamento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className={`p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'pix' 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <QrCode className={`w-6 h-6 ${paymentMethod === 'pix' ? 'text-yellow-500' : 'text-gray-400'}`} />
                    <span className={paymentMethod === 'pix' ? 'text-white' : 'text-gray-400'}>PIX</span>
                  </button>
                  <button
                    className={`p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'credit_card' 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                    onClick={() => setPaymentMethod('credit_card')}
                  >
                    <CreditCard className={`w-6 h-6 ${paymentMethod === 'credit_card' ? 'text-yellow-500' : 'text-gray-400'}`} />
                    <span className={paymentMethod === 'credit_card' ? 'text-white' : 'text-gray-400'}>Cartão</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleContinueToInfo}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-6 text-lg"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step: Customer Info */}
        {step === 'info' && (
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Seus Dados</h3>
                
                <div>
                  <Label className="text-gray-300">Nome Completo</Label>
                  <Input 
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="Seu nome completo"
                  />
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label className="text-gray-300">Email</Label>
                  <Input 
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="seu@email.com"
                  />
                  {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label className="text-gray-300">WhatsApp</Label>
                  <Input 
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: formatPhone(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                  {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <Label className="text-gray-300">CPF</Label>
                  <Input 
                    value={customer.document}
                    onChange={(e) => setCustomer({ ...customer, document: formatCPF(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.document && <p className="text-red-400 text-sm mt-1">{errors.document}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-sm">Plano selecionado</p>
                    <p className="text-white font-semibold">{selectedPlanData?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Total</p>
                    <p className="text-2xl font-bold text-yellow-500">{selectedPlanData?.priceFormatted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleContinueToPayment}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-6 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                `Pagar com ${paymentMethod === 'pix' ? 'PIX' : 'Cartão'}`
              )}
            </Button>
          </div>
        )}

        {/* Step: Payment - PIX */}
        {step === 'payment' && paymentMethod === 'pix' && (
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-4">Escaneie o QR Code</h3>
                
                {paymentData?.pix_qr_code ? (
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <img 
                      src={`data:image/png;base64,${paymentData.pix_qr_code}`} 
                      alt="QR Code PIX" 
                      className="w-48 h-48"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-800 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-600" />
                  </div>
                )}

                <p className="text-gray-400 text-sm mb-4">
                  Valor: <span className="text-yellow-500 font-bold">{selectedPlanData?.priceFormatted}</span>
                </p>

                {paymentData?.pix_code && (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">Ou copie o código PIX:</p>
                    <div className="bg-gray-800 p-3 rounded-lg flex items-center gap-2">
                      <code className="text-xs text-gray-300 flex-1 overflow-hidden text-ellipsis">
                        {paymentData.pix_code.substring(0, 50)}...
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyPixCode(paymentData.pix_code!)}
                        className="flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <p className="text-yellow-500 text-sm">
                    {verifying ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando pagamento...
                      </span>
                    ) : (
                      'Aguardando pagamento... O status será atualizado automaticamente.'
                    )}
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  onClick={handleManualCheck}
                  disabled={verifying}
                  className="mt-4"
                >
                  Já paguei, verificar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Payment - Credit Card */}
        {step === 'payment' && paymentMethod === 'credit_card' && (
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Dados do Cartão</h3>
                
                <div>
                  <Label className="text-gray-300">Número do Cartão</Label>
                  <Input 
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                  />
                  {errors.cardNumber && <p className="text-red-400 text-sm mt-1">{errors.cardNumber}</p>}
                </div>

                <div>
                  <Label className="text-gray-300">Nome no Cartão</Label>
                  <Input 
                    value={cardData.holder_name}
                    onChange={(e) => setCardData({ ...cardData, holder_name: e.target.value.toUpperCase() })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="NOME COMO NO CARTÃO"
                  />
                  {errors.holderName && <p className="text-red-400 text-sm mt-1">{errors.holderName}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Mês</Label>
                    <Input 
                      value={cardData.expiration_month}
                      onChange={(e) => setCardData({ ...cardData, expiration_month: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="MM"
                      maxLength={2}
                    />
                    {errors.expMonth && <p className="text-red-400 text-sm mt-1">{errors.expMonth}</p>}
                  </div>
                  <div>
                    <Label className="text-gray-300">Ano</Label>
                    <Input 
                      value={cardData.expiration_year}
                      onChange={(e) => setCardData({ ...cardData, expiration_year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="AAAA"
                      maxLength={4}
                    />
                    {errors.expYear && <p className="text-red-400 text-sm mt-1">{errors.expYear}</p>}
                  </div>
                  <div>
                    <Label className="text-gray-300">CVV</Label>
                    <Input 
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="123"
                      maxLength={4}
                    />
                    {errors.cvv && <p className="text-red-400 text-sm mt-1">{errors.cvv}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Endereço de Cobrança</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-gray-300">CEP</Label>
                    <Input 
                      value={address.zipcode}
                      onChange={(e) => setAddress({ ...address, zipcode: formatCEP(e.target.value) })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {errors.zipcode && <p className="text-red-400 text-sm mt-1">{errors.zipcode}</p>}
                  </div>
                  <div>
                    <Label className="text-gray-300">Estado</Label>
                    <Input 
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase().slice(0, 2) })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="SP"
                      maxLength={2}
                    />
                    {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Cidade</Label>
                  <Input 
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="São Paulo"
                  />
                  {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <Label className="text-gray-300">Bairro</Label>
                  <Input 
                    value={address.neighborhood}
                    onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="Centro"
                  />
                  {errors.neighborhood && <p className="text-red-400 text-sm mt-1">{errors.neighborhood}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-gray-300">Rua</Label>
                    <Input 
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="Rua das Flores"
                    />
                    {errors.street && <p className="text-red-400 text-sm mt-1">{errors.street}</p>}
                  </div>
                  <div>
                    <Label className="text-gray-300">Número</Label>
                    <Input 
                      value={address.number}
                      onChange={(e) => setAddress({ ...address, number: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="123"
                    />
                    {errors.addressNumber && <p className="text-red-400 text-sm mt-1">{errors.addressNumber}</p>}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Complemento (opcional)</Label>
                  <Input 
                    value={address.complement}
                    onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="Apto 101"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gray-900/50 border-white/10">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-400 text-sm">Plano selecionado</p>
                    <p className="text-white font-semibold">{selectedPlanData?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Total</p>
                    <p className="text-2xl font-bold text-yellow-500">{selectedPlanData?.priceFormatted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleProcessCardPayment}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-6 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                `Pagar ${selectedPlanData?.priceFormatted}`
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Pagamento 100% seguro</span>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-green-500/30">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Pagamento Confirmado!</h2>
                <p className="text-gray-400 mb-6">
                  Bem-vindo ao VIP! Agora você tem acesso a todos os conteúdos exclusivos.
                </p>
                
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                  <p className="text-gray-400 text-sm">Plano ativado</p>
                  <p className="text-xl font-bold text-yellow-500">{selectedPlanData?.name}</p>
                </div>

                <Button 
                  onClick={() => navigate('/app')}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-6 text-lg"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Acessar Conteúdo VIP
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
