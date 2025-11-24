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
  const { user, profile, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const [formData, setFormData] = useState<Partial<ApplicationFormData>>({
    whatsapp: '',
    nickname: profile?.username || '',
    bio: '',
    gender: undefined,
    accepted_terms: false,
    accepted_image_rights: false,
  });

  useEffect(() => {
    // Aguardar o carregamento do usuário antes de verificar
    if (userLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchExistingApplication();
    fetchPlatformTerms();
  }, [user, userLoading, navigate]);

  useEffect(() => {
    if (profile?.username && !formData.nickname) {
      setFormData(prev => ({ ...prev, nickname: profile.username }));
    }
  }, [profile]);

  const fetchExistingApplication = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('creator_applications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingApplication(data);
      }
    } catch (error) {
      console.error('Erro ao buscar aplicação:', error);
    }
  };

  const fetchPlatformTerms = async () => {
    setTermsContent(`
      # Termos de Uso da Plataforma

      ## 1. Aceitação dos Termos
      Ao se cadastrar como criador de conteúdo, você concorda com todos os termos e condições estabelecidos neste documento.

      ## 2. Responsabilidades do Criador
      - Produzir conteúdo original e de qualidade
      - Respeitar as diretrizes da comunidade
      - Cumprir os prazos de publicação acordados
      - Manter a autenticidade e transparência com o público

      ## 3. Direitos de Uso de Imagem
      Ao aceitar estes termos, você concede à plataforma o direito de utilizar seu conteúdo para fins de promoção e marketing.

      ## 4. Monetização
      - A plataforma compartilhará receitas conforme acordado
      - Pagamentos serão processados mensalmente
      - Valores mínimos para saque serão comunicados

      ## 5. Política de Privacidade
      Seus dados serão tratados conforme nossa política de privacidade.
    `);
  };

  const validateStep = (step: number): boolean => {
    const errors: string[] = [];

    if (step === 1) {
      if (!formData.whatsapp || formData.whatsapp.length < 10) {
        errors.push('WhatsApp inválido');
      }
      if (!formData.nickname || formData.nickname.length < 2) {
        errors.push('Apelido inválido');
      }
      if (!formData.gender) {
        errors.push('Selecione seu sexo');
      }
    } else if (step === 2) {
      if (!formData.bio || formData.bio.length < 50) {
        errors.push('Biografia deve ter no mínimo 50 caracteres');
      }
      if (formData.bio && formData.bio.length > 500) {
        errors.push('Biografia deve ter no máximo 500 caracteres');
      }
    } else if (step === 3) {
      if (!formData.accepted_terms) {
        errors.push('Você deve aceitar os termos de uso');
      }
      if (!formData.accepted_image_rights) {
        errors.push('Você deve aceitar os direitos de uso de imagem');
      }
    }

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    setLoading(true);

    try {
      const validatedData = applicationSchema.parse(formData);

      const { error: insertError } = await (supabase as any)
        .from('creator_applications')
        .insert({
          user_id: user!.id,
          email: user!.email!,
          full_name: profile?.full_name || '',
          whatsapp: validatedData.whatsapp,
          nickname: validatedData.nickname,
          bio: validatedData.bio,
          gender: validatedData.gender,
          status: 'pending',
        });

      if (insertError) throw insertError;

      // Analytics tracking
      await (supabase as any).from('analytics_events').insert({
        event_name: 'creator_application_submitted',
        event_category: 'creator',
        user_id: user!.id,
      });

      toast.success('Aplicação enviada com sucesso! Você receberá uma resposta em breve.');
      navigate('/profile');
    } catch (error: any) {
      console.error('Erro ao enviar aplicação:', error);
      if (error.name === 'ZodError') {
        toast.error('Por favor, preencha todos os campos corretamente.');
      } else {
        toast.error('Erro ao enviar aplicação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading enquanto carrega o usuário
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white flex items-center justify-center p-4">
        <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900 !border-purple-500/30 max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              {existingApplication.status === 'pending' && <Clock className="w-6 h-6 text-yellow-500" />}
              {existingApplication.status === 'approved' && <CheckCircle className="w-6 h-6 text-green-500" />}
              {existingApplication.status === 'rejected' && <XCircle className="w-6 h-6 text-red-500" />}
              Status da Aplicação
            </CardTitle>
            <CardDescription className="text-white/70">
              {existingApplication.status === 'pending' && 'Sua aplicação está em análise'}
              {existingApplication.status === 'approved' && 'Parabéns! Sua aplicação foi aprovada'}
              {existingApplication.status === 'rejected' && 'Sua aplicação foi rejeitada'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-white">
            <div>
              <Label className="text-white/70">WhatsApp</Label>
              <p className="text-white">{existingApplication.whatsapp}</p>
            </div>
            <div>
              <Label className="text-white/70">Apelido</Label>
              <p className="text-white">{existingApplication.nickname}</p>
            </div>
            <div>
              <Label className="text-white/70">Biografia</Label>
              <p className="text-white">{existingApplication.bio}</p>
            </div>
            {existingApplication.status === 'rejected' && existingApplication.rejection_reason && (
              <div>
                <Label className="text-white/70">Motivo da Rejeição</Label>
                <p className="text-red-400">{existingApplication.rejection_reason}</p>
              </div>
            )}
            {existingApplication.reviewed_at && (
              <div>
                <Label className="text-white/70">
                  {existingApplication.status === 'approved' ? 'Aprovado em' : 'Revisado em'}
                </Label>
                <p className="text-white">{new Date(existingApplication.reviewed_at).toLocaleDateString()}</p>
              </div>
            )}
            <Button 
              onClick={() => navigate('/profile')} 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Perfil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white flex flex-col">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Torne-se Criador
          </h1>
          <div className="w-20"></div>
        </div>
        <ProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {/* Conteúdo Rolável */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 max-w-4xl mx-auto pb-24">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Etapa 1: Dados Pessoais */}
            {currentStep === 1 && (
              <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900 !border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="w-6 h-6 text-purple-500" />
                    Dados Pessoais
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Preencha suas informações básicas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-white">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-white/5 border-white/10 text-white/50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-white">Nome Completo</Label>
                    <Input
                      id="name"
                      value={profile?.full_name || ''}
                      disabled
                      className="bg-white/5 border-white/10 text-white/50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="whatsapp" className="text-white">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      placeholder="(11) 98765-4321"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="nickname" className="text-white">Apelido/Nome Artístico *</Label>
                    <Input
                      id="nickname"
                      placeholder="Como você quer ser chamado(a)"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender" className="text-white">Sexo *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value as any })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecione" />
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
            )}

            {/* Etapa 2: Sobre Você */}
            {currentStep === 2 && (
              <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900 !border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    Sobre Você
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Conte-nos mais sobre você e seu conteúdo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="bio" className="text-white">Biografia *</Label>
                    <Textarea
                      id="bio"
                      placeholder="Fale sobre você, seu estilo de conteúdo e o que te motiva a criar..."
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[150px]"
                      required
                    />
                    <p className="text-sm text-white/50 mt-1">
                      {formData.bio?.length || 0}/500 caracteres (mínimo 50)
                    </p>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-sm text-white/70">
                      💡 <strong>Dica:</strong> Uma boa biografia inclui:
                    </p>
                    <ul className="text-sm text-white/60 mt-2 space-y-1 list-disc list-inside">
                      <li>Seu estilo de conteúdo</li>
                      <li>Frequência de postagem</li>
                      <li>O que torna seu conteúdo único</li>
                      <li>Suas metas na plataforma</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Etapa 3: Termos */}
            {currentStep === 3 && (
              <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900 !border-purple-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="w-6 h-6 text-purple-500" />
                    Termos e Confirmação
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Revise suas informações e aceite os termos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-white">Resumo dos Dados</h3>
                    <div className="text-sm text-white/70 space-y-1">
                      <p><strong>Email:</strong> {user?.email}</p>
                      <p><strong>Nome:</strong> {profile?.full_name}</p>
                      <p><strong>WhatsApp:</strong> {formData.whatsapp}</p>
                      <p><strong>Apelido:</strong> {formData.nickname}</p>
                      <p><strong>Sexo:</strong> {formData.gender}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="terms"
                        checked={formData.accepted_terms}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, accepted_terms: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <label htmlFor="terms" className="text-sm text-white cursor-pointer">
                        Li e aceito os{' '}
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="text-purple-400 hover:text-purple-300 underline"
                        >
                          Termos de Uso da Plataforma
                        </button>
                      </label>
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="image_rights"
                        checked={formData.accepted_image_rights}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, accepted_image_rights: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <label htmlFor="image_rights" className="text-sm text-white cursor-pointer">
                        Concordo com o uso de minha imagem e conteúdo para fins de divulgação da plataforma
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>
      </div>

      {/* Footer Fixo com Botões */}
      <div className="sticky bottom-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button
              type="button"
              onClick={handleBack}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Anterior
            </Button>
          )}
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {loading ? 'Enviando...' : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Aplicação
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Termos */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="bg-gray-900 text-white border-purple-500/30 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Termos de Uso da Plataforma</DialogTitle>
            <DialogDescription className="text-white/70">
              Leia atentamente nossos termos antes de continuar
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="prose prose-invert max-w-none">
              {termsContent.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.replace('# ', '')}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-xl font-semibold mt-3 mb-2">{line.replace('## ', '')}</h2>;
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="ml-4">{line.replace('- ', '')}</li>;
                } else if (line.trim()) {
                  return <p key={index} className="mb-2">{line}</p>;
                }
                return null;
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
