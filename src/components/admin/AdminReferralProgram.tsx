import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Check, X, RefreshCw, Coins, DollarSign, Users, TrendingUp } from 'lucide-react';

interface Config {
  id: string;
  cocon_value_brl: number;
  cocons_per_referral: number;
  bonus_percentage: number;
  program_active: boolean;
  neon_official_link: string;
}

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  referred_email: string | null;
  status: string;
  bonus_amount: number;
  cocons_awarded: number;
  created_at: string;
  approved_at: string | null;
  referrer_name?: string;
  referred_name?: string;
}

interface ReferrerStat {
  user_id: string;
  name: string;
  email: string;
  total: number;
  approved: number;
  pending: number;
  cocons: number;
  amount: number;
  pix_key?: string;
  neon_id?: string;
}

export const AdminReferralProgram = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referrers, setReferrers] = useState<ReferrerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'cancelled'>('pending');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: cfg }, { data: refs }, { data: payouts }, { data: allIndicadores }] = await Promise.all([
        (supabase as any).from('referral_program_config').select('*').limit(1).maybeSingle(),
        (supabase as any).from('referrals').select('*').order('created_at', { ascending: false }).limit(500),
        (supabase as any).from('referrer_payout_info').select('*'),
        (supabase as any).from('profiles').select('id, name, email, referral_code').not('referral_code', 'is', null),
      ]);

      setConfig(cfg);

      const refsList: ReferralRow[] = refs || [];
      // Enriquecer com nomes (referrers + referred)
      const ids = Array.from(new Set([
        ...refsList.flatMap(r => [r.referrer_id, r.referred_id]).filter(Boolean),
        ...(allIndicadores || []).map((p: any) => p.id),
      ]));
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('id, name, email').in('id', ids)
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      setReferrals(refsList.map(r => ({
        ...r,
        referrer_name: (map.get(r.referrer_id) as any)?.name || (map.get(r.referrer_id) as any)?.email || '—',
        referred_name: (map.get(r.referred_id) as any)?.name || r.referred_email || '—',
      })));

      // Começar pela lista completa de possíveis indicadores (todos com referral_code)
      const grouped = new Map<string, ReferrerStat>();
      for (const p of (allIndicadores || []) as any[]) {
        grouped.set(p.id, {
          user_id: p.id,
          name: p.name || '—',
          email: p.email || '',
          total: 0, approved: 0, pending: 0, cocons: 0, amount: 0,
        });
      }
      // Somar indicações de cada indicador
      for (const r of refsList) {
        const g = grouped.get(r.referrer_id) || {
          user_id: r.referrer_id,
          name: (map.get(r.referrer_id) as any)?.name || '—',
          email: (map.get(r.referrer_id) as any)?.email || '',
          total: 0, approved: 0, pending: 0, cocons: 0, amount: 0,
        };
        g.total += 1;
        if (r.status === 'approved' || r.status === 'completed') {
          g.approved += 1;
          g.cocons += r.cocons_awarded || 0;
          g.amount += Number(r.bonus_amount || 0);
        } else if (r.status === 'pending') g.pending += 1;
        grouped.set(r.referrer_id, g);
      }
      const payoutMap = new Map((payouts || []).map((p: any) => [p.user_id, p]));
      const list = Array.from(grouped.values()).map(g => ({
        ...g,
        pix_key: (payoutMap.get(g.user_id) as any)?.pix_key,
        neon_id: (payoutMap.get(g.user_id) as any)?.neon_id,
      }));
      list.sort((a, b) => (b.approved - a.approved) || (b.total - a.total) || a.name.localeCompare(b.name));
      setReferrers(list);
    } catch (e: any) {
      toast.error('Erro ao carregar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from('referral_program_config')
      .update({
        cocon_value_brl: config.cocon_value_brl,
        cocons_per_referral: config.cocons_per_referral,
        bonus_percentage: config.bonus_percentage,
        program_active: config.program_active,
        neon_official_link: config.neon_official_link,
      })
      .eq('id', config.id);
    setSaving(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success('Configurações salvas!');
  };

  const approve = async (id: string) => {
    const { error } = await (supabase.rpc as any)('approve_referral', { p_referral_id: id });
    if (error) return toast.error(error.message);
    toast.success('Indicação aprovada e Cocons creditados!');
    loadAll();
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancelar esta indicação? Se já foi aprovada, o valor será estornado.')) return;
    const { error } = await (supabase.rpc as any)('cancel_referral', { p_referral_id: id });
    if (error) return toast.error(error.message);
    toast.success('Indicação cancelada.');
    loadAll();
  };

  const deleteReferrer = async (userId: string, name: string) => {
    if (!confirm(`Excluir o indicador "${name}"?\n\nIsso removerá TODAS as indicações e dados de pagamento dele do banco de dados. Ação irreversível.`)) return;
    try {
      const { error } = await (supabase.rpc as any)('admin_delete_referrer', { p_user_id: userId });
      if (error) throw error;
      toast.success('Indicador excluído do programa.');
      loadAll();
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    }
  };

  const filtered = referrals.filter(r => filter === 'all' || r.status === filter);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-black">Programa de Indicação (Cocons)</h1>
        <Button onClick={loadAll} variant="outline" size="sm" className="bg-gray-800 text-white border-gray-600">
          <RefreshCw className="w-4 h-4 mr-2" /> Recarregar
        </Button>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="bg-gray-900 border border-gray-700">
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="referrals">Indicações</TabsTrigger>
          <TabsTrigger value="referrers">Indicadores</TabsTrigger>
        </TabsList>

        {/* CONFIGURAÇÕES */}
        <TabsContent value="config" className="mt-4">
          <Card className="p-6 bg-gray-900 border-gray-700 space-y-5">
            {config && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-base font-bold">Programa Ativo</Label>
                    <p className="text-sm text-gray-400">Se desativado, novas indicações não geram bônus.</p>
                  </div>
                  <Switch
                    checked={config.program_active}
                    onCheckedChange={(v) => setConfig({ ...config, program_active: v })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white">Valor de cada Cocon (R$)</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={config.cocon_value_brl}
                      onChange={(e) => setConfig({ ...config, cocon_value_brl: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Cocons por indicação aprovada</Label>
                    <Input
                      type="number" min="0"
                      value={config.cocons_per_referral}
                      onChange={(e) => setConfig({ ...config, cocons_per_referral: parseInt(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Percentual bônus (%) — futuro</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={config.bonus_percentage}
                      onChange={(e) => setConfig({ ...config, bonus_percentage: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Link oficial da Neon</Label>
                  <Input
                    value={config.neon_official_link || ''}
                    onChange={(e) => setConfig({ ...config, neon_official_link: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="https://www.neon.com.br"
                  />
                </div>

                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <p className="text-sm text-gray-300">
                    <strong className="text-green-400">Preview:</strong> Cada indicação aprovada credita{' '}
                    <strong>{config.cocons_per_referral} Cocon(s)</strong> =
                    <strong className="text-green-400"> R$ {(config.cocons_per_referral * config.cocon_value_brl).toFixed(2)}</strong>
                  </p>
                </div>

                <Button onClick={saveConfig} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                  {saving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                  Salvar configurações
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        {/* INDICAÇÕES */}
        <TabsContent value="referrals" className="mt-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['pending', 'approved', 'cancelled', 'all'] as const).map(f => (
              <Button
                key={f}
                size="sm"
                onClick={() => setFilter(f)}
                variant={filter === f ? 'default' : 'outline'}
                className={filter === f ? 'bg-green-600 text-white' : 'bg-gray-800 text-white border-gray-600'}
              >
                {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : f === 'cancelled' ? 'Canceladas' : 'Todas'}
                {' '}({referrals.filter(r => f === 'all' || r.status === f).length})
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map(r => (
              <Card key={r.id} className="p-4 bg-gray-900 border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{r.referrer_name}</span>
                      <span className="text-gray-400">indicou</span>
                      <span className="font-bold text-green-400">{r.referred_name}</span>
                      <Badge className={
                        r.status === 'approved' || r.status === 'completed' ? 'bg-green-600' :
                        r.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                      }>{r.status}</Badge>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                      {(r.status === 'approved' || r.status === 'completed') && (
                        <> · {r.cocons_awarded} Cocons · R$ {Number(r.bonus_amount).toFixed(2)}</>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'pending' && (
                      <Button size="sm" onClick={() => approve(r.id)} className="bg-green-600 hover:bg-green-700 text-white">
                        <Check className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                    )}
                    {r.status !== 'cancelled' && (
                      <Button size="sm" onClick={() => cancel(r.id)} variant="outline" className="border-red-600 text-red-400 hover:bg-red-950">
                        <X className="w-4 h-4 mr-1" /> Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma indicação nesta categoria.</p>
            )}
          </div>
        </TabsContent>

        {/* INDICADORES */}
        <TabsContent value="referrers" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Card className="p-4 bg-gray-900 border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm"><Users className="w-4 h-4" /> Indicadores</div>
              <div className="text-2xl font-black text-white">{referrers.length}</div>
            </Card>
            <Card className="p-4 bg-gray-900 border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm"><TrendingUp className="w-4 h-4" /> Indicações totais</div>
              <div className="text-2xl font-black text-white">{referrals.length}</div>
            </Card>
            <Card className="p-4 bg-gray-900 border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm"><Coins className="w-4 h-4" /> Cocons pagos</div>
              <div className="text-2xl font-black text-yellow-400">{referrers.reduce((s, r) => s + r.cocons, 0)}</div>
            </Card>
            <Card className="p-4 bg-gray-900 border-gray-700">
              <div className="flex items-center gap-2 text-gray-400 text-sm"><DollarSign className="w-4 h-4" /> Total R$</div>
              <div className="text-2xl font-black text-green-400">R$ {referrers.reduce((s, r) => s + r.amount, 0).toFixed(2)}</div>
            </Card>
          </div>

          <div className="space-y-2">
            {referrers.map(r => (
              <Card key={r.user_id} className="p-4 bg-gray-900 border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div>
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.email}</div>
                    {(r.pix_key || r.neon_id) && (
                      <div className="text-xs text-blue-400 mt-1">
                        {r.pix_key && <>PIX: {r.pix_key}</>}
                        {r.pix_key && r.neon_id && ' · '}
                        {r.neon_id && <>Neon: {r.neon_id}</>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm items-center">
                    <div className="text-center"><div className="text-gray-400 text-xs">Total</div><div className="font-bold text-white">{r.total}</div></div>
                    <div className="text-center"><div className="text-gray-400 text-xs">Aprov.</div><div className="font-bold text-green-400">{r.approved}</div></div>
                    <div className="text-center"><div className="text-gray-400 text-xs">Pend.</div><div className="font-bold text-yellow-400">{r.pending}</div></div>
                    <div className="text-center"><div className="text-gray-400 text-xs">Cocons</div><div className="font-bold text-yellow-400">{r.cocons}</div></div>
                    <div className="text-center"><div className="text-gray-400 text-xs">R$</div><div className="font-bold text-green-400">{r.amount.toFixed(2)}</div></div>
                    <Button
                      size="sm"
                      onClick={() => deleteReferrer(r.user_id, r.name)}
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-950"
                    >
                      <X className="w-4 h-4 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {referrers.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum indicador ainda.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReferralProgram;
