import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { toast } from 'sonner';
import { X, Music, Send, Trash2, Images, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ModelOption { id: string; username: string; name: string; }

export const CarouselScheduler = ({ mode = 'admin' }: { mode?: 'admin' | 'creator' } = {}) => {
  const isCreator = mode === 'creator';
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [results, setResults] = useState<ModelOption[]>([]);
  const [model, setModel] = useState<ModelOption | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagensTexto, setImagensTexto] = useState('');
  const imagens = imagensTexto.split('\n').map(s => s.trim()).filter(Boolean);
  const [audioUrl, setAudioUrl] = useState('');
  const [botoes, setBotoes] = useState<{ label: string; url: string; tipo: 'externo' | 'interno'; cor: string }[]>([]);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [enviarFeed, setEnviarFeed] = useState(true);
  const [enviarPerfil, setEnviarPerfil] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scheduledCarousels, setScheduledCarousels] = useState<any[]>([]);

  useEffect(() => {
    if (isCreator) {
      supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    }
    loadScheduledCarousels();
  }, [isCreator]);

  const loadScheduledCarousels = async () => {
    let query = supabase
      .from('posts_agendados')
      .select('id, titulo, modelo_username, modelo_id, imagens, audio_url, data_agendamento, status, created_at')
      .in('tipo_conteudo', ['carrossel', 'image'])
      .order('data_agendamento', { ascending: false })
      .limit(30);

    if (isCreator) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setScheduledCarousels([]); return; }
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle();
      const baseName = profile?.username || profile?.display_name || user.email?.split('@')[0] || '';
      const username = baseName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (username) {
        query = query.ilike('modelo_username', username);
      } else {
        setScheduledCarousels([]); return;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CarouselScheduler] erro ao carregar carrosséis:', error);
      return;
    }

    setScheduledCarousels(data || []);
  };

  const deleteCarousel = async (postId: string) => {
    if (!confirm('Deseja remover este carrossel agendado/publicado?')) return;

    await supabase.from('posts_principais').delete().eq('post_agendado_id', postId);

    const { error } = await supabase
      .from('posts_agendados')
      .delete()
      .eq('id', postId);

    if (error) {
      toast.error('Erro ao remover carrossel');
      return;
    }

    toast.success('Carrossel removido');
    loadScheduledCarousels();
  };

  const getStatusIcon = (status: string) => {
    if (status === 'publicado') return <CheckCircle className="w-3 h-3 text-green-400" />;
    if (status === 'erro') return <AlertCircle className="w-3 h-3 text-red-400" />;
    return <Clock className="w-3 h-3 text-yellow-400" />;
  };

  const searchModels = async (term: string) => {
    setModelSearch(term);
    if (term.length < 2) { setResults([]); return; }
    const { data } = await supabase.from('models')
      .select('id, username, name')
      .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
      .limit(10);
    setResults(data || []);
  };

  const removeImage = (i: number) => {
    setImagensTexto(imagens.filter((_, idx) => idx !== i).join('\n'));
  };

  const agendar = async () => {
    if (!isCreator && !model && !modelSearch.trim()) return toast.error('Informe a modelo');
    if (imagens.length === 0) return toast.error('Adicione pelo menos uma imagem');
    if (!data || !hora) return toast.error('Defina data e hora');

    setLoading(true);
    try {
      const scheduleIso = new Date(`${data}T${hora}:00`).toISOString();
      const invokeSchedule = supabase.functions.invoke('schedule-carousel', {
        body: {
          model_search: modelSearch,
          selected_model_id: model?.id || null,
          avatar_url: avatarUrl.trim() || null,
          titulo: titulo || 'Galeria',
          descricao,
          imagens,
          audio_url: audioUrl.trim() || null,
          botoes: botoes.filter(b => b.label.trim() && b.url.trim()),
          data_agendamento: scheduleIso,
          enviar_tela_principal: enviarFeed,
          enviar_perfil_modelo: enviarPerfil,
        },
      });

      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('A conexão demorou demais. Tente novamente.')), 25000);
      });

      const { data: response, error } = await Promise.race([invokeSchedule, timeout]);
      if (error) throw new Error(error.message || 'Erro ao agendar');
      if (!response?.success) throw new Error(response?.error || 'Erro ao agendar');

      setModel(response.model as ModelOption);

      if (new Date(scheduleIso).getTime() <= Date.now()) {
        const { error: publishError } = await supabase.functions.invoke('process-scheduled-posts', {
          body: { post_id: response.post.id },
        });

        if (publishError) {
          toast.warning('Agendado, mas a publicação imediata falhou. A fila automática tentará novamente.');
        } else {
          toast.success('Carrossel agendado e publicado com sucesso!');
        }
      } else {
        toast.success('Carrossel agendado com sucesso!');
      }

      setImagensTexto(''); setAudioUrl(''); setTitulo(''); setDescricao(''); setAvatarUrl('');
      loadScheduledCarousels();
    } catch (e: any) {
      console.error('[CarouselScheduler] erro ao agendar carrossel:', e);
      toast.error(e.message || 'Erro ao agendar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800 text-white">
        <CardHeader>
          <CardTitle>Agendar Carrossel de Imagens + Áudio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        {!isCreator && (
          <div className="relative">
            <Label>Modelo</Label>
            <Input
              value={model ? `@${model.username}` : modelSearch}
              onChange={(e) => { setModel(null); searchModels(e.target.value); }}
              placeholder="Buscar modelo..."
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            />
            {results.length > 0 && !model && (
              <div className="absolute z-10 bg-gray-800 border border-gray-700 w-full mt-1 rounded max-h-48 overflow-auto">
                {results.map(r => (
                  <button key={r.id} onClick={() => { setModel(r); setResults([]); }}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-700">
                    @{r.username} — {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!isCreator && (
          <div>
            <Label>Avatar da modelo (URL — opcional, atualiza o perfil)</Label>
            <div className="flex gap-2 items-center">
              {avatarUrl && <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-gray-700" />}
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://.../avatar.jpg" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" />
            </div>
          </div>
        )}


        <div>
          <Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" />
        </div>

        <div>
          <Label>Imagens (uma URL por linha)</Label>
          <Textarea
            value={imagensTexto}
            onChange={(e) => setImagensTexto(e.target.value)}
            placeholder={"https://exemplo.com/img1.jpg\nhttps://exemplo.com/img2.jpg\nhttps://exemplo.com/img3.jpg"}
            rows={6}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 font-mono text-sm"
          />
          {imagens.length > 0 && (
            <>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {imagens.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} className="w-full h-20 object-cover rounded" />
                    <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-600 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4"><ImageCarousel images={imagens} /></div>
            </>
          )}
        </div>

        <div>
          <Label className="flex items-center gap-2"><Music className="w-4 h-4" /> Áudio MP3 (URL — opcional)</Label>
          <Input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://.../audio.mp3" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" />
          {audioUrl && <audio src={audioUrl} controls className="mt-2 w-full" />}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" /></div>
          <div><Label>Hora</Label><Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" /></div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <Checkbox checked={enviarFeed} onCheckedChange={(v) => setEnviarFeed(!!v)} />
            Enviar para o feed principal
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={enviarPerfil} onCheckedChange={(v) => setEnviarPerfil(!!v)} />
            Enviar para o perfil da modelo
          </label>
        </div>

        <Button onClick={agendar} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
          <Send className="w-4 h-4 mr-2" /> {loading ? 'Agendando...' : 'Agendar'}
        </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="w-5 h-5" /> Carrosséis agendados ({scheduledCarousels.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledCarousels.length === 0 ? (
            <div className="text-center text-gray-400 py-6">Nenhum carrossel agendado</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {scheduledCarousels.map((post) => {
                const firstImage = Array.isArray(post.imagens) ? post.imagens[0] : '';
                return (
                  <div key={post.id} className="relative rounded-lg overflow-hidden bg-black border border-gray-800 aspect-[9/16]">
                    <img
                      src={firstImage || '/placeholder.svg'}
                      alt={post.titulo || 'Carrossel'}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold">
                      {getStatusIcon(post.status)} {post.status}
                    </div>
                    <div className="absolute top-2 right-2 rounded-full bg-purple-600/90 px-2 py-1 text-[10px] font-bold">
                      {Array.isArray(post.imagens) ? post.imagens.length : 0} fotos
                    </div>
                    <div className="absolute bottom-10 left-2 right-2">
                      <p className="text-xs font-bold truncate">{post.titulo || 'Carrossel'}</p>
                      <p className="text-[10px] text-gray-300 truncate">@{post.modelo_username}</p>
                      <p className="text-[9px] text-yellow-300">
                        {new Date(post.data_agendamento).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute bottom-2 right-2 h-7 px-2"
                      onClick={() => deleteCarousel(post.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
