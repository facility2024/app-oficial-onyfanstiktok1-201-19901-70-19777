import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: any;
}

export const VideoPreviewModal = ({ isOpen, onClose, content }: VideoPreviewModalProps) => {
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  if (!content) return null;

  const isVIP = content.platform === 'premium';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Salvar o cadastro VIP na tabela bonus_users do Supabase
      const { error: insertError } = await supabase
        .from('bonus_users')
        .insert({
          name: formData.name,
          whatsapp: formData.phone,
          email: formData.email,
          points: 0,
          total_spent: 0,
          status: 'premium',
          location: 'Brasil',
          is_verified: true
        });

      if (insertError) {
        console.error('Erro no Supabase:', insertError);
        throw insertError;
      }

      // Também salvar no localStorage para controle local
      const vipUser = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('vip_user', JSON.stringify(vipUser));
      localStorage.setItem('user_registered', 'true');

      toast({
        title: "Cadastro realizado!",
        description: `Parabéns ${formData.name}! Você agora tem acesso VIP.`,
      });

      setShowSuccess(true);
    } catch (err: any) {
      console.error('Erro ao salvar cadastro:', err);
      setError('Erro ao processar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetModal = () => {
    setShowForm(false);
    setShowSuccess(false);
    setLoading(false);
    setError('');
    setFormData({ name: '', phone: '', email: '' });
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleContinue = () => {
    // Libera o vídeo e TODO o perfil (modelo) após cadastro
    localStorage.setItem('user_registered', 'true');
    if (content && content.id) {
      localStorage.setItem(`video_unlocked_${content.id}`, 'true');
    }
    if (content && content.modelId) {
      localStorage.setItem(`model_unlocked_${content.modelId}`, 'true');
    }
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[320px] w-[90vw] mx-auto bg-card/95 backdrop-blur-sm border-border/50 fixed z-[99999] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 99999 }}>
        <div className="flex flex-col items-center space-y-6 p-6">
          {!showForm && !showSuccess && (
            <>
              {/* Crown Icon */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <Crown className="w-8 h-8 text-accent" />
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground flex items-center justify-center space-x-2">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <span>Conteúdo {isVIP ? 'Super VIP' : 'Premium'}</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Este conteúdo está bloqueado. Para ter acesso completo, torne-se VIP!
                </p>
              </div>

              {/* Content Preview */}
              <div className="w-full p-4 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent/20">
                    <img 
                      src={content.avatarUrl} 
                      alt={content.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{content.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {content.views} visualizações • {content.likes} curtidas
                    </p>
                  </div>
                </div>
              </div>

              {/* VIP Button */}
              <Button 
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={() => setShowForm(true)}
              >
                <Crown className="w-5 h-5 mr-2" />
                Quero ser premium
              </Button>

              {/* Close Button */}
              <Button 
                variant="ghost" 
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
              >
                Fechar
              </Button>
            </>
          )}

          {showForm && !showSuccess && (
            <>
              {/* Crown Icon */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <Crown className="w-8 h-8 text-accent" />
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Cadastro VIP
                </h2>
                <p className="text-sm text-muted-foreground">
                  Preencha seus dados para se tornar VIP
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="w-full space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    placeholder="seu@email.com"
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Enviar Cadastro'}
                </Button>
              </form>

              {/* Back Button */}
              <Button 
                variant="ghost" 
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Voltar
              </Button>
            </>
          )}

          {showSuccess && (
            <>
              {/* Success Icon */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/20 to-green-600/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>

              {/* Success Message */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Cadastro realizado com sucesso!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Agora você pode continuar navegando ou ir para a página de conteúdos
                </p>
              </div>

              {/* Action Button */}
              <div className="w-full">
                <Button 
                  variant="outline"
                  onClick={handleContinue}
                  className="w-full"
                >
                  Continuar no aplicativo
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};