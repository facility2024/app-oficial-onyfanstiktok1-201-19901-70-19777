import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, Lock, ShieldCheck, QrCode, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();

  const privateModelId = searchParams.get('model') || '';
  const privateModelType = (searchParams.get('type') as 'model' | 'creator') || 'creator';
  const privateModelName = searchParams.get('name') || 'Criadora';
  const queryPlan = (searchParams.get('plan') as 'mensal' | 'trimestral' | 'anual') || 'mensal';

  const [planPrice, setPlanPrice] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pixData, setPixData] = useState<{ payload?: string; qrCodeUrl?: string } | null>(null);
  const postPaymentDestinationRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!privateModelId) return;
      const { data } = await (supabase as any)
        .from('model_subscription_plans')
        .select('price')
        .eq('model_id', privateModelId)
        .eq('plan_type', queryPlan)
        .eq('is_active', true)
        .maybeSingle();
      if (data?.price) {
        setPlanPrice(Number(data.price));
      } else {
        toast.error('Plano indisponível.');
        setTimeout(() => navigate(-1), 1500);
      }
    })();
  }, [privateModelId, queryPlan, navigate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const getPostPaymentDestination = () => {
    if (postPaymentDestinationRef.current) return postPaymentDestinationRef.current;

    const origin = sessionStorage.getItem('post_login_origin');
    sessionStorage.removeItem('post_login_origin');

    const destination = origin && origin.startsWith('/app')
      ? origin
      : privateModelId ? `/app?profile=${privateModelId}` : '/app';

    postPaymentDestinationRef.current = destination;
    return destination;
  };

  const pollNeonStatus = (txId: string) => {
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts++;
      try {
        const { data, error } = await supabase.functions.invoke('neon-vip-status', {
          body: {
            payment_id: txId,
            private_model_id: privateModelId,
            private_model_type: privateModelType,
            plan_type: queryPlan,
            amount: planPrice,
          },
        });
        if (error) throw error;

        const status = String(data?.status || '').toUpperCase();
        if (status === 'APPROVED') {
          window.clearInterval(interval);
          setPolling(false);
          setShowSuccess(true);
          window.dispatchEvent(new Event('private-access-updated'));
          toast.success('Acesso liberado!');
          window.setTimeout(() => navigate(getPostPaymentDestination()), 1800);
        }
        if (status === 'REJECTED') {
          window.clearInterval(interval);
          setPolling(false);
          toast.error('Pagamento não aprovado. Gere um novo PIX para tentar novamente.');
        }
      } catch { /* ignore */ }
      if (attempts > 300) {
        window.clearInterval(interval);
        setPolling(false);
        toast.info('Ainda aguardando confirmação. Você pode voltar depois que pagar.');
      }
    }, 4000);
  };

  const handleGeneratePix = async () => {
    if (!user) { toast.error('Faça login'); navigate('/auth'); return; }
    if (!privateModelId) { toast.error('Criadora não identificada'); return; }
    if (!planPrice) { toast.error('Aguarde carregar o plano'); return; }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('neonpay-pix-gateway', {
        body: {
          amount: planPrice,
          product_name: `Assinatura ${queryPlan} - @${privateModelName}`,
        },
      });
      if (error) throw error;
      if (!data?.pix_code) throw new Error('PIX não retornado');

      const img = data.pix_image;
      const qrCodeUrl = img
        ? (img.startsWith('data:') || img.startsWith('http') ? img : `data:image/png;base64,${img}`)
        : undefined;

      setPixData({ payload: data.pix_code, qrCodeUrl });
      setPolling(true);
      pollNeonStatus(String(data.transaction_id || data.identifier));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar PIX');
    } finally {
      setProcessing(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    window.dispatchEvent(new Event('private-access-updated'));
    navigate(getPostPaymentDestination());
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

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      <Dialog open={showSuccess} onOpenChange={handleSuccessClose}>
        <DialogContent className="bg-gray-900 border-amber-500/30 text-center max-w-sm">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Pagamento Aprovado!</h2>
            <p className="text-gray-400">
              Sua assinatura de @{privateModelName} foi ativada. Aproveite!
            </p>
            <div className="flex items-center gap-2 text-amber-400">
              <Lock className="w-5 h-5" />
              <span className="font-semibold">Conteúdo Privado liberado</span>
            </div>
            <Button onClick={handleSuccessClose} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold mt-2">
              Ver conteúdo liberado
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-white">Checkout Seguro</h1>
        <ShieldCheck className="w-5 h-5 text-green-500 ml-auto" />
      </header>

      <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-white font-bold">Assinatura @{privateModelName}</p>
              <p className="text-gray-400 text-sm capitalize">Plano {queryPlan}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-400">
              R$ {planPrice.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {!pixData && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <QrCode className="w-12 h-12 text-green-400" />
                <p className="text-white font-medium">Pagamento via PIX</p>
                <p className="text-gray-400 text-sm">
                  Clique abaixo para gerar o QR Code. A confirmação é automática.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
              {polling && (
                <div className="flex items-center justify-center gap-2 text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Aguardando confirmação do pagamento...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!pixData && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
          <Button
            onClick={handleGeneratePix}
            disabled={processing || !planPrice}
            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando PIX...</>
            ) : (
              <><QrCode className="w-5 h-5 mr-2" />Gerar PIX - R$ {planPrice.toFixed(2).replace('.', ',')}</>
            )}
          </Button>
          <p className="text-center text-gray-500 text-xs mt-2">
            🔒 Pagamento seguro • Confirmação automática
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
