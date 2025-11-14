import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AgeVerificationModalProps {
  open: boolean;
  onClose: () => void;
}

export const AgeVerificationModal = ({ open, onClose }: AgeVerificationModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Erro ao obter IP:', error);
      return 'unknown';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (!email.includes('@')) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setIsSubmitting(true);

    try {
      const ip = await getClientIP();
      
      // Salva no localStorage
      const verificationData = {
        name,
        email,
        ip,
        timestamp: new Date().toISOString(),
        verified: true
      };
      
      localStorage.setItem('ageVerification', JSON.stringify(verificationData));
      
      toast.success("Verificação concluída com sucesso!");
      onClose();
    } catch (error) {
      console.error('Erro ao verificar:', error);
      toast.error("Erro ao processar verificação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <div className="bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
              +18
            </div>
            Verificação de Idade
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm text-center font-medium">
              Confirmo que sou maior de 18 anos
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Este conteúdo é destinado apenas para maiores de idade
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Digite seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-3">
                <svg className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Instalar OnlyTikTok</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Instale nosso app, não precisa Google Play ou App Store para acesso rápido e experiência completa!
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Toque no ícone 📱 compartilhar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Selecione "Adicionar à Tela Inicial"</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verificando..." : "Confirmar e Continuar"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
