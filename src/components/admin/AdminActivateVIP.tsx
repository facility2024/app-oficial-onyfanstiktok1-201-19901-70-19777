import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActivationResult {
  success: boolean;
  message: string;
  email?: string;
  plan?: string;
  expires?: string;
}

export const AdminActivateVIP = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [planType, setPlanType] = useState<string>('mensal');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);

  const PLAN_DAYS: Record<string, number> = {
    mensal: 30,
    trimestral: 90,
    anual: 365,
  };

  const handleActivateVIP = async () => {
    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const days = PLAN_DAYS[planType] || 30;
      const subscriptionStart = new Date();
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + days);

      // Buscar user_id pelo email no profiles
      let userId: string | null = null;
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id, name')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profile) {
        userId = profile.id;
      }

      // Verificar se já existe em premium_users
      const { data: existing } = await supabase
        .from('premium_users')
        .select('id, subscription_end')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        // Atualizar existente - estender se ainda ativo
        let newEndDate = subscriptionEnd;
        if (existing.subscription_end) {
          const currentEnd = new Date(existing.subscription_end);
          if (currentEnd > subscriptionStart) {
            newEndDate = new Date(currentEnd);
            newEndDate.setDate(newEndDate.getDate() + days);
          }
        }

        const { error } = await supabase
          .from('premium_users')
          .update({
            name: name || profile?.name || 'Assinante Conteúdo Privado',
            user_id: userId,
            whatsapp: whatsapp || undefined,
            subscription_status: 'active',
            subscription_type: planType,
            subscription_start: subscriptionStart.toISOString(),
            subscription_end: newEndDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;

        setResult({
          success: true,
          message: 'Conteúdo Privado atualizado com sucesso!',
          email: normalizedEmail,
          plan: planType,
          expires: newEndDate.toISOString(),
        });

        toast.success(`Conteúdo Privado ${planType} ativado para ${normalizedEmail}`);
      } else {
        // Criar novo
        const { error } = await supabase
          .from('premium_users')
          .insert({
            email: normalizedEmail,
            user_id: userId,
            name: name || profile?.name || 'Assinante Conteúdo Privado',
            whatsapp: whatsapp || null,
            subscription_status: 'active',
            subscription_type: planType,
            subscription_start: subscriptionStart.toISOString(),
            subscription_end: subscriptionEnd.toISOString(),
          });

        if (error) throw error;

        setResult({
          success: true,
          message: 'Novo Conteúdo Privado criado com sucesso!',
          email: normalizedEmail,
          plan: planType,
          expires: subscriptionEnd.toISOString(),
        });

        toast.success(`Novo Conteúdo Privado ${planType} criado para ${normalizedEmail}`);
      }

      // Limpar formulário
      setEmail('');
      setName('');
      setWhatsapp('');
    } catch (error: any) {
      console.error('Erro ao ativar Conteúdo Privado:', error);
      setResult({
        success: false,
        message: error.message || 'Erro ao ativar Conteúdo Privado',
      });
      toast.error('Erro ao ativar Conteúdo Privado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <Crown className="w-5 h-5" />
          Ativar Conteúdo Privado Manualmente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Usuário *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/50 border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Nome do usuário"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/50 border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
            <Input
              id="whatsapp"
              type="text"
              placeholder="11999999999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="bg-black/50 border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Plano</Label>
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger className="bg-black/50 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal (30 dias)</SelectItem>
                <SelectItem value="trimestral">Trimestral (90 dias)</SelectItem>
                <SelectItem value="anual">Anual (365 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleActivateVIP}
          disabled={loading || !email.trim()}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ativando...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Ativar Conteúdo Privado Manualmente
            </>
          )}
        </Button>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{result.message}</span>
            </div>
            {result.success && (
              <div className="mt-2 text-sm opacity-80">
                <p>Email: {result.email}</p>
                <p>Plano: {result.plan}</p>
                <p>Expira: {result.expires ? new Date(result.expires).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>⚠️ Use esta funcionalidade apenas para casos de emergência ou quando o webhook do Hoopay falhar.</p>
          <p>O sistema irá verificar se o usuário já existe e estender a assinatura se ainda estiver ativa.</p>
        </div>
      </CardContent>
    </Card>
  );
};
