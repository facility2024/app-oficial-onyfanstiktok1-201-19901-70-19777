import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Copy, Share2, MessageCircle, Send, Twitter, Coins, DollarSign,
  Users, TrendingUp, Loader2, LogOut, ExternalLink, Save
} from 'lucide-react';
import { logShareClick } from '@/hooks/useReferralTracking';

export default function IndicadorArea() {
  const { user, profile, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();

  const [cfg, setCfg] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [clicksCount, setClicksCount] = useState(0);
  const [wallet, setWallet] = useState<{ nudix_balance: number; total_earned: number } | null>(null);
  const [payout, setPayout] = useState<any>({
    full_name: '', cpf: '', pix_key: '', pix_type: 'cpf', neon_id: '',
    bank_name: '', bank_agency: '', bank_account: '',
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) navigate('/indicador/cadastro');
  }, [user, userLoading, navigate]);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: refs }, { count: cc }, { data: w }, { data: po }] = await Promise.all([
        (supabase as any).from('referral_program_config').select('*').limit(1).maybeSingle(),
        (supabase as any).from('referrals').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false }),
        (supabase as any).from('referral_link_clicks').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id),
        (supabase as any).from('user_wallets').select('nudix_balance, total_earned').eq('user_id', user.id).maybeSingle(),
        (supabase as any).from('referrer_payout_info').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      setCfg(c);

      const refsList = refs || [];
      const ids = Array.from(new Set(refsList.map((r: any) => r.referred_id).filter(Boolean)));
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('id, name, email').in('id', ids as string[])
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      setReferrals(refsList.map((r: any) => ({
        ...r,
        referred_name: (map.get(r.referred_id) as any)?.name
          || (map.get(r.referred_id) as any)?.email
          || r.referred_email || 'Indicado',
      })));

      setClicksCount(cc || 0);
      setWallet(w || { nudix_balance: 0, total_earned: 0 });
      if (po) setPayout({ ...payout, ...po });
    } catch (e: any) {
      toast.error('Erro ao carregar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.id) load(); /* eslint-disable-next-line */ }, [user?.id]);

  const referralCode = (profile as any)?.referral_code;
  const link = referralCode ? `${window.location.origin}/indicador/cadastro?ref=${referralCode}` : '';

  const approved = referrals.filter(r => r.status === 'approved' || r.status === 'completed');
  const pending = referrals.filter(r => r.status === 'pending');
  const cocons = approved.reduce((s, r) => s + (r.cocons_awarded || 0), 0);
  const currentValue = cfg?.cocon_value_brl || 1;
  // Saldo em tempo real (Cocons × valor atual do admin)
  const currentBalance = cocons * currentValue;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const share = (platform: 'whatsapp' | 'telegram' | 'twitter' | 'native') => {
    if (user?.id && referralCode) logShareClick(user.id, referralCode, platform);
    const msg = `🥥 Cadastre-se no COCONUDI pelo meu link e vamos crescer juntos! ${link}`;
    if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    else if (platform === 'telegram') window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🥥 COCONUDI')}`, '_blank');
    else if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, '_blank');
    else if (platform === 'native' && navigator.share) navigator.share({ title: 'COCONUDI', text: msg, url: link });
  };

  const savePayout = async () => {
    if (!user?.id) return;
    setSavingPayout(true);
    const { error } = await (supabase as any).from('referrer_payout_info').upsert({
      user_id: user.id, ...payout,
    }, { onConflict: 'user_id' });
    setSavingPayout(false);
    if (error) toast.error(error.message);
    else toast.success('Dados de recebimento salvos!');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/indicador/cadastro');
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-white w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 text-white pb-16">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-yellow-500 to-green-600 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-900/80 font-bold">ÁREA DO INDICADOR</div>
            <div className="text-lg font-black text-gray-900">Olá, {(profile as any)?.name || 'Indicador'}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={logout} className="text-gray-900 hover:bg-black/10">
            <LogOut className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* CARDS ESTATÍSTICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-gray-900 border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-xs"><Share2 className="w-4 h-4" /> Compartilhados</div>
            <div className="text-2xl font-black text-blue-400">{clicksCount}</div>
          </Card>
          <Card className="p-4 bg-gray-900 border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-xs"><Users className="w-4 h-4" /> Cadastros</div>
            <div className="text-2xl font-black text-white">{referrals.length}</div>
            <div className="text-xs text-yellow-400">{pending.length} pendente(s)</div>
          </Card>
          <Card className="p-4 bg-gray-900 border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-xs"><Coins className="w-4 h-4" /> Cocons</div>
            <div className="text-2xl font-black text-yellow-400">{cocons}</div>
            <div className="text-xs text-gray-400">{approved.length} aprovado(s)</div>
          </Card>
          <Card className="p-4 bg-gray-900 border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-xs"><DollarSign className="w-4 h-4" /> Saldo</div>
            <div className="text-2xl font-black text-green-400">R$ {currentBalance.toFixed(2)}</div>
            <div className="text-xs text-gray-400">1 Cocon = R$ {currentValue.toFixed(2)}</div>
          </Card>
        </div>

        {cfg && !cfg.program_active && (
          <Card className="p-3 bg-yellow-950 border-yellow-700 text-yellow-300 text-sm">
            ⚠️ Programa temporariamente pausado. Novas indicações não gerarão bônus até reativação.
          </Card>
        )}

        {/* LINK EXCLUSIVO */}
        <Card className="p-5 bg-gray-900 border-gray-700">
          <Label className="text-white font-bold">Seu link exclusivo</Label>
          <div className="flex gap-2 mt-2">
            <Input readOnly value={link} className="bg-gray-800 border-gray-600 text-white text-xs" />
            <Button onClick={copy} className="bg-green-600 hover:bg-green-700 text-white">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button size="sm" onClick={() => share('whatsapp')} className="bg-green-600 hover:bg-green-700 text-white flex-1">
              <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
            </Button>
            <Button size="sm" onClick={() => share('telegram')} className="bg-blue-500 hover:bg-blue-600 text-white flex-1">
              <Send className="w-4 h-4 mr-1" /> Telegram
            </Button>
            <Button size="sm" onClick={() => share('twitter')} className="bg-sky-500 hover:bg-sky-600 text-white flex-1">
              <Twitter className="w-4 h-4 mr-1" /> X
            </Button>
            {'share' in navigator && (
              <Button size="sm" onClick={() => share('native')} variant="outline" className="border-gray-600 text-white bg-gray-800 flex-1">
                <Share2 className="w-4 h-4 mr-1" /> Mais
              </Button>
            )}
          </div>
        </Card>

        {/* TABS */}
        <Tabs defaultValue="referrals">
          <TabsList className="bg-gray-900 border border-gray-700 w-full">
            <TabsTrigger value="referrals" className="flex-1">Minhas Indicações</TabsTrigger>
            <TabsTrigger value="payout" className="flex-1">Dados de Recebimento</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="mt-3 space-y-2">
            {referrals.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Ainda nenhuma indicação. Compartilhe seu link!
              </p>
            )}
            {referrals.map(r => (
              <Card key={r.id} className="p-3 bg-gray-900 border-gray-700 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{r.referred_name}</div>
                  <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <div className="text-right">
                  <Badge className={
                    r.status === 'approved' || r.status === 'completed' ? 'bg-green-600' :
                    r.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                  }>
                    {r.status === 'approved' || r.status === 'completed' ? 'Aprovada'
                      : r.status === 'pending' ? 'Pendente' : 'Cancelada'}
                  </Badge>
                  {(r.status === 'approved' || r.status === 'completed') && (
                    <div className="text-xs text-yellow-400 mt-1">+{r.cocons_awarded} Cocon</div>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="payout" className="mt-3">
            <Card className="p-5 bg-gray-900 border-gray-700 space-y-3">
              {cfg?.neon_official_link && (
                <a href={cfg.neon_official_link} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold">
                  <span>Ainda não tem conta Neon? Criar agora</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-white">Nome completo</Label>
                  <Input value={payout.full_name || ''} onChange={e => setPayout({ ...payout, full_name: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white" />
                </div>
                <div>
                  <Label className="text-white">CPF</Label>
                  <Input value={payout.cpf || ''} onChange={e => setPayout({ ...payout, cpf: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white" />
                </div>
                <div>
                  <Label className="text-white">Tipo de chave PIX</Label>
                  <select value={payout.pix_type || 'cpf'} onChange={e => setPayout({ ...payout, pix_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-600 text-white">
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave aleatória</option>
                  </select>
                </div>
                <div>
                  <Label className="text-white">Chave PIX</Label>
                  <Input value={payout.pix_key || ''} onChange={e => setPayout({ ...payout, pix_key: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white" />
                </div>
                <div>
                  <Label className="text-white">ID Neon</Label>
                  <Input value={payout.neon_id || ''} onChange={e => setPayout({ ...payout, neon_id: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white" />
                </div>
                <div>
                  <Label className="text-white">Banco (opcional)</Label>
                  <Input value={payout.bank_name || ''} onChange={e => setPayout({ ...payout, bank_name: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white" />
                </div>
                <div>
                  <Label className="text-white">Agência (opcional)</Label>
                  <Input value={payout.bank_agency || ''} onChange={e => setPayout({ ...payout, bank_agency: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white" />
                </div>
                <div>
                  <Label className="text-white">Conta (opcional)</Label>
                  <Input value={payout.bank_account || ''} onChange={e => setPayout({ ...payout, bank_account: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white" />
                </div>
              </div>

              <Button onClick={savePayout} disabled={savingPayout} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">
                {savingPayout ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar dados de recebimento
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
