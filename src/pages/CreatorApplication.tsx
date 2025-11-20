import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, FileText, Sparkles, CheckCircle, XCircle, Clock, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const applicationSchema = z.object({
  whatsapp: z.string()
    .min(10, 'WhatsApp inválido')
    .max(20, 'WhatsApp inválido')
    .regex(/^[0-9+\s()-]+$/, 'Apenas números e caracteres válidos'),
  nickname: z.string()
    .min(2, 'Apelido deve ter no mínimo 2 caracteres')
    .max(30, 'Apelido deve ter no máximo 30 caracteres'),
  bio: z.string()
    .min(50, 'Biografia deve ter no mínimo 50 caracteres')
    .max(500, 'Biografia deve ter no máximo 500 caracteres'),
  gender: z.enum(['masculino', 'feminino', 'outro', 'prefiro-nao-informar'], {
    required_error: 'Selecione um sexo',
  }),
  accepted_terms: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os termos de uso',
  }),
  accepted_image_rights: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os direitos de uso de imagem',
  }),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

const ProgressIndicator = ({ currentStep, completedSteps }: { currentStep: number, completedSteps: number[] }) => {
  const steps = [
    { number: 1, label: 'Dados' },
    { number: 2, label: 'Bio' },
    { number: 3, label: 'Termos' }
  ];

  return (
    <div className="w-full py-4 px-4 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2 max-w-md mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300
                ${currentStep === step.number ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white scale-110' : ''}
                ${completedSteps.includes(step.number) && currentStep !== step.number ? 'bg-green-500 text-white' : ''}
                ${currentStep !== step.number && !completedSteps.includes(step.number) ? 'bg-white/10 text-white/40 border-2 border-white/20' : ''}
              `}>
                {completedSteps.includes(step.number) && currentStep !== step.number ? '✓' : step.number}
              </div>
              <span className={`text-xs mt-1 transition-colors ${
                currentStep === step.number ? 'text-white font-semibold' : 'text-white/50'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 transition-all duration-300 rounded-full ${
                completedSteps.includes(step.number) ? 'bg-green-500' : 'bg-white/10'
              }`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-white/50">Etapa {currentStep} de 3</p>
    </div>
  );
};

export default function CreatorApplication() {
  const { user, profile } = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    whatsapp: '',
    nickname: '',
    bio: '',
    gender: 'prefiro-nao-informar',
    accepted_terms: false,
    accepted_image_rights: false,
  });

  useEffect(() => {
    if (user) {
      checkExistingApplication();
      loadTerms();
    }
  }, [user]);

  const checkExistingApplication = async () => {
    if (!user) return;

    const { data } = await (supabase as any)
      .from('creator_applications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setExistingApplication(data);
  };

  const loadTerms = async () => {
    const { data } = await (supabase as any)
      .from('platform_terms')
      .select('content')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setTermsContent(data.content);
    }
  };

  const validateStep = (step: number): boolean => {
    switch(step) {
      case 1:
        return formData.whatsapp.length >= 10 && 
               formData.nickname.length >= 2;
      case 2:
        return formData.bio.length >= 50 && 
               formData.bio.length <= 500;
      case 3:
        return formData.accepted_terms && 
               formData.accepted_image_rights;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      if (currentStep === 1) {
        toast.error('Preencha todos os campos obrigatórios');
      } else if (currentStep === 2) {
        toast.error('A biografia deve ter entre 50 e 500 caracteres');
      }
      return;
    }
    
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!validateStep(3)) {
      toast.error('Você deve aceitar todos os termos');
      return;
    }

    try {
      applicationSchema.parse(formData);

      setLoading(true);

      const { error } = await (supabase as any)
        .from('creator_applications')
        .insert({
          user_id: user.id,
          full_name: profile?.full_name || user.email?.split('@')[0] || '',
          email: user.email || '',
          whatsapp: formData.whatsapp,
          nickname: formData.nickname,
          bio: formData.bio,
          gender: formData.gender,
          accepted_terms: formData.accepted_terms,
          accepted_image_rights: formData.accepted_image_rights,
        });

      if (error) throw error;

      // Track event
      await supabase.from('analytics_events').insert({
        event_name: 'creator_application_submitted',
        event_category: 'creator',
        user_id: user.id,
        event_data: { timestamp: new Date().toISOString() }
      });

      toast.success('Aplicação enviada com sucesso! Você receberá uma resposta em breve.');
      checkExistingApplication();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.code === '23505') {
        toast.error('Você já possui uma aplicação enviada');
      } else {
        console.error('Erro ao enviar aplicação:', error);
        toast.error('Erro ao enviar aplicação');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
        .replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
        .replace(/^(\d{2})(\d{0,5})/, '($1) $2')
        .replace(/^(\d{0,2})/, '($1');
    }
    return value;
  };

  // Renderizar status de aplicação existente
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Espaço do Criador</h1>
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {existingApplication.status === 'pending' && (
                  <>
                    <Clock className="w-8 h-8 text-yellow-500" />
                    <div>
                      <CardTitle className="text-white">Aplicação em Análise</CardTitle>
                      <CardDescription className="text-white/60">
                        Sua aplicação está sendo analisada pela nossa equipe
                      </CardDescription>
                    </div>
                  </>
                )}
                {existingApplication.status === 'approved' && (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <CardTitle className="text-white">Aplicação Aprovada! 🎉</CardTitle>
                      <CardDescription className="text-white/60">
                        Parabéns! Você agora é um criador de conteúdo
                      </CardDescription>
                    </div>
                  </>
                )}
                {existingApplication.status === 'rejected' && (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <div>
                      <CardTitle className="text-white">Aplicação Não Aprovada</CardTitle>
                      <CardDescription className="text-white/60">
                        Infelizmente sua aplicação não foi aprovada
                      </CardDescription>
                    </div>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Nome:</span>
                  <span className="text-white">{existingApplication.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Apelido:</span>
                  <span className="text-white">{existingApplication.nickname}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">WhatsApp:</span>
                  <span className="text-white">{existingApplication.whatsapp}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Data de Envio:</span>
                  <span className="text-white">
                    {new Date(existingApplication.submitted_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {existingApplication.status === 'rejected' && existingApplication.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-sm text-red-300 font-semibold mb-2">Motivo da rejeição:</p>
                  <p className="text-sm text-red-200">{existingApplication.rejection_reason}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Voltar
                </Button>
                {existingApplication.status === 'rejected' && (
                  <Button
                    onClick={() => setExistingApplication(null)}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
                  >
                    Nova Aplicação
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="space-y-4 p-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="w-5 h-5" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription className="text-white/60">
                  Informações básicas sobre você
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white/70">Nome Completo</Label>
                  <Input
                    value={profile?.full_name || user?.email?.split('@')[0] || ''}
                    readOnly
                    className="bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label className="text-white/70">Email</Label>
                  <Input
                    value={user?.email || ''}
                    readOnly
                    className="bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label className="text-white">WhatsApp *</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    maxLength={15}
                  />
                </div>

                <div>
                  <Label className="text-white">Apelido/Nome Artístico *</Label>
                  <Input
                    placeholder="Como quer ser chamado(a)"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    maxLength={30}
                  />
                </div>

                <div>
                  <Label className="text-white">Sexo *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value as any })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 p-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5" />
                  Sobre Você
                </CardTitle>
                <CardDescription className="text-white/60">
                  Conte um pouco sobre você e seu conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">Biografia *</Label>
                  <Textarea
                    placeholder="Fale sobre você, seu estilo, o que você faz..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[200px] resize-none"
                    maxLength={500}
                  />
                  <p className={`text-sm text-right mt-1 transition-colors ${
                    formData.bio.length < 50 ? 'text-red-400' :
                    formData.bio.length > 450 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {formData.bio.length}/500 caracteres
                    {formData.bio.length < 50 && ` (mínimo 50)`}
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-300 font-semibold mb-2">💡 Dicas para uma boa bio:</p>
                  <ul className="text-xs text-blue-200 space-y-1">
                    <li>• Seja autêntico(a) e genuíno(a)</li>
                    <li>• Descreva seu estilo e tipo de conteúdo</li>
                    <li>• Mencione seus diferenciais</li>
                    <li>• Seja profissional mas descontraído(a)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 p-4">
            <Card className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 border-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white text-sm">📋 Resumo da Aplicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Nome:</span>
                  <span className="text-white">{profile?.full_name || user?.email?.split('@')[0] || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Apelido:</span>
                  <span className="text-white">{formData.nickname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">WhatsApp:</span>
                  <span className="text-white">{formData.whatsapp}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-white/60">Bio:</span>
                  <span className="text-white text-xs line-clamp-2">{formData.bio}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5" />
                  Termos e Condições
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={formData.accepted_terms}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, accepted_terms: checked as boolean })
                    }
                    className="mt-1"
                  />
                  <div>
                    <p className="text-white text-sm">
                      Aceito os{' '}
                      <button 
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-pink-400 hover:underline font-semibold"
                      >
                        Termos de Uso da Plataforma
                      </button>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={formData.accepted_image_rights}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, accepted_image_rights: checked as boolean })
                    }
                    className="mt-1"
                  />
                  <div>
                    <p className="text-white text-sm">
                      Autorizo o uso de minha imagem conforme a Política de Direitos de Imagem
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-xs text-yellow-200">
                    ⚠️ Sua aplicação será analisada pela equipe COCONUDI. 
                    Você receberá uma notificação quando houver uma decisão.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <h1 className="text-lg font-bold">Espaço do Criador</h1>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* Footer Navigation */}
      <div className="sticky bottom-0 bg-black/90 backdrop-blur-md border-t border-white/10 p-4">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              className={`flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 ${
                currentStep === 1 ? 'w-full' : ''
              }`}
              disabled={!validateStep(currentStep)}
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              className={`flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 ${
                currentStep === 1 ? 'w-full' : ''
              }`}
              disabled={!validateStep(3) || loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Enviando...
                </>
              ) : (
                <>
                  Enviar Aplicação
                  <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Terms Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="bg-gray-900 text-white border-white/10 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Termos de Uso da Plataforma</DialogTitle>
            <DialogDescription className="text-white/60">
              Leia atentamente antes de aceitar
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm text-white/80">
                {termsContent || 'Carregando termos...'}
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowTerms(false)}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
