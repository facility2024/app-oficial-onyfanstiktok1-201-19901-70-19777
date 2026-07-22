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

interface PanelRow {
  id: string;
  model_id: string | null;
  creator_id: string | null;
  is_active: boolean;
  greeting_message: string | null;
  entity_name: string;
  entity_avatar: string;
}

interface VideoRow {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  is_active: boolean;
  chat_auto_response_enabled: boolean;
  model_id: string | null;
  creator_id: string | null;
  entity_name: string;
  entity_avatar: string;
  has_panel: boolean;
}

export default function AdminChatBulkManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [panels, setPanels] = useState<PanelRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);

  const [panelSelected, setPanelSelected] = useState<Set<string>>(new Set());
  const [videoSelected, setVideoSelected] = useState<Set<string>>(new Set());

  const [panelSearch, setPanelSearch] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [videoFilter, setVideoFilter] = useState<'all' | 'on' | 'off' | 'panel'>('all');

  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkVideoMessage, setBulkVideoMessage] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: panelData }, { data: modelData }, { data: profileData }, { data: videoData }] = await Promise.all([
        supabase.from('model_chat_panels').select('id, model_id, creator_id, is_active, greeting_message'),
        supabase.from('models').select('id, name, avatar_url'),
        supabase.from('profiles').select('id, name, email, avatar_url'),
        supabase.from('videos').select('id, title, thumbnail_url, video_url, is_active, chat_auto_response_enabled, model_id, creator_id').eq('is_active', true).order('created_at', { ascending: false }).limit(2000),
      ]);

      const modelMap = new Map((modelData || []).map((m: any) => [m.id, m]));
      const profileMap = new Map((profileData || []).map((p: any) => [p.id, p]));

      const enrichedPanels: PanelRow[] = (panelData || []).map((p: any) => {
        const model = p.model_id ? modelMap.get(p.model_id) : null;
        const profile = p.creator_id ? profileMap.get(p.creator_id) : null;
        return {
          id: p.id,
          model_id: p.model_id,
          creator_id: p.creator_id,
          is_active: p.is_active,
          greeting_message: p.greeting_message,
          entity_name: (model as any)?.name || (profile as any)?.name || (profile as any)?.email?.split('@')[0] || 'Sem nome',
          entity_avatar: (model as any)?.avatar_url || (profile as any)?.avatar_url || DEFAULT_AVATAR,
        };
      });

      const panelKeys = new Set(enrichedPanels.filter(p => p.is_active).flatMap(p => [p.model_id, p.creator_id].filter(Boolean) as string[]));

      const enrichedVideos: VideoRow[] = (videoData || []).map((v: any) => {
        const model = v.model_id ? modelMap.get(v.model_id) : null;
        const profile = v.creator_id ? profileMap.get(v.creator_id) : null;
        return {
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          is_active: v.is_active,
          chat_auto_response_enabled: v.chat_auto_response_enabled,
          model_id: v.model_id,
          creator_id: v.creator_id,
          entity_name: (model as any)?.name || (profile as any)?.name || (profile as any)?.email?.split('@')[0] || 'Sem nome',
          entity_avatar: (model as any)?.avatar_url || (profile as any)?.avatar_url || DEFAULT_AVATAR,
          has_panel: panelKeys.has(v.model_id) || panelKeys.has(v.creator_id),
        };
      });

      setPanels(enrichedPanels);
      setVideos(enrichedVideos);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPanels = useMemo(() => {
    const q = panelSearch.trim().toLowerCase();
    return panels.filter(p => !q || p.entity_name.toLowerCase().includes(q));
  }, [panels, panelSearch]);

  const filteredVideos = useMemo(() => {
    const q = videoSearch.trim().toLowerCase();
    return videos.filter(v => {
      if (q && !(v.entity_name.toLowerCase().includes(q) || (v.title || '').toLowerCase().includes(q))) return false;
      if (videoFilter === 'on') return v.chat_auto_response_enabled;
      if (videoFilter === 'off') return !v.chat_auto_response_enabled;
      if (videoFilter === 'panel') return v.has_panel;
      return true;
    });
  }, [videos, videoSearch, videoFilter]);

  const togglePanelSet = (id: string, checked: boolean) => {
    setPanelSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };
  const toggleVideoSet = (id: string, checked: boolean) => {
    setVideoSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const selectAllPanels = (checked: boolean) => {
    setPanelSelected(checked ? new Set(filteredPanels.map(p => p.id)) : new Set());
  };
  const selectAllVideos = (checked: boolean) => {
    setVideoSelected(checked ? new Set(filteredVideos.map(v => v.id)) : new Set());
  };

  const chunkedUpdate = async (
    table: 'videos' | 'model_chat_panels',
    ids: string[],
    payload: Record<string, any>
  ) => {
    const CHUNK = 100;
    let done = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from(table).update(payload).in('id', slice);
      if (error) { failed += slice.length; console.error('chunk err', error); }
      else { done += slice.length; }
    }
    return { done, failed };
  };

  // ============ BULK ACTIONS: PANELS ============
  const bulkSetPanelActive = async (active: boolean) => {
    const ids = Array.from(panelSelected);
    if (!ids.length) return toast({ title: 'Selecione ao menos um painel', variant: 'destructive' });
    setSaving(true);
    const { done, failed } = await chunkedUpdate('model_chat_panels', ids, { is_active: active });
    setSaving(false);
    if (failed) toast({ title: 'Concluído com falhas', description: `${done} ok, ${failed} falharam`, variant: 'destructive' });
    else toast({ title: active ? `${done} painéis ativados` : `${done} painéis desativados` });
    setPanels(prev => prev.map(p => (ids.includes(p.id) ? { ...p, is_active: active } : p)));
  };

  const bulkApplyMessage = async () => {
    const ids = Array.from(panelSelected);
    if (!ids.length) return toast({ title: 'Selecione ao menos um painel', variant: 'destructive' });
    if (!bulkMessage.trim()) return toast({ title: 'Escreva a mensagem', variant: 'destructive' });
    setSaving(true);
    const { done, failed } = await chunkedUpdate('model_chat_panels', ids, { greeting_message: bulkMessage });
    setSaving(false);
    if (failed) toast({ title: 'Concluído com falhas', description: `${done} ok, ${failed} falharam`, variant: 'destructive' });
    else toast({ title: `Mensagem aplicada em ${done} painéis` });
    setPanels(prev => prev.map(p => (ids.includes(p.id) ? { ...p, greeting_message: bulkMessage } : p)));
  };

  const bulkApplyMessageAll = async () => {
    if (!bulkMessage.trim()) return toast({ title: 'Escreva a mensagem', variant: 'destructive' });
    if (!confirm(`Aplicar essa mensagem em TODOS os ${panels.length} painéis?`)) return;
    setSaving(true);
    const { error } = await supabase.from('model_chat_panels').update({ greeting_message: bulkMessage }).not('id', 'is', null);
    setSaving(false);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: `Mensagem aplicada em ${panels.length} painéis` });
    loadAll();
  };

  // ============ BULK ACTIONS: VIDEOS ============
  const bulkSetVideoChat = async (enabled: boolean) => {
    const ids = Array.from(videoSelected);
    if (!ids.length) return toast({ title: 'Selecione ao menos um vídeo', variant: 'destructive' });
    setSaving(true);
    const { done, failed } = await chunkedUpdate('videos', ids, { chat_auto_response_enabled: enabled });
    setSaving(false);
    if (failed) toast({ title: 'Concluído com falhas', description: `${done} ok, ${failed} falharam`, variant: 'destructive' });
    else toast({ title: enabled ? `Chat ativado em ${done} vídeos` : `Chat desativado em ${done} vídeos` });
    setVideos(prev => prev.map(v => (ids.includes(v.id) ? { ...v, chat_auto_response_enabled: enabled } : v)));
  };

  const bulkMarkAllVideos = async (enabled: boolean) => {
    const target = filteredVideos.filter(v => v.chat_auto_response_enabled !== enabled);
    if (!target.length) return toast({ title: 'Nada a alterar' });
    if (!confirm(`${enabled ? 'Ativar' : 'Desativar'} chat em ${target.length} vídeos filtrados?`)) return;
    setSaving(true);
    const ids = target.map(v => v.id);
    const CHUNK = 100;
    let done = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('videos').update({ chat_auto_response_enabled: enabled }).in('id', slice);
      if (error) { failed += slice.length; console.error('chunk err', error); }
      else { done += slice.length; }
    }
    setSaving(false);
    if (failed) toast({ title: `Concluído com falhas`, description: `${done} ok, ${failed} falharam`, variant: 'destructive' });
    else toast({ title: `${done} vídeos atualizados` });
    const okSet = new Set(ids);
    setVideos(prev => prev.map(v => (okSet.has(v.id) ? { ...v, chat_auto_response_enabled: enabled } : v)));
  };

  const toggleSingleVideo = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from('videos').update({ chat_auto_response_enabled: enabled }).eq('id', id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    setVideos(prev => prev.map(v => (v.id === id ? { ...v, chat_auto_response_enabled: enabled } : v)));
  };

  // Aplica mensagem apenas em vídeos de MODELOS COMUNS (model_id, sem creator_id)
  // Cria/atualiza o painel do model_id e ativa o chat nos vídeos selecionados.
  const bulkApplyVideoMessage = async (scope: 'selected' | 'filtered') => {
    if (!bulkVideoMessage.trim()) return toast({ title: 'Escreva a mensagem', variant: 'destructive' });
    const source = scope === 'selected'
      ? videos.filter(v => videoSelected.has(v.id))
      : filteredVideos;
    const commonOnly = source.filter(v => v.model_id && !v.creator_id);
    const skipped = source.length - commonOnly.length;
    if (!commonOnly.length) return toast({ title: 'Nenhum vídeo de modelo comum na seleção', description: 'Vídeos de criadoras são ignorados (elas têm painel próprio).', variant: 'destructive' });
    if (!confirm(`Aplicar mensagem em ${commonOnly.length} vídeo(s) de modelos comuns?${skipped ? ` (${skipped} vídeos de criadoras serão ignorados)` : ''}`)) return;

    setSaving(true);
    try {
      const modelIds = Array.from(new Set(commonOnly.map(v => v.model_id!)));
      // Buscar painéis existentes
      const { data: existing } = await supabase
        .from('model_chat_panels')
        .select('id, model_id')
        .in('model_id', modelIds);
      const existingMap = new Map((existing || []).map((p: any) => [p.model_id, p.id]));

      const toUpdate = modelIds.filter(id => existingMap.has(id));
      const toInsert = modelIds.filter(id => !existingMap.has(id));

      // Update em lote
      if (toUpdate.length) {
        const CHUNK = 100;
        for (let i = 0; i < toUpdate.length; i += CHUNK) {
          const slice = toUpdate.slice(i, i + CHUNK);
          await supabase.from('model_chat_panels')
            .update({ greeting_message: bulkVideoMessage, is_active: true })
            .in('model_id', slice);
        }
      }
      // Insert novos
      if (toInsert.length) {
        const rows = toInsert.map(mid => ({ model_id: mid, greeting_message: bulkVideoMessage, is_active: true }));
        const CHUNK = 100;
        for (let i = 0; i < rows.length; i += CHUNK) {
          await supabase.from('model_chat_panels').insert(rows.slice(i, i + CHUNK));
        }
      }

      // Ativa chat_auto_response_enabled nos vídeos alvo
      const videoIds = commonOnly.map(v => v.id);
      await chunkedUpdate('videos', videoIds, { chat_auto_response_enabled: true });

      toast({ title: `Mensagem aplicada em ${commonOnly.length} vídeo(s)`, description: `${toUpdate.length} painéis atualizados, ${toInsert.length} criados.` });
      loadAll();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Chat do Feed — Controle em Massa</h2>
        <p className="text-sm text-gray-400 mt-1">Ative/desative painéis de chat, edite ofertas e escolha exatamente em quais vídeos o chat automático aparece.</p>
      </div>

      <Tabs defaultValue="panels" className="w-full">
        <TabsList className="grid grid-cols-2 bg-gray-900 border border-gray-800">
          <TabsTrigger value="panels" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">
            <MessageSquare className="w-4 h-4 mr-2" /> Painéis ({panels.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-purple-700 data-[state=active]:text-white">
            <VideoIcon className="w-4 h-4 mr-2" /> Vídeos ({videos.length})
          </TabsTrigger>
        </TabsList>

        {/* =============== PANELS TAB =============== */}
        <TabsContent value="panels" className="space-y-4 mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Ações em massa nos painéis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => bulkSetPanelActive(true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-bold">Ativar selecionados</Button>
                <Button onClick={() => bulkSetPanelActive(false)} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-bold">Desativar selecionados</Button>
                <Button onClick={() => selectAllPanels(true)} variant="outline" className="border-purple-500 text-purple-300">Selecionar todos filtrados</Button>
                <Button onClick={() => selectAllPanels(false)} variant="outline" className="border-gray-600 text-gray-300">Limpar seleção</Button>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-800">
                <label className="text-sm text-white font-semibold">Editar mensagem de boas-vindas / oferta em massa</label>
                <Textarea value={bulkMessage} onChange={e => setBulkMessage(e.target.value)} placeholder="Ex.: 🔥 Oferta relâmpago! Acesso completo por R$4,50 no PIX..." className="bg-gray-800 border-gray-700 text-white min-h-[90px]" />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={bulkApplyMessage} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">Aplicar em {panelSelected.size} selecionados</Button>
                  <Button onClick={bulkApplyMessageAll} disabled={saving} className="bg-purple-900 hover:bg-purple-800 text-white font-bold">Aplicar em TODOS ({panels.length})</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={panelSearch} onChange={e => setPanelSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9 bg-gray-900 border-gray-700 text-white" />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredPanels.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <Checkbox checked={panelSelected.has(p.id)} onCheckedChange={c => togglePanelSet(p.id, !!c)} />
                <img src={p.entity_avatar} alt="" className="w-10 h-10 rounded-full object-cover" onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{p.entity_name}</div>
                  <div className="text-xs text-gray-400 truncate">{p.greeting_message || <span className="italic">sem mensagem</span>}</div>
                </div>
                <Badge className={p.is_active ? 'bg-green-600' : 'bg-gray-600'}>{p.is_active ? 'Ativo' : 'Off'}</Badge>
                <Switch checked={p.is_active} onCheckedChange={async v => {
                  const { error } = await supabase.from('model_chat_panels').update({ is_active: v }).eq('id', p.id);
                  if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                  setPanels(prev => prev.map(x => x.id === p.id ? { ...x, is_active: v } : x));
                }} />
              </div>
            ))}
            {!filteredPanels.length && <div className="text-center text-gray-400 py-8">Nenhum painel encontrado.</div>}
          </div>
        </TabsContent>

        {/* =============== VIDEOS TAB =============== */}
        <TabsContent value="videos" className="space-y-4 mt-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Marcar vídeos que respondem com chat automático</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-yellow-300 bg-yellow-950/30 border border-yellow-800 rounded p-3">
                A partir de agora, <b>vídeos novos entram com chat desativado</b>. Ative manualmente aqui — um por um ou em massa.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => bulkSetVideoChat(true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-bold"><CheckCheck className="w-4 h-4 mr-1" />Ativar chat em selecionados</Button>
                <Button onClick={() => bulkSetVideoChat(false)} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-bold"><X className="w-4 h-4 mr-1" />Desativar chat em selecionados</Button>
                <Button onClick={() => bulkMarkAllVideos(true)} disabled={saving} className="bg-purple-700 hover:bg-purple-800 text-white font-bold">Ativar em TODOS (filtro atual)</Button>
                <Button onClick={() => bulkMarkAllVideos(false)} disabled={saving} className="bg-gray-700 hover:bg-gray-800 text-white font-bold">Desativar em TODOS (filtro atual)</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => selectAllVideos(true)} variant="outline" className="border-purple-500 text-purple-300">Selecionar filtrados</Button>
                <Button onClick={() => selectAllVideos(false)} variant="outline" className="border-gray-600 text-gray-300">Limpar seleção</Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={videoSearch} onChange={e => setVideoSearch(e.target.value)} placeholder="Buscar por modelo ou título..." className="pl-9 bg-gray-900 border-gray-700 text-white" />
            </div>
            {(['all', 'on', 'off', 'panel'] as const).map(f => (
              <Button key={f} onClick={() => setVideoFilter(f)} className={videoFilter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}>
                {f === 'all' ? 'Todos' : f === 'on' ? 'Com chat' : f === 'off' ? 'Sem chat' : 'Com painel'}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[700px] overflow-y-auto">
            {filteredVideos.map(v => (
              <div key={v.id} className="flex gap-3 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <Checkbox checked={videoSelected.has(v.id)} onCheckedChange={c => toggleVideoSet(v.id, !!c)} className="mt-1" />
                <div className="w-16 h-20 bg-black rounded overflow-hidden flex-shrink-0">
                  {v.video_url ? (
                    <video src={v.video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={v.thumbnail_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1">
                    <img src={v.entity_avatar} alt="" className="w-5 h-5 rounded-full" onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                    <span className="text-white text-xs font-semibold truncate">{v.entity_name}</span>
                  </div>
                  <div className="text-xs text-gray-400 line-clamp-2">{v.title || 'Sem título'}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch checked={v.chat_auto_response_enabled} onCheckedChange={val => toggleSingleVideo(v.id, val)} />
                    <span className={`text-xs font-bold ${v.chat_auto_response_enabled ? 'text-green-400' : 'text-gray-500'}`}>
                      {v.chat_auto_response_enabled ? 'Chat ON' : 'Chat OFF'}
                    </span>
                    {v.has_panel && <Badge className="bg-purple-700 text-xs">tem painel</Badge>}
                  </div>
                </div>
              </div>
            ))}
            {!filteredVideos.length && <div className="col-span-full text-center text-gray-400 py-8">Nenhum vídeo encontrado.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
