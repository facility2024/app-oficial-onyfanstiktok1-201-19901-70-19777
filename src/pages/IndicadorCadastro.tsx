import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Coins, Share2, DollarSign, Gift } from 'lucide-react';
import { z } from 'zod';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import coconCoin from '@/assets/cocon-coin.png.asset.json';

const schema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(80),
  email: z.string().trim().email('E-mail inválido').max(255),
  password: z.string().min(6, 'Senha deve ter 6+ caracteres').max(72),
  whatsapp: z.string().trim().min(10, 'WhatsApp inválido').max(20),
});

const generateCode = (name: string) => {
  const clean = name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4) || 'IND';
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${clean}-${rand}`;
};

export default function IndicadorCadastro() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const refFromLink = params.get('ref');
  useReferralTracking('indicador-cadastro');

  const [form, setForm] = useState({ name: '', email: '', password: '', whatsapp: '' });
  const [loading, setLoading] = useState(false);
  const [cfg, setCfg] = useState<{ cocon_value_brl: number; cocons_per_referral: number; program_active: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('referral_program_config').select('*').limit(1).maybeSingle();
      setCfg(data);
    })();
    if (refFromLink) {
      sessionStorage.setItem('referral_code', refFromLink.toUpperCase());
      localStorage.setItem('pending_referral_code', refFromLink.toUpperCase());
    }
  }, [refFromLink]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      // 1) Achar indicador (se veio de link)
      let referrerId: string | null = null;
      const code = refFromLink || localStorage.getItem('pending_referral_code');
      if (code) {
        const { data: ref } = await supabase
          .from('profiles').select('id').ilike('referral_code', code).maybeSingle();
        if (ref) referrerId = (ref as any).id;
      }

      // 2) Signup
      const { data: signup, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/indicador`,
          data: { name: form.name, whatsapp: form.whatsapp, is_referrer_only: true },
        },
      });
      if (signErr) throw signErr;
      const userId = signup.user?.id;
      if (!userId) throw new Error('Falha ao criar conta');

      // 3) Criar/atualizar profile
      const referralCode = generateCode(form.name);
      const payload: any = {
        id: userId,
        name: form.name,
        email: form.email,
        phone: form.whatsapp,
        referral_code: referralCode,
        is_referrer_only: true,
      };
      if (referrerId) payload.referred_by = referrerId;

      // Retry: aguardar trigger de perfil
      for (let i = 0; i < 5; i++) {
        const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
        if (!error) break;
        await new Promise(r => setTimeout(r, 400));
      }

      // 4) Carteira
      await (supabase as any).from('user_wallets')
        .upsert({ user_id: userId, nudix_balance: 0, total_earned: 0 }, { onConflict: 'user_id' });

      localStorage.removeItem('pending_referral_code');
      sessionStorage.removeItem('referral_code');

      toast.success('Cadastro concluído! Redirecionando...');
      setTimeout(() => navigate('/indicador'), 1200);
    } catch (err: any) {
      toast.error(err.message || 'Erro no cadastro');
    } finally {
      setLoading(false);
    }
  };

  const valorPorIndicacao = cfg ? (cfg.cocons_per_referral * cfg.cocon_value_brl).toFixed(2) : '1,00';

  return (
    <div
      className="min-h-[100dvh] text-white flex flex-col items-center justify-center p-4 bg-gray-950 bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.75)), url('https://COCONUDIMUDIAL.b-cdn.net/PASTA%20TUTORIAS%20E%20ARQUIVOS%20COCONUDI/ChatGPT%20Image%205%20de%20jul.%20de%202026%2C%2008_22_21.png')",
      }}
    >

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-3xl animate-pulse" />
            <img
              src="https://COCONUDIMUDIAL.b-cdn.net/ANUNCIANTES%20COCONUDI/20.png"
              alt="Cocon"
              className="relative w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.7)]"
            />
          </div>
          <h1 className="text-3xl font-black">Vire um Indicador</h1>
          <p className="text-gray-400 mt-2">Ganhe Cocons a cada indicação aprovada</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 bg-gray-900 border-gray-700 text-center">
            <Share2 className="w-5 h-5 mx-auto text-blue-400" />
            <div className="text-xs text-gray-400 mt-1">Compartilhe</div>
          </Card>
          <Card className="p-3 bg-gray-900 border-gray-700 text-center">
            <Gift className="w-5 h-5 mx-auto text-yellow-400" />
            <div className="text-xs text-gray-400 mt-1">{cfg?.cocons_per_referral || 1} Cocon/indic.</div>
          </Card>
          <Card className="p-3 bg-gray-900 border-gray-700 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-green-400" />
            <div className="text-xs text-gray-400 mt-1">R$ {valorPorIndicacao}</div>
          </Card>
        </div>

        {refFromLink && (
          <Card className="p-3 bg-green-950 border-green-700 text-green-300 text-sm text-center">
            Você foi indicado por <strong>{refFromLink}</strong>
          </Card>
        )}

        {cfg && !cfg.program_active && (
          <Card className="p-3 bg-yellow-950 border-yellow-700 text-yellow-300 text-sm text-center">
            ⚠️ Programa temporariamente pausado. Cadastros continuam, mas bônus só serão creditados quando reativado.
          </Card>
        )}

        <Card className="p-6 bg-gray-900 border-gray-700">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-white">Nome completo</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white" placeholder="Seu nome" />
            </div>
            <div>
              <Label className="text-white">E-mail</Label>
              <Input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white" placeholder="voce@email.com" />
            </div>
            <div>
              <Label className="text-white">WhatsApp</Label>
              <Input required value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white" placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-white">Senha</Label>
              <Input required type="password" minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white" placeholder="Mínimo 6 caracteres" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-yellow-500 to-green-500 hover:opacity-90 text-gray-900 font-black text-base py-6">
              {loading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              Criar meu link de indicação
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-400">
          Já tem conta? <Link to="/auth" className="text-green-400 hover:underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
