import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';
import coconudiLogo from '@/assets/coconudi-logo-new.png';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutUrl = searchParams.get('url');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const { isPremium, checkPremiumStatus } = usePremiumStatus();
  const [checkCount, setCheckCount] = useState(0);

  // Poll para verificar se o pagamento foi confirmado
  useEffect(() => {
    if (isPremium) {
      toast.success('Pagamento confirmado! Bem-vindo ao VIP! 🎉', { duration: 5000 });
      setTimeout(() => navigate('/app'), 2000);
      return;
    }

    if (checkCount < 60) {
      const timer = setTimeout(() => {
        checkPremiumStatus();
        setCheckCount(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPremium, checkCount, checkPremiumStatus, navigate]);

  if (!checkoutUrl) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Nenhum link de pagamento encontrado.</p>
          <Button onClick={() => navigate('/subscribe')} variant="outline" className="border-amber-500/50 text-amber-400">
            Voltar para Planos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(90deg, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)',
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/subscribe')}
          className="text-black hover:bg-black/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-black" />
          <span className="text-black font-bold text-sm">Pagamento Seguro</span>
        </div>

        <img src={coconudiLogo} alt="CocoNudi" className="h-8 w-auto" />
      </header>

      {/* Loading */}
      {!iframeLoaded && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-4" />
            <p className="text-gray-400">Carregando pagamento seguro...</p>
          </div>
        </div>
      )}

      {/* Iframe do checkout */}
      <iframe
        src={checkoutUrl}
        className={`flex-1 w-full border-0 ${iframeLoaded ? 'block' : 'hidden'}`}
        onLoad={() => setIframeLoaded(true)}
        allow="payment"
        title="Checkout Asaas"
      />

      {/* Footer info */}
      <div className="px-4 py-2 bg-gray-900/80 border-t border-white/10 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-green-500" />
        <p className="text-xs text-gray-400">
          Ambiente seguro • Após o pagamento, você será redirecionado automaticamente
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;
