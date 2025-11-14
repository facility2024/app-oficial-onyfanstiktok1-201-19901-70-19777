import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Share, Plus } from 'lucide-react';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);

  useEffect(() => {
    // Checa verificação +18 (se não verificado, não mostramos este banner)
    const checkAge = () => {
      const verified = !!localStorage.getItem('ageVerification');
      setIsAgeVerified(verified);
      if (!verified) {
        setShowPrompt(false);
      }
    };
    checkAge();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ageVerification') checkAge();
    };
    window.addEventListener('storage', onStorage);

    // Detectar iOS
    const checkIfIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Verificar se já está instalado como PWA
    const checkIfStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    const isIOSDevice = checkIfIOS();
    const isInstalledPWA = checkIfStandalone();
    
    setIsIOS(isIOSDevice);
    setIsStandalone(isInstalledPWA);

    // Se já está instalado, não mostrar prompt
    if (isInstalledPWA) {
      setShowPrompt(false);
      return () => window.removeEventListener('storage', onStorage);
    }

    // Se não está verificado, não mostrar nada
    if (!localStorage.getItem('ageVerification')) {
      return () => window.removeEventListener('storage', onStorage);
    }

    // Para iOS, mostrar prompt manual após 3 segundos
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('storage', onStorage);
      };
    }

    // Para Android/outros browsers
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    (deferredPrompt as any).prompt?.();
    const { outcome } = await (deferredPrompt as any).userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt || !isAgeVerified) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="bg-gradient-to-r from-sky-200 to-blue-200 border-2 border-sky-300 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <img 
              src="/lovable-uploads/2955b0a9-b6b4-486b-9318-e326c29ab668.png" 
              alt="OnyTikTok Logo" 
              className="w-12 h-12 rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm mb-1">
                Instalar OnyTikTok
              </h3>
              <p className="text-gray-800 text-xs mb-3">
                Instale nosso app, não precisa <strong>Google Play e nem App Store</strong> para acesso rápido e experiência completa!
              </p>
              
              {isIOS ? (
                // Instruções para iOS Safari
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-gray-800">
                    <span>1. Toque no ícone</span>
                    <Share className="w-3 h-3 text-blue-600" />
                    <span>compartilhar</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-800">
                    <span>2. Selecione</span>
                    <Plus className="w-3 h-3 text-blue-600" />
                    <span>"Adicionar à Tela Inicial"</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleDismiss}
                    className="text-gray-900 hover:bg-gray-900/10 text-xs px-2 py-1 h-auto w-full mt-2"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Entendi
                  </Button>
                </div>
              ) : (
                // Botão padrão para Android/outros
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleInstall}
                    className="bg-gray-900 hover:bg-gray-800 text-white text-xs px-3 py-1 h-auto"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Instalar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleDismiss}
                    className="text-gray-900 hover:bg-gray-900/10 text-xs px-2 py-1 h-auto"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};