import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Heart, Eye, Search, Zap, CalendarClock, Trash2, RefreshCw } from 'lucide-react';

type TargetType = 'video' | 'promo';
type TabKind = 'all' | 'model' | 'creator' | 'promo';

interface TargetRow {
  id: string;
  label: string;
  owner: string;
  origin: string;
  likes_count: number;
  views_count: number;
  base_likes: number;
  base_views: number;
  type: TargetType;
}


interface ScheduleRow {
  id: string;
  target_type: TargetType;
  target_id: string;
  target_label: string | null;
  base_likes: number;
  base_views: number;
  scheduled_at: string;
  status: string;
  applied_at: string | null;
  error_message: string | null;
}

export const AdminEngagement: React.FC = () => {
  const [tab, setTab] = useState<TabKind>('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [baseLikes, setBaseLikes] = useState<number>(0);
  const [baseViews, setBaseViews] = useState<number>(0);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const loadTargets = async () => {
    setLoading(true);
    try {
      const collected: TargetRow[] = [];

      // ---------- VÍDEOS (modelos + criadoras + externos via API) ----------
      if (tab !== 'promo') {
        let query = (supabase as any)
          .from('videos')
          .select('id, title, description, likes_count, views_count, base_likes, base_views, model_id, creator_id, source, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(500);

        if (tab === 'model') query = query.not('model_id', 'is', null);
        if (tab === 'creator') query = query.not('creator_id', 'is', null);

        const { data, error } = await query;
        if (error) throw error;
        const videos = (data || []) as any[];

        const modelIds = Array.from(new Set(videos.map((v) => v.model_id).filter(Boolean)));
        const creatorIds = Array.from(new Set(videos.map((v) => v.creator_id).filter(Boolean)));

        const [modelsRes, profilesRes] = await Promise.all([
          modelIds.length
            ? (supabase as any).from('models').select('id, name, username').in('id', modelIds)
            : Promise.resolve({ data: [] }),
          creatorIds.length
            ? (supabase as any).from('public_profiles').select('id, name, username').in('id', creatorIds)
            : Promise.resolve({ data: [] }),
        ]);

        const nameById: Record<string, string> = {};
        (modelsRes.data || []).forEach((m: any) => {
          nameById[m.id] = m.name || m.username || 'Modelo';
        });
        (profilesRes.data || []).forEach((p: any) => {
          nameById[p.id] = p.name || p.username || 'Criadora';
        });

        videos.forEach((v) => {
          const ownerId = v.creator_id || v.model_id;
          const owner = (ownerId && nameById[ownerId]) || 'Sem perfil vinculado';
          const origin = v.creator_id
            ? 'Criadora'
            : v.source
            ? `Externo (${v.source})`
            : 'Modelo';
          collected.push({
            id: v.id,
            label: v.title || v.description?.slice(0, 60) || `Vídeo ${String(v.id).slice(0, 8)}`,
            owner,
            origin,
            likes_count: v.likes_count || 0,
            views_count: v.views_count || 0,
            base_likes: v.base_likes || 0,
            base_views: v.base_views || 0,
            type: 'video',
          });
        });
      }

      // ---------- PROMOS DO FEED ----------
      if (tab === 'all' || tab === 'promo') {
        const { data, error } = await (supabase as any)
          .from('feed_promotions')
          .select('id, display_name, title, description, views_count, base_likes, base_views')
          .order('created_at', { ascending: false })
          .limit(300);
        if (error) throw error;
        (data || []).forEach((p: any) => {
          collected.push({
            id: p.id,
            label: p.title || p.display_name || p.description?.slice(0, 60) || `Promo ${String(p.id).slice(0, 8)}`,
            owner: p.display_name || 'Promo',
            origin: 'Promo do Feed',
            likes_count: 0,
            views_count: p.views_count || 0,
            base_likes: p.base_likes || 0,
            base_views: p.base_views || 0,
            type: 'promo',
          });
        });
      }

      setRows(collected);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar itens: ' + (e?.message || 'desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  // Busca por nome do vídeo, nome da modelo/criadora ou ID (completo ou parcial)
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows.slice(0, 100);
    return rows
      .filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      )
      .slice(0, 100);
  }, [rows, search]);


  const loadSchedules = async () => {
    const { data, error } = await (supabase as any)
      .from('engagement_schedules')
      .select('*')
      .order('scheduled_at', { ascending: true })
      .limit(100);
    if (error) {
      console.warn(error);
      return;
    }
    setSchedules((data || []) as ScheduleRow[]);
  };

  useEffect(() => {
    setSelected({});
    loadTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    loadSchedules();
  }, []);

  const applyNow = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um item');
      return;
    }
    setSaving(true);
    try {
      const videoIds = selectedIds.filter((id) => rows.find((r) => r.id === id)?.type === 'video');
      const promoIds = selectedIds.filter((id) => rows.find((r) => r.id === id)?.type === 'promo');

      if (videoIds.length) {
        const { error } = await (supabase as any)
          .from('videos')
          .update({ base_likes: baseLikes, base_views: baseViews })
          .in('id', videoIds);
        if (error) throw error;
      }
      if (promoIds.length) {
        const { error } = await (supabase as any)
          .from('feed_promotions')
          .update({ base_likes: baseLikes, base_views: baseViews })
          .in('id', promoIds);
        if (error) throw error;
      }
      toast.success(`Aplicado em ${selectedIds.length} item(ns)`);
      setSelected({});
      loadTargets();
    } catch (e: any) {
      toast.error('Erro ao aplicar: ' + (e?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const schedule = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um item');
      return;
    }
    if (!scheduledAt) {
      toast.error('Escolha a data e a hora do agendamento');
      return;
    }
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload = selectedIds.map((id) => ({
        target_type: rows.find((r) => r.id === id)?.type || 'video',
        target_id: id,
        target_label: rows.find((r) => r.id === id)?.label || null,
        base_likes: baseLikes,
        base_views: baseViews,
        scheduled_at: new Date(scheduledAt).toISOString(),
        created_by: authData?.user?.id || null,
      }));
      const { error } = await (supabase as any).from('engagement_schedules').insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} agendamento(s) criado(s)`);
      setSelected({});
      loadSchedules();
    } catch (e: any) {
      toast.error('Erro ao agendar: ' + (e?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const cancelSchedule = async (id: string) => {
    const { error } = await (supabase as any)
      .from('engagement_schedules')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao cancelar');
      return;
    }
    toast.success('Agendamento cancelado');
    loadSchedules();
  };

  const removeSchedule = async (id: string) => {
    const { error } = await (supabase as any).from('engagement_schedules').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover');
      return;
    }
    loadSchedules();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500 text-black',
      applied: 'bg-green-600 text-white',
      cancelled: 'bg-gray-600 text-white',
      error: 'bg-red-600 text-white',
    };
    const label: Record<string, string> = {
      pending: 'Pendente',
      applied: 'Aplicado',
      cancelled: 'Cancelado',
      error: 'Erro',
    };
    return <Badge className={`${map[status] || 'bg-gray-600'} font-bold`}>{label[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Engajamento — Curtidas e Visualizações
          </CardTitle>
          <p className="text-sm text-gray-300">
            O número exibido no app é <strong className="text-white">base + real</strong>. Os números
            reais continuam somando conforme as pessoas curtem e assistem (1 visualização por pessoa a cada 24h).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKind)}>
            <TabsList className="bg-gray-800 border border-gray-700 flex-wrap h-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                Todos
              </TabsTrigger>
              <TabsTrigger value="model" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                Modelos / API externa
              </TabsTrigger>
              <TabsTrigger value="creator" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                Criadoras
              </TabsTrigger>
              <TabsTrigger value="promo" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                Promos do Feed
              </TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome do vídeo, modelo/criadora ou ID..."
                    className="pl-9 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <Button onClick={loadTargets} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <p className="text-xs text-gray-400">
                {filteredRows.length} item(ns) exibido(s) de {rows.length} carregado(s).
              </p>

              <div className="border border-gray-700 rounded-lg divide-y divide-gray-800 max-h-[380px] overflow-auto">
                {filteredRows.length === 0 && (
                  <div className="p-4 text-gray-400 text-sm">Nenhum item encontrado.</div>
                )}
                {filteredRows.map((r) => (
                  <label
                    key={`${r.type}-${r.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-gray-800/70 cursor-pointer"
                  >
                    <Checkbox
                      checked={!!selected[r.id]}
                      onCheckedChange={(c) => setSelected((prev) => ({ ...prev, [r.id]: !!c }))}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {r.owner} <span className="text-gray-400 font-normal">— {r.label}</span>
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {r.id}
                        <span className="ml-2 font-sans text-purple-300 font-bold">{r.origin}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <span className="text-pink-400 font-bold flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {r.base_likes + r.likes_count}
                        <span className="text-gray-500 font-normal">({r.base_likes}+{r.likes_count})</span>
                      </span>
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {r.base_views + r.views_count}
                        <span className="text-gray-500 font-normal">({r.base_views}+{r.views_count})</span>
                      </span>
                    </div>
                  </label>
                ))}
              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-white font-bold">Curtidas base</Label>
                  <Input
                    type="number"
                    min={0}
                    value={baseLikes}
                    onChange={(e) => setBaseLikes(Math.max(0, Number(e.target.value) || 0))}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white font-bold">Visualizações base</Label>
                  <Input
                    type="number"
                    min={0}
                    value={baseViews}
                    onChange={(e) => setBaseViews(Math.max(0, Number(e.target.value) || 0))}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white font-bold">Agendar para (data e hora)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={applyNow}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Aplicar agora ({selectedIds.length})
                </Button>
                <Button
                  onClick={schedule}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Agendar ({selectedIds.length})
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white font-bold flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-400" />
            Agendamentos
          </CardTitle>
          <Button onClick={loadSchedules} variant="outline" size="sm" className="border-gray-600 text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum agendamento criado.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {schedules.map((s) => (
                <div key={s.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {s.target_label || s.target_id.slice(0, 8)}
                      <span className="ml-2 text-xs text-gray-400">
                        {s.target_type === 'video' ? 'Vídeo' : 'Promo'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.scheduled_at).toLocaleString('pt-BR')} •{' '}
                      <span className="text-pink-400 font-bold">{s.base_likes} curtidas</span> •{' '}
                      <span className="text-cyan-400 font-bold">{s.base_views} views</span>
                      {s.error_message ? ` • ${s.error_message}` : ''}
                    </p>
                  </div>
                  {statusBadge(s.status)}
                  {s.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelSchedule(s.id)}
                      className="border-gray-600 text-white font-bold"
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeSchedule(s.id)}
                    className="font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEngagement;
