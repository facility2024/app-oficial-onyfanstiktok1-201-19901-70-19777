import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, User, Loader2, CheckCircle, Crown, ShieldCheck, QrCode, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// === UTILS ===
const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};


const formatCardNumber = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length > 2) return d.slice(0, 2) + '/' + d.slice(2);
  return d;
};

const validateCpf = (cpf: string): boolean => {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(d[10]);
};

const validateLuhn = (num: string): boolean => {
  const d = num.replace(/\D/g, '');
  if (d.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useCurrentUser();

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');

  // Form state
  const [cpf, setCpf] = useState('');
  const [billingName, setBillingName] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // UI state
  const [processing, setProcessing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // PIX/Boleto result
  const [pixData, setPixData] = useState<{ qrCodeUrl?: string; payload?: string; expirationDate?: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ bankSlipUrl?: string; barCode?: string; dueDate?: string } | null>(null);

  // Prefill from profile
  useEffect(() => {
    if (profile) {
      if ((profile as any).phone) setPhone((profile as any).phone);
      if ((profile as any).cpf) setCpf(formatCpf((profile as any).cpf));
      if ((profile as any).billing_name) setBillingName((profile as any).billing_name);
      if ((profile as any).cep) setCep(formatCep((profile as any).cep));
      if ((profile as any).endereco) setEndereco((profile as any).endereco);
      if ((profile as any).numero) setNumero((profile as any).numero);
      if ((profile as any).complemento) setComplemento((profile as any).complemento);
      if ((profile as any).bairro) setBairro((profile as any).bairro);
      if ((profile as any).cidade) setCidade((profile as any).cidade);
      if ((profile as any).estado) setEstado((profile as any).estado);
    }
  }, [profile]);

  // CEP auto-complete
  const fetchCep = useCallback(async (cepValue: string) => {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
        setComplemento(data.complemento || '');
      }
    } catch { /* ignore */ }
    setLoadingCep(false);
  }, []);

  useEffect(() => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length === 8) fetchCep(clean);
  }, [cep, fetchCep]);

  // Validate form
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!validateCpf(cpf)) e.cpf = 'CPF inválido';
    if (!billingName.trim() || billingName.trim().length < 3) e.billingName = 'Nome obrigatório';
    if (cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido';
    if (!endereco.trim()) e.endereco = 'Endereço obrigatório';
    if (!numero.trim()) e.numero = 'Número obrigatório';
    if (!bairro.trim()) e.bairro = 'Bairro obrigatório';
    if (!cidade.trim()) e.cidade = 'Cidade obrigatória';
    if (!estado.trim()) e.estado = 'Estado obrigatório';

    // Card-only validations
    if (paymentMethod === 'CREDIT_CARD') {
      if (!cardHolder.trim()) e.cardHolder = 'Nome no cartão obrigatório';
      if (!validateLuhn(cardNumber)) e.cardNumber = 'Número do cartão inválido';
      const expParts = cardExpiry.split('/');
      if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) {
        e.cardExpiry = 'Validade inválida (MM/AA)';
      } else {
        const m = parseInt(expParts[0]);
        if (m < 1 || m > 12) e.cardExpiry = 'Mês inválido';
      }
      if (cardCvv.length < 3 || cardCvv.length > 4) e.cardCvv = 'CVV inválido';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validate()) { toast.error('Corrija os campos destacados'); return; }
    if (!user) { toast.error('Faça login primeiro'); navigate('/auth'); return; }

    setProcessing(true);
    setPixData(null);
    setBoletoData(null);

    try {
      const payload: any = {
        cpf: cpf.replace(/\D/g, ''),
        billing_name: billingName,
        phone: phone.replace(/\D/g, ''),
        cep: cep.replace(/\D/g, ''),
        endereco, numero, complemento, bairro, cidade, estado,
        plan_type: 'mensal',
        billing_type: paymentMethod,
      };

      if (paymentMethod === 'CREDIT_CARD') {
        const expParts = cardExpiry.split('/');
        payload.card_number = cardNumber.replace(/\s/g, '');
        payload.card_holder = cardHolder;
        payload.card_expiry_month = expParts[0];
        payload.card_expiry_year = `20${expParts[1]}`;
        payload.card_cvv = cardCvv;
      }

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: payload,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao processar pagamento');

      if (data.status === 'APPROVED') {
        setShowSuccess(true);
      } else if (data.billingType === 'PIX' && data.pix) {
        setPixData(data.pix);
        toast.success('PIX gerado! Escaneie o QR Code ou copie o código.');
        // Start polling for PIX
        setPolling(true);
        pollStatus(data.paymentId || data.subscriptionId);
      } else if (data.billingType === 'BOLETO' && data.boleto) {
        setBoletoData(data.boleto);
        toast.success('Boleto gerado! Pague antes do vencimento.');
        setPolling(true);
        pollStatus(data.paymentId || data.subscriptionId);
      } else {
        setPolling(true);
        pollStatus(data.subscriptionId);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Erro ao processar pagamento. Verifique os dados e tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const pollStatus = async (paymentOrSubId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke('check-payment-status', {
          body: { subscription_id: paymentOrSubId },
        });

        if (data?.status === 'APPROVED') {
          setPolling(false);
          setPixData(null);
          setBoletoData(null);
          setShowSuccess(true);
          return;
        }
        if (data?.status === 'REJECTED') {
          setPolling(false);
          toast.error('Pagamento recusado.');
          return;
        }
      } catch { /* continue polling */ }

      if (attempts < maxAttempts) {
        setTimeout(poll, 3000);
      } else {
        setPolling(false);
        toast.error('Tempo esgotado. Verifique o status do pagamento em seu perfil.');
      }
    };

    poll();
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate('/app');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Você precisa estar logado</p>
          <Button onClick={() => navigate('/auth')}>Fazer Login</Button>
        </div>
      </div>
    );
  }

  const inputClass = "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-amber-500 focus:ring-amber-500/20";
  const errorClass = "text-red-400 text-xs mt-1";

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={handleSuccessClose}>
        <DialogContent className="bg-gray-900 border-amber-500/30 text-center max-w-sm">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Pagamento Aprovado!</h2>
            <p className="text-gray-400">
              Sua assinatura VIP foi ativada com sucesso. Aproveite todo o conteúdo exclusivo!
            </p>
            <div className="flex items-center gap-2 text-amber-400">
              <Crown className="w-5 h-5" />
              <span className="font-semibold">Você agora é VIP!</span>
            </div>
            <Button onClick={handleSuccessClose} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold mt-2">
              Voltar para o App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Polling overlay (only for credit card, not PIX/Boleto which show inline) */}
      {polling && !pixData && !boletoData && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
            <p className="text-white text-lg">Verificando pagamento...</p>
            <p className="text-gray-400 text-sm mt-1">Aguarde enquanto confirmamos</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-white">Checkout Seguro</h1>
        <ShieldCheck className="w-5 h-5 text-green-500 ml-auto" />
      </header>

      {/* Plan summary */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-white font-bold">Plano VIP Mensal</p>
              <p className="text-gray-400 text-sm">Acesso completo por 30 dias</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-400">R$ 19,90</p>
            <p className="text-gray-500 text-xs">/mês</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Payment method selector */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {([
                { method: 'CREDIT_CARD' as PaymentMethod, icon: CreditCard, label: 'Cartão' },
                { method: 'PIX' as PaymentMethod, icon: QrCode, label: 'PIX' },
                { method: 'BOLETO' as PaymentMethod, icon: FileText, label: 'Boleto' },
              ]).map(({ method, icon: Icon, label }) => (
                <button
                  key={method}
                  onClick={() => { setPaymentMethod(method); setPixData(null); setBoletoData(null); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === method
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personal data */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" /> Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-sm">CPF</Label>
              <Input value={cpf} onChange={e => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} className={inputClass} />
              {errors.cpf && <p className={errorClass}>{errors.cpf}</p>}
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Nome completo (faturamento)</Label>
              <Input value={billingName} onChange={e => setBillingName(e.target.value)} placeholder="Nome como no documento" className={inputClass} />
              {errors.billingName && <p className={errorClass}>{errors.billingName}</p>}
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Telefone (com DDD)</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11999999999" className={inputClass} />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" /> Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-sm">CEP</Label>
              <div className="relative">
                <Input value={cep} onChange={e => setCep(formatCep(e.target.value))} placeholder="00000-000" maxLength={9} className={inputClass} />
                {loadingCep && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-amber-500" />}
              </div>
              {errors.cep && <p className={errorClass}>{errors.cep}</p>}
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Logradouro</Label>
              <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, Avenida..." className={inputClass} />
              {errors.endereco && <p className={errorClass}>{errors.endereco}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-gray-300 text-sm">Número</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Nº" className={inputClass} />
                {errors.numero && <p className={errorClass}>{errors.numero}</p>}
              </div>
              <div className="col-span-2">
                <Label className="text-gray-300 text-sm">Complemento</Label>
                <Input value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Apto, Sala..." className={inputClass} />
              </div>
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Bairro</Label>
              <Input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className={inputClass} />
              {errors.bairro && <p className={errorClass}>{errors.bairro}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-gray-300 text-sm">Cidade</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className={inputClass} />
                {errors.cidade && <p className={errorClass}>{errors.cidade}</p>}
              </div>
              <div>
                <Label className="text-gray-300 text-sm">UF</Label>
                <Input value={estado} onChange={e => setEstado(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" maxLength={2} className={inputClass} />
                {errors.estado && <p className={errorClass}>{errors.estado}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card data - only for credit card */}
        {paymentMethod === 'CREDIT_CARD' && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" /> Dados do Cartão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-gray-300 text-sm">Nome no cartão</Label>
                <Input value={cardHolder} onChange={e => setCardHolder(e.target.value.toUpperCase())} placeholder="NOME COMO NO CARTÃO" className={inputClass} />
                {errors.cardHolder && <p className={errorClass}>{errors.cardHolder}</p>}
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Número do cartão</Label>
                <Input value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} className={inputClass} />
                {errors.cardNumber && <p className={errorClass}>{errors.cardNumber}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-gray-300 text-sm">Validade</Label>
                  <Input value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/AA" maxLength={5} className={inputClass} />
                  {errors.cardExpiry && <p className={errorClass}>{errors.cardExpiry}</p>}
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">CVV</Label>
                  <Input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" maxLength={4} type="password" className={inputClass} />
                  {errors.cardCvv && <p className={errorClass}>{errors.cardCvv}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PIX info */}
        {paymentMethod === 'PIX' && !pixData && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <QrCode className="w-12 h-12 text-green-400" />
                <p className="text-white font-medium">Pagamento via PIX</p>
                <p className="text-gray-400 text-sm">
                  Ao finalizar, um QR Code será gerado para você pagar instantaneamente.
                  A confirmação é automática.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PIX QR Code result */}
        {pixData && (
          <Card className="bg-gray-900/50 border-green-500/30 border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-400 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5" /> PIX Gerado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pixData.qrCodeUrl && (
                <div className="flex justify-center">
                  <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 rounded-lg bg-white p-2" />
                </div>
              )}
              {pixData.payload && (
                <div>
                  <Label className="text-gray-300 text-sm mb-1 block">Código PIX (Copia e Cola)</Label>
                  <div className="flex gap-2">
                    <Input value={pixData.payload} readOnly className="bg-gray-800 border-gray-700 text-white text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(pixData.payload!)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              {pixData.expirationDate && (
                <p className="text-yellow-400 text-xs text-center">
                  ⏳ Expira em: {new Date(pixData.expirationDate).toLocaleString('pt-BR')}
                </p>
              )}
              {polling && (
                <div className="flex items-center justify-center gap-2 text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Aguardando confirmação do pagamento...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Boleto info */}
        {paymentMethod === 'BOLETO' && !boletoData && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <FileText className="w-12 h-12 text-blue-400" />
                <p className="text-white font-medium">Pagamento via Boleto</p>
                <p className="text-gray-400 text-sm">
                  Um boleto será gerado com vencimento em 3 dias úteis.
                  A ativação ocorre após a compensação (1-3 dias úteis).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boleto result */}
        {boletoData && (
          <Card className="bg-gray-900/50 border-blue-500/30 border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-400 text-base flex items-center gap-2">
                <FileText className="w-5 h-5" /> Boleto Gerado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {boletoData.barCode && (
                <div>
                  <Label className="text-gray-300 text-sm mb-1 block">Código de Barras</Label>
                  <div className="flex gap-2">
                    <Input value={boletoData.barCode} readOnly className="bg-gray-800 border-gray-700 text-white text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(boletoData.barCode!)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              {boletoData.dueDate && (
                <p className="text-yellow-400 text-xs text-center">
                  📅 Vencimento: {new Date(boletoData.dueDate).toLocaleDateString('pt-BR')}
                </p>
              )}
              {boletoData.bankSlipUrl && (
                <Button
                  onClick={() => window.open(boletoData.bankSlipUrl, '_blank')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" /> Ver Boleto Completo
                </Button>
              )}
              {polling && (
                <div className="flex items-center justify-center gap-2 text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Aguardando compensação do boleto...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* CTA */}
      {!pixData && !boletoData && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
          <Button
            onClick={handleSubmit}
            disabled={processing}
            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processando...</>
            ) : paymentMethod === 'PIX' ? (
              <><QrCode className="w-5 h-5 mr-2" />Gerar PIX - R$ 19,90</>
            ) : paymentMethod === 'BOLETO' ? (
              <><FileText className="w-5 h-5 mr-2" />Gerar Boleto - R$ 19,90</>
            ) : (
              <><ShieldCheck className="w-5 h-5 mr-2" />Finalizar Pagamento - R$ 19,90</>
            )}
          </Button>
          <p className="text-center text-gray-500 text-xs mt-2">
            🔒 Pagamento seguro • Dados criptografados
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
