import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { toast } from 'sonner';
import { Plus, X, Music, Send } from 'lucide-react';

interface ModelOption { id: string; username: string; name: string; }

export const CarouselScheduler = () => {
  const [modelSearch, setModelSearch] = useState('');
  const [results, setResults] = useState<ModelOption[]>([]);
  const [model, setModel] = useState<ModelOption | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagensTexto, setImagensTexto] = useState('');
  const imagens = imagensTexto.split('\n').map(s => s.trim()).filter(Boolean);
  const [audioUrl, setAudioUrl] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [enviarFeed, setEnviarFeed] = useState(true);
  const [enviarPerfil, setEnviarPerfil] = useState(true);
  const [loading, setLoading] = useState(false);

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
    if (!model && !modelSearch.trim()) return toast.error('Informe a modelo');
    if (imagens.length === 0) return toast.error('Adicione pelo menos uma imagem');
    if (!data || !hora) return toast.error('Defina data e hora');

    setLoading(true);
    try {
      let currentModel = model;

      // Cria modelo nova se não houver seleção
      if (!currentModel) {
        const raw = modelSearch.trim().replace(/^@/, '');
        const username = raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `modelo_${Date.now()}`;

        // Se já existir uma modelo com esse username, reaproveita
        const { data: existing } = await supabase
          .from('models')
          .select('id, username, name')
          .eq('username', username)
          .maybeSingle();

        if (existing) {
          currentModel = existing as ModelOption;
          if (avatarUrl.trim()) {
            await supabase.from('models').update({ avatar_url: avatarUrl.trim() }).eq('id', currentModel.id);
          }
        } else {
          const { data: created, error: createErr } = await supabase
            .from('models')
            .insert({ username, name: raw || username, avatar_url: avatarUrl.trim() || null, is_active: true } as any)
            .select('id, username, name')
            .single();
          if (createErr) {
            console.error('[CarouselScheduler] erro ao criar modelo:', createErr);
            throw new Error(`Falha ao criar modelo: ${createErr.message}`);
          }
          currentModel = created as ModelOption;
        }
        setModel(currentModel);
      } else if (avatarUrl.trim()) {
        await supabase.from('models').update({ avatar_url: avatarUrl.trim() }).eq('id', currentModel.id);
      }

      const { error } = await supabase.from('posts_agendados').insert({
        modelo_id: currentModel.id,
        modelo_username: currentModel.username,
        titulo: titulo || 'Galeria',
        descricao,
        conteudo_url: imagens[0],
        imagens,
        audio_url: audioUrl || null,
        tipo_conteudo: 'carrossel',
        data_agendamento: new Date(`${data}T${hora}`).toISOString(),
        status: 'agendado',
        enviar_tela_principal: enviarFeed,
        enviar_perfil_modelo: enviarPerfil,
      } as any);
      if (error) throw error;
      toast.success('Carrossel agendado com sucesso!');
      setImagensTexto(''); setAudioUrl(''); setTitulo(''); setDescricao(''); setAvatarUrl('');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao agendar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 text-white">
      <CardHeader>
        <CardTitle>Agendar Carrossel de Imagens + Áudio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div>
          <Label>Avatar da modelo (URL — opcional, atualiza o perfil)</Label>
          <div className="flex gap-2 items-center">
            {avatarUrl && <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-gray-700" />}
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://.../avatar.jpg" className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" />
          </div>
        </div>


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
  );
};
