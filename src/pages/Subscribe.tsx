import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Crown, Check, ArrowLeft, Sparkles, Lock, Star, Zap, Copy, QrCode, Loader2 } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { usePixPayment } from '@/hooks/usePixPayment';
import { toast } from 'sonner';

const Subscribe = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info');
  const { setPremiumStatus } = usePremiumStatus();
  const { loading, paymentData, generatePixPayment, verifyPayment, copyPixCode, verifying } = usePixPayment();

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    document.title = 'Assinatura VIP – Conteúdo premium';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Torne-se VIP para desbloquear vídeos premium.');
  }, []);

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
        if (user.user_metadata?.full_name) {
          setName(user.user_metadata.full_name);
        }
      }
    };
    checkSession();
  }, []);

  // Poll for payment verification
  useEffect(() => {
    if (!paymentData?.payment_id || step !== 'payment') return;

    const interval = setInterval(async () => {
      try {
        const result = await verifyPayment(paymentData.payment_id!);
        if (result.status === 'paid') {
          setPremiumStatus(true, email);
          setStep('success');
          toast.success('Pagamento confirmado! Seu acesso VIP foi ativado.');
          clearInterval(interval);
        }
      } catch (e) {
        // Silent fail for polling
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [paymentData?.payment_id, step, email, setPremiumStatus, verifyPayment]);

  const handleGeneratePix = async () => {
    setError(null);
    
    if (!name.trim() || !email.trim() || !whatsapp.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      await generatePixPayment({ name, email, whatsapp });
      setStep('payment');
    } catch (e: any) {
      setError(e.message || 'Erro ao gerar pagamento');
    }
  };

  const handleManualCheck = async () => {
    if (!paymentData?.payment_id) return;
    setCheckingPayment(true);
    try {
      const result = await verifyPayment(paymentData.payment_id);
      if (result.status === 'paid') {
        setPremiumStatus(true, email);
        setStep('success');
        toast.success('Pagamento confirmado!');
      } else {
        toast.info('Pagamento ainda não identificado. Aguarde alguns instantes.');
      }
    } catch (e) {
      toast.error('Erro ao verificar pagamento');
    } finally {
      setCheckingPayment(false);
    }
  };

  const benefits = [
    { icon: Lock, text: 'Acesso a todos os vídeos premium' },
    { icon: Star, text: 'Conteúdo exclusivo de criadores' },
    { icon: Zap, text: 'Sem anúncios ou interrupções' },
    { icon: Sparkles, text: 'Novos vídeos VIP toda semana' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => step === 'payment' ? setStep('info') : navigate(-1)}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 mb-4">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Acesso VIP</h1>
            <p className="text-gray-400">
              {step === 'info' && 'Desbloqueie todos os vídeos premium'}
              {step === 'payment' && 'Efetue o pagamento via PIX'}
              {step === 'success' && 'Seu acesso foi ativado!'}
            </p>
          </div>

          {step === 'info' && (
            <>
              {/* Benefits */}
              <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 p-4">
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <benefit.icon className="w-4 h-4 text-yellow-500" />
                      </div>
                      <span className="text-sm text-white">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Form */}
              <Card className="bg-gray-900/50 border-gray-700 p-6 space-y-4">
                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                    {error}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-gray-300">Nome completo</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Seu nome"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="seu@email.com"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="whatsapp" className="text-gray-300">WhatsApp</Label>
                  <Input 
                    id="whatsapp" 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)} 
                    placeholder="(11) 99999-9999"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold" 
                  onClick={handleGeneratePix} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      Gerar PIX - R$ 19,99
                    </>
                  )}
                </Button>
              </Card>
            </>
          )}

          {step === 'payment' && paymentData && (
            <Card className="bg-gray-900/50 border-gray-700 p-6 space-y-6">
              {/* Price */}
              <div className="text-center">
                <span className="text-4xl font-bold text-white">R$ {paymentData.amount?.toFixed(2)}</span>
                <p className="text-gray-400 text-sm mt-1">Assinatura VIP mensal</p>
              </div>

              {/* PIX Code */}
              <div className="space-y-3">
                <Label className="text-gray-300">Código PIX Copia e Cola</Label>
                <div className="relative">
                  <Input 
                    value={paymentData.pix_code || ''} 
                    readOnly
                    className="bg-gray-800 border-gray-600 text-white pr-12 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => copyPixCode(paymentData.pix_code || '')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-yellow-500">Como pagar:</h3>
                <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Copie o código PIX acima</li>
                  <li>Abra o app do seu banco</li>
                  <li>Escolha pagar com PIX Copia e Cola</li>
                  <li>Cole o código e confirme</li>
                </ol>
              </div>

              {/* Expiration */}
              {paymentData.expires_at && (
                <p className="text-center text-sm text-gray-400">
                  ⏱️ Válido por 30 minutos
                </p>
              )}

              {/* Verify Button */}
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleManualCheck}
                disabled={checkingPayment || verifying}
              >
                {checkingPayment || verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Já paguei, verificar
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-500">
                O sistema verifica automaticamente a cada 5 segundos
              </p>
            </Card>
          )}

          {step === 'success' && (
            <Card className="bg-gray-900/50 border-gray-700 p-6 space-y-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Parabéns! 🎉</h2>
                  <p className="text-gray-400">Seu acesso VIP foi ativado com sucesso.</p>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                onClick={() => navigate('/app')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Explorar Conteúdo Premium
              </Button>
            </Card>
          )}

          {/* Trust Badge */}
          <div className="text-center">
            <span className="inline-block px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
              🔒 Pagamento 100% seguro via PIX
            </span>
          </div>
        </div>
      </div>

      <link rel="canonical" href={window.location.origin + '/subscribe'} />
    </main>
  );
};

export default Subscribe;
