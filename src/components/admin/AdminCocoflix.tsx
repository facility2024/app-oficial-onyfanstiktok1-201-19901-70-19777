import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Film, Eye, EyeOff, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CATEGORIES = ['Fitness', 'Dança', 'Moda', 'Beleza', 'Lifestyle', 'Humor', 'Drama', 'Geral'];

interface CocoflixContent {
  id: string;
  title: string;
  description: string | null;
  preview_video_url: string | null;
  thumbnail_url: string | null;
  price: number;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface CocoflixVideo {
  id: string;
  content_id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: string | null;
  display_order: number;
}

export const AdminCocoflix = () => {
  const [contents, setContents] = useState<CocoflixContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState<string | null>(null);
  const [contentVideos, setContentVideos] = useState<Record<string, CocoflixVideo[]>>({});

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Geral');

  // Video form
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('');

  useEffect(() => { fetchContents(); }, []);

  const fetchContents = async () => {
    const { data } = await (supabase as any)
      .from('cocoflix_content')
      .select('*')
      .order('created_at', { ascending: false });
    setContents(data || []);
    setLoading(false);
  };

  const fetchVideos = async (contentId: string) => {
    const { data } = await (supabase as any)
      .from('cocoflix_videos')
      .select('*')
      .eq('content_id', contentId)
      .order('display_order');
    setContentVideos(prev => ({ ...prev, [contentId]: data || [] }));
  };

  const handleCreate = async () => {
    if (!title || !price) { toast.error('Preencha título e preço'); return; }
    const { error } = await (supabase as any).from('cocoflix_content').insert({
      title, description: description || null,
      preview_video_url: previewUrl || null,
      thumbnail_url: thumbnailUrl || null,
      price: parseFloat(price), category,
    });
    if (error) { toast.error('Erro ao criar'); return; }
    toast.success('Conteúdo criado!');
    setShowForm(false);
    resetForm();
    fetchContents();
  };

  const handleAddVideo = async () => {
    if (!videoTitle || !videoUrl || !showVideoForm) return;
    const existingVideos = contentVideos[showVideoForm] || [];
    const { error } = await (supabase as any).from('cocoflix_videos').insert({
      content_id: showVideoForm,
      title: videoTitle, video_url: videoUrl,
      duration: videoDuration || null,
      display_order: existingVideos.length,
    });
    if (error) { toast.error('Erro ao adicionar vídeo'); return; }
    toast.success('Vídeo adicionado!');
    setVideoTitle(''); setVideoUrl(''); setVideoDuration('');
    fetchVideos(showVideoForm);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from('cocoflix_content').update({ is_active: !current }).eq('id', id);
    fetchContents();
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Deletar este conteúdo e todos os vídeos?')) return;
    await (supabase as any).from('cocoflix_content').delete().eq('id', id);
    toast.success('Conteúdo deletado');
    fetchContents();
  };

  const deleteVideo = async (videoId: string, contentId: string) => {
    await (supabase as any).from('cocoflix_videos').delete().eq('id', videoId);
    toast.success('Vídeo removido');
    fetchVideos(contentId);
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setPreviewUrl('');
    setThumbnailUrl(''); setPrice(''); setCategory('Geral');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold text-white">Cocoflix</h2>
          <Badge variant="secondary">{contents.length} conteúdos</Badge>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-1" /> Novo Conteúdo
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white">Novo Conteúdo Cocoflix</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
            <Textarea placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
            <Input placeholder="URL do vídeo preview" value={previewUrl} onChange={e => setPreviewUrl(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
            <Input placeholder="URL da thumbnail" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
            <div className="flex gap-3">
              <Input type="number" placeholder="Preço (R$)" value={price} onChange={e => setPrice(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="bg-red-600 hover:bg-red-700">Criar</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }} className="text-white">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content list */}
      {loading ? (
        <p className="text-white/50">Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {contents.map(c => (
            <Card key={c.id} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {c.thumbnail_url && (
                      <img src={c.thumbnail_url} className="w-20 h-28 object-cover rounded-lg" alt="" />
                    )}
                    <div>
                      <h3 className="text-white font-bold">{c.title}</h3>
                      <p className="text-white/50 text-sm">{c.description?.slice(0, 80)}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className="bg-red-600/20 text-red-400">{c.category}</Badge>
                        <Badge className="bg-green-600/20 text-green-400">R$ {c.price.toFixed(2)}</Badge>
                        <Badge className={c.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}>
                          {c.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(c.id, c.is_active)} className="text-white/50">
                      {c.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-blue-400" onClick={() => { setShowVideoForm(c.id); fetchVideos(c.id); }}>
                          <Video className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Vídeos de "{c.title}"</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          {/* Existing videos */}
                          {(contentVideos[c.id] || []).map(v => (
                            <div key={v.id} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                              <div>
                                <p className="text-sm font-medium">{v.title}</p>
                                <p className="text-xs text-white/50">{v.duration || 'Sem duração'}</p>
                              </div>
                              <Button size="icon" variant="ghost" onClick={() => deleteVideo(v.id, c.id)} className="text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {/* Add video form */}
                          <div className="border-t border-gray-700 pt-3 space-y-2">
                            <Input placeholder="Título do vídeo" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} className="bg-gray-800 border-gray-700" />
                            <Input placeholder="URL do vídeo" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="bg-gray-800 border-gray-700" />
                            <Input placeholder="Duração (ex: 12:30)" value={videoDuration} onChange={e => setVideoDuration(e.target.value)} className="bg-gray-800 border-gray-700" />
                            <Button onClick={handleAddVideo} size="sm" className="bg-red-600 hover:bg-red-700 w-full">
                              <Plus className="w-3 h-3 mr-1" /> Adicionar Vídeo
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="icon" variant="ghost" onClick={() => deleteContent(c.id)} className="text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
