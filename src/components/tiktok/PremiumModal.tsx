import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Crown, AlertTriangle, Copy, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { usePixPayment } from '@/hooks/usePixPayment';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal = ({ isOpen, onClose }: PremiumModalProps) => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [countdown, setCountdown] = useState(1800); // 30 minutos em segundos
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    whatsapp: ''
  });

  const { loading, verifying, paymentData, generatePixPayment, verifyPayment, copyPixCode } = usePixPayment();

  const validateEmail = (email: string): boolean => {
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.com$/;
    
    if (!emailRegex.test(cleanEmail)) {
      return false;
    }
    
    const localPart = cleanEmail.split('@')[0];
    
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }
    
    if (localPart.includes('..')) {
      return false;
    }
    
    if (localPart.length < 1) {
      return false;
    }
    
    if (/^\d+$/.test(localPart)) {
      return false;
    }
    
    return true;
  };

  const validateWhatsApp = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 11) {
      return false;
    }
    
    const ddd = cleanPhone.substring(0, 2);
    const validDDDs = [
      '11', '12', '13', '14', '15', '16', '17', '18', '19',
      '21', '22', '24', '27', '28',
      '31', '32', '33', '34', '35', '37', '38',
      '41', '42', '43', '44', '45', '46',
      '47', '48', '49',
      '51', '53', '54', '55',
      '61', '62', '63', '64', '65', '66', '67',
      '68', '69',
      '71', '73', '74', '75', '77',
      '79',
      '81', '87',
      '82', '83', '84', '85', '88', '89',
      '86', '89',
      '91', '93', '94', '95', '96', '97', '98', '99'
    ];
    
    if (!validDDDs.includes(ddd)) {
      return false;
    }
    
    const firstDigit = cleanPhone.charAt(2);
    if (!['9', '8', '7', '6'].includes(firstDigit)) {
      return false;
    }
    
    if (cleanPhone.charAt(3) === '0') {
      return false;
    }
    
    return true;
  };

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showPayment && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showPayment, countdown]);

  // Verificação automática de pagamento
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showPayment && paymentData?.payment_id) {
      interval = setInterval(async () => {
        try {
          const result = await verifyPayment(paymentData.payment_id!);
          if (result.status === 'paid') {
            setShowPayment(false);
            setShowSuccess(true);
            clearInterval(interval);
          } else if (result.status === 'expired') {
            setShowPayment(false);
            resetForm();
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Erro na verificação automática:', error);
        }
      }, 5000); // Verificar a cada 5 segundos
    }
    return () => clearInterval(interval);
  }, [showPayment, paymentData, verifyPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = {
      name: '',
      email: '',
      whatsapp: ''
    };

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Por favor, insira um e-mail válido';
    }

    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp é obrigatório';
    } else if (!validateWhatsApp(formData.whatsapp)) {
      newErrors.whatsapp = 'Por favor, insira um número de WhatsApp válido (11 dígitos com DDD)';
    }

    setErrors(newErrors);

    if (!newErrors.name && !newErrors.email && !newErrors.whatsapp) {
      try {
        await generatePixPayment(formData);
        setShowForm(false);
        setShowPayment(true);
        setCountdown(1800); // Reset countdown
      } catch (error) {
        console.error('Erro ao processar formulário:', error);
      }
    }
  };

  const resetForm = () => {
    setShowWelcome(true);
    setShowForm(false);
    setShowPayment(false);
    setShowSuccess(false);
    setShowCancellation(false);
    setFormData({ name: '', email: '', whatsapp: '' });
    setErrors({ name: '', email: '', whatsapp: '' });
  };

  const handleCancelPayment = () => {
    setShowPayment(false);
    setShowCancellation(true);
    
    // Se houver dados de pagamento, enviar notificação de cancelamento
    if (paymentData && formData.email) {
      // Aqui você pode chamar uma função para enviar email de cancelamento
      console.log('Enviando email de cancelamento para:', formData.email);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 border-2 border-yellow-400/30 text-white z-[10000]" style={{ zIndex: 10000 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold text-yellow-400">
            <Crown className="w-6 h-6" />
            {showWelcome ? 'Bem-vindo!' :
             showForm ? 'Cadastro Premium' : 
             showPayment ? 'Pagamento PIX' : 
             showSuccess ? 'Bem-vindo ao Premium!' : 
             showCancellation ? 'Pagamento Cancelado' : 'Membro Exclusivo'}
          </DialogTitle>
        </DialogHeader>

        {showWelcome && !showForm && !showPayment && !showSuccess && !showCancellation ? (
          <div className="space-y-4 py-3">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center border-4 border-white/30 shadow-[0_0_40px_rgba(147,51,234,0.6)]">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Seja Bem-vindo!</h2>
              <p className="text-sm mb-4 leading-relaxed text-gray-200">
                Descubra um mundo exclusivo de conteúdos premium. Tenha acesso ilimitado aos melhores vídeos e funcionalidades especiais!
              </p>
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border-2 border-yellow-400/50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-bold text-yellow-400 mb-2">✨ O que você ganha:</h3>
                <ul className="text-left space-y-1 text-sm text-gray-200">
                  <li>• Acesso a todos os conteúdos premium</li>
                  <li>• Vídeos em alta qualidade</li>
                  <li>• Sem anúncios ou interrupções</li>
                  <li>• Funcionalidades exclusivas</li>
                  <li>• Suporte prioritário</li>
                </ul>
              </div>
              <div className="bg-green-500/20 border-2 border-green-400 rounded-lg p-3 mb-3 text-center">
                <p className="text-xl font-bold text-green-300">R$ 19,99</p>
                <p className="text-xs text-green-200">mensal</p>
              </div>
            </div>

            <div className="bg-red-500/20 border-2 border-red-400 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-red-300">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold text-sm">ATENÇÃO:</span>
              </div>
              <p className="text-xs text-red-200">
                Não enviamos nada pelo WhatsApp.
              </p>
              <p className="text-xs text-red-200">
                Você recebe tudo através do seu email e SMS.
              </p>
              <p className="text-xs text-red-200">
                Lembre-se de verificar também a pasta de spam/lixeira do seu e-mail.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-gray-400 text-gray-300 hover:bg-gray-700 text-sm py-2"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setShowWelcome(false);
                  setShowForm(true);
                }}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold border-2 border-yellow-300 text-sm py-2"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                COMEÇAR AGORA
              </Button>
            </div>
          </div>
        ) : showForm && !showPayment && !showSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-yellow-400">Nome Completo *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                placeholder="Digite seu nome completo"
              />
              {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-yellow-400">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                placeholder="Digite seu e-mail"
              />
              {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-yellow-400">WhatsApp *</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                placeholder="(11) 99999-9999"
              />
              {errors.whatsapp && <p className="text-red-400 text-sm">{errors.whatsapp}</p>}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setShowWelcome(true);
                }}
                variant="outline"
                className="flex-1 border-gray-400 text-gray-300 hover:bg-gray-700"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold border-2 border-yellow-300 disabled:opacity-50"
              >
                {loading ? 'Gerando PIX...' : 'Finalizar'}
              </Button>
            </div>
          </form>
        ) : showPayment && paymentData ? (
          <div className="space-y-6 py-4">
            {/* Timer */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center border-4 border-blue-300">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold mb-2">Tempo restante:</p>
              <p className="text-3xl font-bold text-yellow-400">{formatTime(countdown)}</p>
              <p className="text-sm text-gray-300 mt-2">O código PIX expira em 30 minutos</p>
            </div>

            {/* PIX Code */}
            <div className="bg-white/10 border-2 border-white/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-yellow-400">Código PIX:</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyPixCode(paymentData.pix_code!)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
              </div>
              <div className="bg-black/20 p-3 rounded text-xs font-mono break-all text-green-300">
                {paymentData.pix_code}
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-blue-500/20 border-2 border-blue-400 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-300">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold">Como pagar:</span>
              </div>
              <p className="text-sm text-blue-200">
                1. Copie o código PIX acima
              </p>
              <p className="text-sm text-blue-200">
                2. Abra seu app do banco
              </p>
              <p className="text-sm text-blue-200">
                3. Escolha PIX → Copia e Cola
              </p>
              <p className="text-sm text-blue-200">
                4. Cole o código e confirme o pagamento
              </p>
            </div>

            {/* Status */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-400 rounded-full text-orange-300">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                {verifying ? 'Verificando pagamento...' : 'Aguardando pagamento...'}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCancelPayment}
                variant="outline"
                className="flex-1 border-red-400 text-red-300 hover:bg-red-700/20"
              >
                Cancelar Pagamento
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const result = await verifyPayment(paymentData.payment_id!);
                    if (result.status === 'paid') {
                      setShowPayment(false);
                      setShowSuccess(true);
                    }
                  } catch (error) {
                    console.error('Erro ao verificar:', error);
                  }
                }}
                disabled={verifying}
                className="flex-1 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold"
              >
                {verifying ? 'Verificando...' : 'Verificar Pagamento'}
              </Button>
            </div>
          </div>
        ) : showSuccess ? (
          <div className="space-y-6 py-4 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center border-4 border-green-300">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-green-400 mb-2">Parabéns!</h3>
              <p className="text-lg mb-4">
                Seu pagamento foi aprovado e agora você tem acesso a todos os conteúdos premium do OnyfansTikTok!
              </p>
              <p className="text-sm text-gray-300">
                Todas as funcionalidades premium foram liberadas em seu app.
              </p>
            </div>

            <Button
              onClick={() => {
                // Salvar status premium no localStorage
                localStorage.setItem('premium_user', 'true');
                localStorage.setItem('premium_email', formData.email);
                handleClose();
              }}
              className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-3"
            >
              <Crown className="w-5 h-5 mr-2" />
              Começar a usar Premium
            </Button>
          </div>
        ) : showCancellation ? (
          <div className="space-y-6 py-4 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center border-4 border-red-300">
              <X className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-red-400 mb-2">Pagamento Cancelado</h3>
              <p className="text-lg mb-4 text-gray-200">
                Que pena! Seu pagamento foi cancelado.
              </p>
              <p className="text-sm text-gray-300 mb-4">
                Não se preocupe, você pode tentar novamente a qualquer momento.
              </p>
              
              <div className="bg-blue-500/20 border-2 border-blue-400 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-300">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold">Importante:</span>
                </div>
                <p className="text-sm text-blue-200">
                  O email {formData.email} foi removido da nossa lista de cadastros pendentes.
                </p>
                <p className="text-sm text-blue-200">
                  Para uma nova tentativa, você precisará fazer um novo cadastro.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-gray-400 text-gray-300 hover:bg-gray-700"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setShowCancellation(false);
                  setShowWelcome(true);
                  setFormData({ name: '', email: '', whatsapp: '' });
                  setErrors({ name: '', email: '', whatsapp: '' });
                }}
                className="flex-1 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};