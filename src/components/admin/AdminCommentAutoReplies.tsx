import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MessageSquare, Video as VideoIcon, CheckCheck, X } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';

const DEFAULT_MSG = '🥰 oi meu amor, obrigado pelo comentário. 🤗 Aqui você vai ver tudo que as redes do TikTok e Instagram não mostram.';

interface ConfigRow {
  id: string;
  owner_id: string;
  owner_type: 'model' | 'creator';
  message: string;
  is_active: boolean;
  name: string;
  avatar: string;
}

interface VideoRow {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  is_active: boolean;
  comment_auto_reply_enabled: boolean;
  model_id: string | null;
  creator_id: string | null;
  name: string;
  avatar: string;
  has_config: boolean;
}

export default function AdminCommentAutoReplies() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);

  const [cfgSelected, setCfgSelected] = useState<Set<string>>(new Set());
  const [vidSelected, setVidSelected] = useState<Set<string>>(new Set());

  const [cfgSearch, setCfgSearch] = useState('');
  const [vidSearch, setVidSearch] = useState('');
  const [vidFilter, setVidFilter] = useState<'all' | 'on' | 'off' | 'hasCfg'>('all');
  const [bulkMessage, setBulkMessage] = useState(DEFAULT_MSG);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: cfg }, { data: mods }, { data: profs }, { data: vids }] = await Promise.all([
        supabase.from('comment_auto_reply_configs').select('*'),
        supabase.from('models').select('id, name, avatar_url'),
        supabase.from('profiles').select('id, name, email, avatar_url'),
        supabase.from('videos').select('id,title,thumbnail_url,video_url,is_active,comment_auto_reply_enabled,model_id,creator_id')
          .eq('is_active', true).order('created_at', { ascending: false }).limit(2000),
      ]);
      const mMap = new Map((mods || []).map((m: any) => [m.id, m]));
      const pMap = new Map((profs || []).map((p: any) => [p.id, p]));

      const enrichedCfg: ConfigRow[] = (cfg || []).map((c: any) => {
        const src: any = c.owner_type === 'model' ? mMap.get(c.owner_id) : pMap.get(c.owner_id);
        return {
          id: c.id, owner_id: c.owner_id, owner_type: c.owner_type,
          message: c.message, is_active: c.is_active,
          name: src?.name || src?.email?.split('@')[0] || 'Sem nome',
          avatar: src?.avatar_url || DEFAULT_AVATAR,
        };
      });

      const cfgKeys = new Set(enrichedCfg.filter(c => c.is_active).map(c => `${c.owner_type}:${c.owner_id}`));

      const enrichedVids: VideoRow[] = (vids || []).map((v: any) => {
        const src: any = v.creator_id ? pMap.get(v.creator_id) : (v.model_id ? mMap.get(v.model_id) : null);
        const key = v.creator_id ? `creator:${v.creator_id}` : `model:${v.model_id}`;
        return {
          id: v.id, title: v.title, thumbnail_url: v.thumbnail_url, video_url: v.video_url,
          is_active: v.is_active, comment_auto_reply_enabled: !!v.comment_auto_reply_enabled,
          model_id: v.model_id, creator_id: v.creator_id,
          name: src?.name || src?.email?.split('@')[0] || 'Sem nome',
          avatar: src?.avatar_url || DEFAULT_AVATAR,
          has_config: cfgKeys.has(key),
        };
      });

      setConfigs(enrichedCfg);
      setVideos(enrichedVids);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const filteredCfg = useMemo(() => {
    const q = cfgSearch.trim().toLowerCase();
    return configs.filter(c => !q || c.name.toLowerCase().includes(q));
  }, [configs, cfgSearch]);

  const filteredVids = useMemo(() => {
    const q = vidSearch.trim().toLowerCase();
    return videos.filter(v => {
      if (q && !(v.name.toLowerCase().includes(q) || (v.title || '').toLowerCase().includes(q))) return false;
      if (vidFilter === 'on') return v.comment_auto_reply_enabled;
      if (vidFilter === 'off') return !v.comment_auto_reply_enabled;
      if (vidFilter === 'hasCfg') return v.has_config;
      return true;
    });
  }, [videos, vidSearch, vidFilter]);

  // ============= CONFIGS =============
  const setCfgActive = async (ids: string[], active: boolean) => {
    if (!ids.length) return toast({ title: 'Selecione ao menos um', variant: 'destructive' });
    setSaving(true);
    const { error } = await supabase.from('comment_auto_reply_configs').update({ is_active: active }).in('id', ids);
    setSaving(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: active ? `${ids.length} ativados` : `${ids.length} desativados` });
    setConfigs(prev => prev.map(c => ids.includes(c.id) ? { ...c, is_active: active } : c));
  };

  const applyMsg = async (ids: string[]) => {
    if (!ids.length) return toast({ title: 'Selecione ao menos um', variant: 'destructive' });
    if (!bulkMessage.trim()) return toast({ title: 'Escreva a mensagem', variant: 'destructive' });
    setSaving(true);
    const { error } = await supabase.from('comment_auto_reply_configs').update({ message: bulkMessage }).in('id', ids);
    setSaving(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: `Mensagem aplicada em ${ids.length}` });
    setConfigs(prev => prev.map(c => ids.includes(c.id) ? { ...c, message: bulkMessage } : c));
  };

  const applyMsgAll = async () => {
    if (!bulkMessage.trim()) return toast({ title: 'Escreva a mensagem', variant: 'destructive' });
    if (!confirm(`Aplicar essa mensagem em TODAS as ${configs.length} configurações?`)) return;
    setSaving(true);
    const { error } = await supabase.from('comment_auto_reply_configs').update({ message: bulkMessage }).not('id', 'is', null);
    setSaving(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: `Mensagem aplicada em ${configs.length}` });
    loadAll();
  };

  const updateSingleMsg = async (id: string, message: string) => {
    const { error } = await supabase.from('comment_auto_reply_configs').update({ message }).eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, message } : c));
    toast({ title: 'Mensagem salva' });
  };

  // ============= VIDEOS =============
  const setVidFlag = async (ids: string[], enabled: boolean) => {
    if (!ids.length) return toast({ title: 'Selecione ao menos um vídeo', variant: 'destructive' });
    setSaving(true);
    const CHUNK = 50;
    let done = 0, failed = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('videos').update({ comment_auto_reply_enabled: enabled }).in('id', slice);
      if (error) { failed += slice.length; console.error('chunk err', error); }
      else done += slice.length;
    }
    setSaving(false);
    if (failed) return toast({ title: 'Concluído com falhas', description: `${done} ok, ${failed} falharam`, variant: 'destructive' });
    if (enabled) await ensureConfigsForVideos(ids);
    toast({ title: enabled ? `${done} vídeos ativados` : `${done} vídeos desativados` });
    setVideos(prev => prev.map(v => ids.includes(v.id) ? { ...v, comment_auto_reply_enabled: enabled } : v));
  };


  const ensureConfigsForVideos = async (videoIds: string[]) => {
    const affected = videos.filter(v => videoIds.includes(v.id));
    const rows: any[] = [];
    const seen = new Set<string>();
    for (const v of affected) {
      const type = v.creator_id ? 'creator' : (v.model_id ? 'model' : null);
      const id = v.creator_id || v.model_id;
      if (!type || !id) continue;
      const key = `${type}:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const exists = configs.find(c => c.owner_type === type && c.owner_id === id);
      if (!exists) rows.push({ owner_id: id, owner_type: type, message: bulkMessage || DEFAULT_MSG, is_active: true });
    }
    if (rows.length) {
      await supabase.from('comment_auto_reply_configs').upsert(rows, { onConflict: 'owner_id,owner_type' });
      loadAll();
    }
  };

  const bulkVidsAll = async (enabled: boolean) => {
    const target = filteredVids.filter(v => v.comment_auto_reply_enabled !== enabled);
    if (!target.length) return toast({ title: 'Nada a alterar' });
    if (!confirm(`${enabled ? 'Ativar' : 'Desativar'} em ${target.length} vídeos filtrados?`)) return;
    await setVidFlag(target.map(v => v.id), enabled);
  };

  const toggleSingleVid = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from('videos').update({ comment_auto_reply_enabled: enabled }).eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    if (enabled) await ensureConfigsForVideos([id]);
    setVideos(prev => prev.map(v => v.id === id ? { ...v, comment_auto_reply_enabled: enabled } : v));
  };

  // Aplica mensagem nas configs dos DONOS dos vídeos (selecionados ou filtrados)
  const applyMsgToVideos = async (scope: 'selected' | 'filtered') => {
    if (!bulkMessage.trim()) return toast({ title: 'Escreva a mensagem', variant: 'destructive' });
    const source = scope === 'selected'
      ? videos.filter(v => vidSelected.has(v.id))
      : filteredVids;
    if (!source.length) return toast({ title: 'Nenhum vídeo alvo', variant: 'destructive' });
    if (!confirm(`Aplicar mensagem em ${source.length} vídeo(s) e ativar auto-reply?`)) return;

    setSaving(true);
    try {
      const rows: any[] = [];
      const seen = new Set<string>();
      for (const v of source) {
        const type = v.creator_id ? 'creator' : (v.model_id ? 'model' : null);
        const id = v.creator_id || v.model_id;
        if (!type || !id) continue;
        const key = `${type}:${id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ owner_id: id, owner_type: type, message: bulkMessage, is_active: true });
      }
      if (rows.length) {
        const C = 100;
        for (let i = 0; i < rows.length; i += C) {
          await supabase.from('comment_auto_reply_configs')
            .upsert(rows.slice(i, i + C), { onConflict: 'owner_id,owner_type' });
        }
      }
      const ids = source.map(v => v.id);
      const C = 50;
      for (let i = 0; i < ids.length; i += C) {
        await supabase.from('videos').update({ comment_auto_reply_enabled: true }).in('id', ids.slice(i, i + C));
      }
      toast({ title: `Mensagem aplicada em ${source.length} vídeo(s)`, description: `${rows.length} config(s) upsert.` });
      loadAll();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateOwnerMsgFromVideo = async (v: VideoRow, message: string) => {
    const type = v.creator_id ? 'creator' : (v.model_id ? 'model' : null);
    const id = v.creator_id || v.model_id;
    if (!type || !id) return;
    const { error } = await supabase.from('comment_auto_reply_configs')
      .upsert({ owner_id: id, owner_type: type, message, is_active: true }, { onConflict: 'owner_id,owner_type' });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    await supabase.from('videos').update({ comment_auto_reply_enabled: true }).eq('id', v.id);
    toast({ title: 'Mensagem salva para esta modelo/criador' });
    loadAll();
  };

  const toggleSet = (set: Set<string>, setter: any, id: string, checked: boolean) => {
    const next = new Set(set); checked ? next.add(id) : next.delete(id); setter(next);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Resposta Automática nos Comentários</h2>
        <p className="text-sm text-gray-400 mt-1">
          Controla a resposta que aparece no painel de comentários quando o usuário envia uma mensagem no vídeo.
          Novos vídeos entram <b>desativados</b> — você marca aqui um a um ou em massa.
        </p>
      </div>

      <Tabs defaultValue="cfg" className="w-full">
        <TabsList className="grid grid-cols-2 bg-gray-900 border border-gray-800">
          <TabsTrigger value="cfg" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">
            <MessageSquare className="w-4 h-4 mr-2" /> Modelos/Criadores ({configs.length})
          </TabsTrigger>
          <TabsTrigger value="vids" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">
            <VideoIcon className="w-4 h-4 mr-2" /> Vídeos ({videos.length})
          </TabsTrigger>
        </TabsList>

        {/* CFG */}
        <TabsContent value="cfg" className="space-y-4 mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white text-base">Ações em massa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setCfgActive(Array.from(cfgSelected), true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-bold">Ativar selecionados</Button>
                <Button onClick={() => setCfgActive(Array.from(cfgSelected), false)} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-bold">Desativar selecionados</Button>
                <Button onClick={() => setCfgSelected(new Set(filteredCfg.map(c => c.id)))} variant="outline" className="border-purple-500 text-purple-300">Selecionar filtrados</Button>
                <Button onClick={() => setCfgSelected(new Set())} variant="outline" className="border-gray-600 text-gray-300">Limpar</Button>
              </div>
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <label className="text-sm text-white font-semibold">Editar mensagem em massa</label>
                <Textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} className="bg-gray-800 border-gray-700 text-white min-h-[90px]" />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => applyMsg(Array.from(cfgSelected))} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">Aplicar em {cfgSelected.size} selecionados</Button>
                  <Button onClick={applyMsgAll} disabled={saving} className="bg-purple-900 hover:bg-purple-800 text-white font-bold">Aplicar em TODOS ({configs.length})</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={cfgSearch} onChange={e => setCfgSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9 bg-gray-900 border-gray-700 text-white" />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredCfg.map(c => (
              <div key={c.id} className="p-3 bg-gray-900 border border-gray-800 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox checked={cfgSelected.has(c.id)} onCheckedChange={ck => toggleSet(cfgSelected, setCfgSelected, c.id, !!ck)} />
                  <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover" onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.owner_type === 'creator' ? 'Criador' : 'Modelo'}</div>
                  </div>
                  <Badge className={c.is_active ? 'bg-green-600' : 'bg-gray-600'}>{c.is_active ? 'Ativo' : 'Off'}</Badge>
                  <Switch checked={c.is_active} onCheckedChange={v => setCfgActive([c.id], v)} />
                </div>
                <Textarea
                  defaultValue={c.message}
                  onBlur={e => e.target.value !== c.message && updateSingleMsg(c.id, e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white text-sm min-h-[60px]"
                />
              </div>
            ))}
            {!filteredCfg.length && <div className="text-center text-gray-400 py-8">Nenhuma configuração. Ative um vídeo na aba "Vídeos" que o dono ganha config automaticamente.</div>}
          </div>
        </TabsContent>

        {/* VIDEOS */}
        <TabsContent value="vids" className="space-y-4 mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-white text-base">Marcar vídeos que respondem automaticamente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-yellow-300 bg-yellow-950/30 border border-yellow-800 rounded p-3">
                Novos vídeos entram com resposta automática <b>DESATIVADA</b>. Ative aqui manualmente — um por um ou em massa.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setVidFlag(Array.from(vidSelected), true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-bold"><CheckCheck className="w-4 h-4 mr-1" />Ativar selecionados</Button>
                <Button onClick={() => setVidFlag(Array.from(vidSelected), false)} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-bold"><X className="w-4 h-4 mr-1" />Desativar selecionados</Button>
                <Button onClick={() => bulkVidsAll(true)} disabled={saving} className="bg-purple-700 hover:bg-purple-800 text-white font-bold">Ativar TODOS (filtro)</Button>
                <Button onClick={() => bulkVidsAll(false)} disabled={saving} className="bg-gray-700 hover:bg-gray-800 text-white font-bold">Desativar TODOS (filtro)</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setVidSelected(new Set(filteredVids.map(v => v.id)))} variant="outline" className="border-purple-500 text-purple-300">Selecionar filtrados</Button>
                <Button onClick={() => setVidSelected(new Set())} variant="outline" className="border-gray-600 text-gray-300">Limpar</Button>
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-800">
                <label className="text-sm text-white font-semibold">Mensagem de resposta rápida (aplica nos donos dos vídeos)</label>
                <Textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} className="bg-gray-800 border-gray-700 text-white min-h-[90px]" placeholder="Ex.: 🥰 oi meu amor, obrigado pelo comentário..." />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => applyMsgToVideos('selected')} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">Aplicar em {vidSelected.size} selecionados</Button>
                  <Button onClick={() => applyMsgToVideos('filtered')} disabled={saving} className="bg-purple-900 hover:bg-purple-800 text-white font-bold">Aplicar em TODOS filtrados ({filteredVids.length})</Button>
                </div>
              </div>
            </CardContent>
          </Card>


          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={vidSearch} onChange={e => setVidSearch(e.target.value)} placeholder="Buscar por modelo ou título..." className="pl-9 bg-gray-900 border-gray-700 text-white" />
            </div>
            {(['all', 'on', 'off', 'hasCfg'] as const).map(f => (
              <Button key={f} onClick={() => setVidFilter(f)} className={vidFilter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}>
                {f === 'all' ? 'Todos' : f === 'on' ? 'Ativos' : f === 'off' ? 'Inativos' : 'Com config'}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[700px] overflow-y-auto">
            {filteredVids.map(v => {
              const ownerType = v.creator_id ? 'creator' : (v.model_id ? 'model' : null);
              const ownerId = v.creator_id || v.model_id;
              const ownerCfg = ownerType && ownerId ? configs.find(c => c.owner_type === ownerType && c.owner_id === ownerId) : null;
              const currentMsg = ownerCfg?.message || '';
              return (
              <div key={v.id} className="flex flex-col gap-2 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="flex gap-3">
                  <Checkbox checked={vidSelected.has(v.id)} onCheckedChange={ck => toggleSet(vidSelected, setVidSelected, v.id, !!ck)} className="mt-1" />
                  <div className="w-16 h-20 bg-black rounded overflow-hidden flex-shrink-0">
                    {v.video_url ? (
                      <video src={v.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <img src={v.thumbnail_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1">
                      <img src={v.avatar} alt="" className="w-5 h-5 rounded-full" onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                      <span className="text-white text-xs font-semibold truncate">{v.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 line-clamp-2">{v.title || 'Sem título'}</div>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch checked={v.comment_auto_reply_enabled} onCheckedChange={val => toggleSingleVid(v.id, val)} />
                      <span className={`text-xs font-bold ${v.comment_auto_reply_enabled ? 'text-green-400' : 'text-gray-500'}`}>
                        {v.comment_auto_reply_enabled ? 'Auto-reply ON' : 'OFF'}
                      </span>
                      {v.has_config && <Badge className="bg-purple-700 text-xs">tem config</Badge>}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Mensagem de resposta rápida (deste dono)</label>
                  <Textarea
                    key={`${v.id}-${currentMsg}`}
                    defaultValue={currentMsg}
                    placeholder="Escreva a mensagem que aparecerá quando alguém comentar..."
                    onBlur={e => { const val = e.target.value; if (val && val !== currentMsg) updateOwnerMsgFromVideo(v, val); }}
                    className="bg-gray-800 border-gray-700 text-white text-xs min-h-[60px]"
                  />
                </div>
              </div>
              );
            })}
            {!filteredVids.length && <div className="col-span-full text-center text-gray-400 py-8">Nenhum vídeo encontrado.</div>}

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
