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
import { ArrowLeft, Send, FileText, Sparkles, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

export default function CreatorApplication() {
  const { user, profile } = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsContent, setTermsContent] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado');
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

  // Show existing application status
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => navigate('/profile')}
            variant="ghost"
            className="mb-6 text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Perfil
          </Button>

          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                {existingApplication.status === 'pending' && (
                  <>
                    <Clock className="w-6 h-6 text-yellow-500" />
                    Aplicação em Análise
                  </>
                )}
                {existingApplication.status === 'approved' && (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    Aplicação Aprovada!
                  </>
                )}
                {existingApplication.status === 'rejected' && (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    Aplicação Não Aprovada
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingApplication.status === 'pending' && (
                <p className="text-muted-foreground">
                  Sua aplicação para se tornar criador de conteúdo está sendo analisada pela nossa equipe.
                  Você receberá uma notificação assim que tivermos uma resposta.
                </p>
              )}

              {existingApplication.status === 'approved' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Parabéns! Sua aplicação foi aprovada. Você agora é um criador de conteúdo oficial da plataforma COCONUDI!
                  </p>
                  <Button
                    onClick={() => navigate('/app')}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Começar a Criar Conteúdo
                  </Button>
                </div>
              )}

              {existingApplication.status === 'rejected' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Infelizmente sua aplicação não foi aprovada neste momento.
                  </p>
                  {existingApplication.rejection_reason && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <p className="text-sm text-red-500 font-medium mb-2">Motivo:</p>
                      <p className="text-sm text-foreground">{existingApplication.rejection_reason}</p>
                    </div>
                  )}
                  <Button
                    onClick={async () => {
                      await (supabase as any)
                        .from('creator_applications')
                        .delete()
                        .eq('id', existingApplication.id);
                      setExistingApplication(null);
                      toast.success('Você pode enviar uma nova aplicação');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Enviar Nova Aplicação
                  </Button>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data de Envio:</span>
                  <span className="text-foreground">
                    {new Date(existingApplication.submitted_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {existingApplication.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data de Revisão:</span>
                    <span className="text-foreground">
                      {new Date(existingApplication.reviewed_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={() => navigate('/profile')}
          variant="ghost"
          className="mb-6 text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Perfil
        </Button>

        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-pink-500" />
              <CardTitle className="text-3xl">Espaço do Criador</CardTitle>
            </div>
            <CardDescription className="text-base">
              Torne-se um criador de conteúdo e compartilhe seu talento com milhares de pessoas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  👤 Dados Pessoais
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profile?.full_name || user?.email?.split('@')[0] || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    placeholder="(11) 99999-9999"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nickname">Apelido/Nome Artístico *</Label>
                  <Input
                    id="nickname"
                    placeholder="Como você quer ser chamado(a)"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: any) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger>
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
              </div>

              {/* Sobre Você */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  📝 Sobre Você
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia *</Label>
                  <Textarea
                    id="bio"
                    placeholder="Conte um pouco sobre você, seu estilo de conteúdo e o que te motiva..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="min-h-[120px]"
                    required
                  />
                  <p className="text-sm text-muted-foreground text-right">
                    {formData.bio.length}/500 caracteres (mínimo 50)
                  </p>
                </div>
              </div>

              {/* Termos e Condições */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  📜 Termos e Condições
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={formData.accepted_terms}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, accepted_terms: checked as boolean })
                      }
                    />
                    <div className="space-y-1 leading-none">
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Aceito os Termos de Uso da Plataforma *
                      </label>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm text-primary"
                        onClick={() => setShowTerms(true)}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Ver Termos Completos
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="image_rights"
                      checked={formData.accepted_image_rights}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, accepted_image_rights: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="image_rights"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Autorizo o uso de minha imagem conforme Política de Privacidade *
                    </label>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-6 text-lg"
              >
                {loading ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Enviar Aplicação
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                * Campos obrigatórios. Sua aplicação será analisada pela nossa equipe em até 48 horas.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Terms Modal */}
        <Dialog open={showTerms} onOpenChange={setShowTerms}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Termos de Uso - Criadores de Conteúdo</DialogTitle>
              <DialogDescription>
                Por favor, leia atentamente antes de aceitar
              </DialogDescription>
            </DialogHeader>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">{termsContent}</pre>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
