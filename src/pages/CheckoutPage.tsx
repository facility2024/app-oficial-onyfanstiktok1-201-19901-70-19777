import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, CheckCircle, ShieldCheck, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ---- Masks & Validators ----
const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d)/, '$1-$2');
};

const maskCard = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const maskExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + '/' + d.slice(2);
  return d;
};

const validateCpf = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
};

const validateLuhn = (num: string): boolean => {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useCurrentUser();

  // Personal
  const [cpf, setCpf] = useState('');
  const [billingName, setBillingName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  // Card
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // State
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill from profile
  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (profile) {
      if (profile.phone) setPhone(profile.phone);
      if ((profile as any).cpf) setCpf(maskCpf((profile as any).cpf));
      if ((profile as any).billing_name) setBillingName((profile as any).billing_name);
      if ((profile as any).cep) setCep(maskCep((profile as any).cep));
      if ((profile as any).endereco) setEndereco((profile as any).endereco);
      if ((profile as any).numero) setNumero((profile as any).numero);
      if ((profile as any).complemento) setComplemento((profile as any).complemento);
      if ((profile as any).bairro) setBairro((profile as any).bairro);
      if ((profile as any).cidade) setCidade((profile as any).cidade);
      if ((profile as any).estado) setEstado((profile as any).estado);
    }
  }, [user, profile]);

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
      }
    } catch { /* ignore */ }
    finally { setLoadingCep(false); }
  }, []);

  useEffect(() => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length === 8) fetchCep(clean);
  }, [cep, fetchCep]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!validateCpf(cpf)) e.cpf = 'CPF inválido';
    if (!billingName.trim()) e.billingName = 'Nome obrigatório';
    if (cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido';
    if (!endereco.trim()) e.endereco = 'Endereço obrigatório';
    if (!numero.trim()) e.numero = 'Número obrigatório';
    if (!bairro.trim()) e.bairro = 'Bairro obrigatório';
    if (!cidade.trim()) e.cidade = 'Cidade obrigatória';
    if (!estado.trim()) e.estado = 'Estado obrigatório';
    if (!cardName.trim()) e.cardName = 'Nome no cartão obrigatório';
    if (!validateLuhn(cardNumber)) e.cardNumber = 'Número do cartão inválido';
    const expiryParts = cardExpiry.split('/');
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) e.cardExpiry = 'Validade inválida';
    if (cardCvv.replace(/\D/g, '').length < 3) e.cardCvv = 'CVV inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Corrija os campos destacados');
      return;
    }
    if (!user) {
      toast.error('Faça login para continuar');
      navigate('/auth');
      return;
    }

    setProcessing(true);
    try {
      const expiryParts = cardExpiry.split('/');
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          cpf: cpf.replace(/\D/g, ''),
          billing_name: billingName,
          email,
          phone: phone.replace(/\D/g, ''),
          cep: cep.replace(/\D/g, ''),
          endereco, numero, complemento, bairro, cidade, estado,
          card_holder_name: cardName,
          card_number: cardNumber.replace(/\s/g, ''),
          card_expiry_month: expiryParts[0],
          card_expiry_year: '20' + expiryParts[1],
          card_ccv: cardCvv,
          plan_type: 'mensal',
          amount: 19.90,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao processar pagamento');

      // If immediate ACTIVE, show success
      if (data.status === 'ACTIVE') {
        setShowSuccess(true);
        return;
      }

      // Otherwise poll for status
      const subscriptionId = data.subscriptionId;
      let attempts = 0;
      const maxAttempts = 30;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const { data: statusData } = await supabase.functions.invoke('check-payment-status', {
            body: { subscription_id: subscriptionId },
          });
          if (statusData?.status === 'APPROVED') {
            clearInterval(poll);
            setShowSuccess(true);
          } else if (statusData?.status === 'REJECTED' || attempts >= maxAttempts) {
            clearInterval(poll);
            setProcessing(false);
            if (statusData?.status === 'REJECTED') {
              toast.error('Pagamento recusado. Verifique os dados do cartão e tente novamente.');
            } else {
              toast.error('Tempo esgotado. Se o pagamento foi aprovado, ele será processado automaticamente.');
            }
          }
        } catch {
          // continue polling
        }
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento');
      setProcessing(false);
    }
  };

  const fieldClass = (key: string) =>
    `bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 ${errors[key] ? 'border-red-500' : ''}`;

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={() => {}}>
        <DialogContent className="bg-gray-900 border-green-500/30 text-center">
          <DialogHeader>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <DialogTitle className="text-2xl text-white">Plano Assinado com Sucesso! 🎉</DialogTitle>
            <DialogDescription className="text-gray-400 text-base mt-2">
              Seu plano VIP Mensal está ativo. Aproveite todo o conteúdo exclusivo!
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full mt-4 bg-green-500 hover:bg-green-600 text-black font-bold py-3"
            onClick={() => navigate('/app')}
          >
            Ir para o App
          </Button>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 bg-gray-900/95 border-b border-gray-800">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-500" />
          Checkout Seguro
        </h1>
      </header>

      {/* Plan summary */}
      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-400 font-semibold text-sm">Plano VIP Mensal</p>
            <p className="text-gray-400 text-xs">Cobrança mensal no cartão</p>
          </div>
          <p className="text-2xl font-bold text-white">R$ 19,90<span className="text-sm text-gray-400">/mês</span></p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Section 1: Personal */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" /> Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-xs">CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                className={fieldClass('cpf')}
                maxLength={14}
              />
              {errors.cpf && <p className="text-red-400 text-xs mt-1">{errors.cpf}</p>}
            </div>
            <div>
              <Label className="text-gray-300 text-xs">Nome completo (faturamento)</Label>
              <Input
                placeholder="Nome como no documento"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                className={fieldClass('billingName')}
              />
              {errors.billingName && <p className="text-red-400 text-xs mt-1">{errors.billingName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass('email')} />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Telefone</Label>
                <Input
                  placeholder="11999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className={fieldClass('phone')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Address */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" /> Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-xs">CEP</Label>
              <div className="relative">
                <Input
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(maskCep(e.target.value))}
                  className={fieldClass('cep')}
                  maxLength={9}
                />
                {loadingCep && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-gray-400" />}
              </div>
              {errors.cep && <p className="text-red-400 text-xs mt-1">{errors.cep}</p>}
            </div>
            <div>
              <Label className="text-gray-300 text-xs">Logradouro</Label>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={fieldClass('endereco')} />
              {errors.endereco && <p className="text-red-400 text-xs mt-1">{errors.endereco}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Número</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} className={fieldClass('numero')} />
                {errors.numero && <p className="text-red-400 text-xs mt-1">{errors.numero}</p>}
              </div>
              <div className="col-span-2">
                <Label className="text-gray-300 text-xs">Complemento</Label>
                <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} className={fieldClass('')} placeholder="Opcional" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} className={fieldClass('bairro')} />
                {errors.bairro && <p className="text-red-400 text-xs mt-1">{errors.bairro}</p>}
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} className={fieldClass('cidade')} />
                {errors.cidade && <p className="text-red-400 text-xs mt-1">{errors.cidade}</p>}
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Estado</Label>
                <Input value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} className={fieldClass('estado')} maxLength={2} placeholder="UF" />
                {errors.estado && <p className="text-red-400 text-xs mt-1">{errors.estado}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Card */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" /> Dados do Cartão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-300 text-xs">Nome no cartão</Label>
              <Input
                placeholder="Como impresso no cartão"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                className={fieldClass('cardName')}
              />
              {errors.cardName && <p className="text-red-400 text-xs mt-1">{errors.cardName}</p>}
            </div>
            <div>
              <Label className="text-gray-300 text-xs">Número do cartão</Label>
              <Input
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(maskCard(e.target.value))}
                className={fieldClass('cardNumber')}
                maxLength={19}
              />
              {errors.cardNumber && <p className="text-red-400 text-xs mt-1">{errors.cardNumber}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Validade (MM/AA)</Label>
                <Input
                  placeholder="MM/AA"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(maskExpiry(e.target.value))}
                  className={fieldClass('cardExpiry')}
                  maxLength={5}
                />
                {errors.cardExpiry && <p className="text-red-400 text-xs mt-1">{errors.cardExpiry}</p>}
              </div>
              <div>
                <Label className="text-gray-300 text-xs">CVV</Label>
                <Input
                  placeholder="123"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={fieldClass('cardCvv')}
                  maxLength={4}
                  type="password"
                />
                {errors.cardCvv && <p className="text-red-400 text-xs mt-1">{errors.cardCvv}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
        <Button
          className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black disabled:opacity-50"
          onClick={handleSubmit}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando pagamento...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 mr-2" />
              Finalizar Pagamento - R$ 19,90
            </>
          )}
        </Button>
        <p className="text-center text-gray-500 text-xs mt-2">
          🔒 Seus dados são criptografados e seguros
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;
