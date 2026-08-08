import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Sparkles, ArrowUp, ArrowDown, Save, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';

interface StoryModel {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  followers_count: number | null;
  carousel_visible: boolean;
  carousel_order: number | null;
  has_video: boolean;
}

export const AdminStoriesCarousel = () => {
  const [models, setModels] = useState<StoryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState<Record<string, Partial<StoryModel>>>({});

  const load = async () => {
    setLoading(true);
    const { data: modelsData, error } = await (supabase as any)
      .from('models')
      .select('id, name, username, avatar_url, followers_count, carousel_visible, carousel_order')
      .eq('is_active', true)
      .order('carousel_order', { ascending: true, nullsFirst: false })
      .order('followers_count', { ascending: false })
      .limit(500);

    if (error) {
      toast.error('Erro ao carregar modelos');
      setLoading(false);
      return;
    }

    const { data: videoRows } = await supabase
      .from('videos')
      .select('model_id')
      .eq('is_active', true)
      .not('model_id', 'is', null);
    const withVideo = new Set<string>((videoRows || []).map((r: any) => r.model_id).filter(Boolean));

    setModels(
      (modelsData || []).map((m: any) => ({
        ...m,
        has_video: withVideo.has(m.id),
      }))
    );
    setDirty({});
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<StoryModel>) => {
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setDirty((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const move = (index: number, dir: -1 | 1) => {
    const filtered = filteredModels();
    const target = filtered[index + dir];
    const current = filtered[index];
    if (!target || !current) return;

    const a = current.carousel_order ?? (index + 1) * 10;
    const b = target.carousel_order ?? (index + dir + 1) * 10;
    update(current.id, { carousel_order: b });
    update(target.id, { carousel_order: a });
  };

  const saveAll = async () => {
    const entries = Object.entries(dirty);
    if (entries.length === 0) {
      toast.info('Nada para salvar');
      return;
    }
    setSaving(true);
    let ok = 0;
    for (const [id, patch] of entries) {
      const payload: any = {};
      if ('carousel_visible' in patch) payload.carousel_visible = patch.carousel_visible;
      if ('carousel_order' in patch) payload.carousel_order = patch.carousel_order;
      const { error } = await (supabase as any).from('models').update(payload).eq('id', id);
      if (!error) ok++;
    }
    setSaving(false);
    toast.success(`${ok}/${entries.length} atualizações salvas`);
    setDirty({});
    load();
  };

  const resetOrder = async () => {
    if (!confirm('Limpar ordem manual? O carrossel voltará a ordenar por seguidores.')) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from('models')
      .update({ carousel_order: null })
      .not('carousel_order', 'is', null);
    setSaving(false);
    if (error) toast.error('Erro ao resetar ordem');
    else {
      toast.success('Ordem manual limpa');
      load();
    }
  };

  const filteredModels = () => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)
    );
  };

  const list = filteredModels();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Stories / Novas Modelos
          </h2>
          <p className="text-sm text-gray-400">
            Controle quais modelos aparecem no carrossel do topo e a ordem manual.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Recarregar
          </Button>
          <Button onClick={resetOrder} variant="outline" disabled={saving}>
            Limpar ordem manual
          </Button>
          <Button
            onClick={saveAll}
            disabled={saving || Object.keys(dirty).length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar {Object.keys(dirty).length > 0 && `(${Object.keys(dirty).length})`}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por nome ou @username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-gray-900 border-gray-700 text-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando modelos...</div>
      ) : (
        <div className="space-y-2">
          {list.map((m, i) => (
            <Card
              key={m.id}
              className="p-3 bg-gray-900 border-gray-800 flex items-center gap-3 flex-wrap"
            >
              <div className="flex items-center gap-2 text-gray-500 text-sm w-10">
                #{i + 1}
              </div>
              <img
                src={m.avatar_url || DEFAULT_AVATAR}
                alt={m.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/40"
                onError={(e) => ((e.currentTarget.src = DEFAULT_AVATAR))}
              />
              <div className="flex-1 min-w-[160px]">
                <div className="text-white font-semibold">{m.name}</div>
                <div className="text-xs text-gray-400">
                  @{m.username || '—'} · {m.followers_count || 0} seguidores
                  {!m.has_video && (
                    <span className="ml-2 text-amber-400">⚠ sem vídeo ativo</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => move(i, 1)}
                  disabled={i === list.length - 1}
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  value={m.carousel_order ?? ''}
                  placeholder="auto"
                  onChange={(e) =>
                    update(m.id, {
                      carousel_order: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="bg-gray-800 border-gray-700 text-white text-center"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Visível</span>
                <Switch
                  checked={m.carousel_visible}
                  onCheckedChange={(v) => update(m.id, { carousel_visible: v })}
                />
              </div>
            </Card>
          ))}
          {list.length === 0 && (
            <div className="text-center py-8 text-gray-500">Nenhuma modelo encontrada</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminStoriesCarousel;
