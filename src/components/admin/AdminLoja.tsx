import React, { useState, useEffect } from 'react';
import { Store, Plus, Trash2, Play, Save, ExternalLink, ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CDN_BASE = 'https://tiktokonyfans.b-cdn.net/material%20coconudi/CAPAS%20SITE%20EXCLUSIVO';

interface ProductVideo {
  id: string;
  product_id: number;
  video_url: string;
  title: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminLoja = () => {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [customCovers, setCustomCovers] = useState<Record<number, string>>({});

  // Count videos per product
  const [videoCounts, setVideoCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchVideoCounts();
    fetchAllCovers();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchProductVideos(selectedProduct);
      setCoverUrl(customCovers[selectedProduct] || '');
    }
  }, [selectedProduct]);

  const fetchAllCovers = async () => {
    const { data } = await (supabase as any)
      .from('loja_product_covers')
      .select('product_id, cover_url');
    if (data) {
      const map: Record<number, string> = {};
      data.forEach((c: any) => { map[c.product_id] = c.cover_url; });
      setCustomCovers(map);
    }
  };

  const saveCover = async () => {
    if (!selectedProduct) return;
    if (!coverUrl.trim()) {
      // Delete custom cover
      await (supabase as any).from('loja_product_covers').delete().eq('product_id', selectedProduct);
      const updated = { ...customCovers };
      delete updated[selectedProduct];
      setCustomCovers(updated);
      toast.success('Capa padrão restaurada!');
      return;
    }
    const { error } = await (supabase as any)
      .from('loja_product_covers')
      .upsert({ product_id: selectedProduct, cover_url: coverUrl.trim(), updated_at: new Date().toISOString() }, { onConflict: 'product_id' });
    if (error) {
      toast.error('Erro ao salvar capa');
    } else {
      setCustomCovers({ ...customCovers, [selectedProduct]: coverUrl.trim() });
      toast.success('Capa atualizada!');
    }
  };

  const fetchVideoCounts = async () => {
    const { data } = await supabase
      .from('loja_product_videos')
      .select('product_id')
      .eq('is_active', true);
    
    if (data) {
      const counts: Record<number, number> = {};
      data.forEach((v: any) => {
        counts[v.product_id] = (counts[v.product_id] || 0) + 1;
      });
      setVideoCounts(counts);
    }
  };

  const fetchProductVideos = async (productId: number) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loja_product_videos')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });
    
    if (error) {
      toast.error('Erro ao carregar vídeos');
    } else {
      setVideos((data as any[]) || []);
    }
    setLoading(false);
  };

  const addVideo = async () => {
    if (!selectedProduct || !newVideoUrl.trim()) return;
    
    const { error } = await supabase
      .from('loja_product_videos')
      .insert({
        product_id: selectedProduct,
        video_url: newVideoUrl.trim(),
        title: newVideoTitle.trim() || null,
        sort_order: videos.length,
      } as any);
    
    if (error) {
      toast.error('Erro ao adicionar vídeo');
    } else {
      toast.success('Vídeo adicionado!');
      setNewVideoUrl('');
      setNewVideoTitle('');
      fetchProductVideos(selectedProduct);
      fetchVideoCounts();
    }
  };

  const addBulkVideos = async () => {
    if (!selectedProduct || !bulkUrls.trim()) return;
    
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;

    const inserts = urls.map((url, i) => ({
      product_id: selectedProduct,
      video_url: url,
      title: null,
      sort_order: videos.length + i,
    }));

    const { error } = await supabase
      .from('loja_product_videos')
      .insert(inserts as any[]);
    
    if (error) {
      toast.error('Erro ao adicionar vídeos');
    } else {
      toast.success(`${urls.length} vídeo(s) adicionado(s)!`);
      setBulkUrls('');
      setBulkMode(false);
      fetchProductVideos(selectedProduct);
      fetchVideoCounts();
    }
  };

  const deleteVideo = async (videoId: string) => {
    const { error } = await supabase
      .from('loja_product_videos')
      .delete()
      .eq('id', videoId);
    
    if (error) {
      toast.error('Erro ao remover vídeo');
    } else {
      toast.success('Vídeo removido!');
      if (selectedProduct) {
        fetchProductVideos(selectedProduct);
        fetchVideoCounts();
      }
    }
  };

  const products = Array.from({ length: 29 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-amber-400" />
        <h2 className="text-2xl font-bold text-white">Nossa Loja</h2>
        <Badge variant="outline" className="text-amber-400 border-amber-400/30">
          29 Produtos
        </Badge>
      </div>

      {/* Grid de produtos */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
        {products.map((num) => {
          const fileName = num < 10 ? `0${num}` : `${num}`;
          const count = videoCounts[num] || 0;
          const isSelected = selectedProduct === num;

          return (
            <button
              key={num}
              onClick={() => setSelectedProduct(num)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                isSelected
                  ? 'border-amber-400 shadow-lg shadow-amber-400/20'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <img
                src={`${CDN_BASE}/${fileName}.jpg`}
                alt={`Produto ${num}`}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-bold text-lg">#{num}</span>
              </div>
              {count > 0 && (
                <div className="absolute top-1 right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Painel do produto selecionado */}
      {selectedProduct && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <Play className="w-5 h-5 text-amber-400" />
              Vídeos do Produto #{selectedProduct}
              <Badge className="bg-amber-500/20 text-amber-400">
                {videos.length} vídeo(s)
              </Badge>
              <Button
                size="sm"
                className="ml-auto text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={() => window.open(`/loja/${selectedProduct}`, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" /> Ver Página
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adicionar vídeo individual */}
            {!bulkMode && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="URL do vídeo (Bunny CDN)"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="flex-1 min-w-[200px] bg-white/10 border-white/30 text-white placeholder:text-white/40"
                />
                <Input
                  placeholder="Título (opcional)"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  className="w-40 bg-white/10 border-white/30 text-white placeholder:text-white/40"
                />
                <Button onClick={addVideo} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
                <Button
                  onClick={() => setBulkMode(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                >
                  Lista em lote
                </Button>
              </div>
            )}

            {/* Modo em lote */}
            {bulkMode && (
              <div className="space-y-2">
                <p className="text-white/60 text-xs">Cole as URLs dos vídeos (uma por linha):</p>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  rows={5}
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white text-sm resize-y"
                  placeholder="https://cdn.bunny.net/video1.mp4&#10;https://cdn.bunny.net/video2.mp4&#10;https://cdn.bunny.net/video3.mp4"
                />
                <div className="flex gap-2">
                  <Button onClick={addBulkVideos} className="bg-green-600 hover:bg-green-700 text-white">
                    <Save className="w-4 h-4 mr-1" /> Enviar {bulkUrls.split('\n').filter(u => u.trim()).length} vídeo(s)
                  </Button>
                  <Button variant="ghost" onClick={() => setBulkMode(false)} className="text-white/60">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de vídeos */}
            {loading ? (
              <p className="text-white/50 text-sm">Carregando...</p>
            ) : videos.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">
                Nenhum vídeo cadastrado para este produto.
              </p>
            ) : (
              <div className="space-y-2">
                {videos.map((video, idx) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10"
                  >
                    <span className="text-white/40 text-xs w-6">{idx + 1}.</span>
                    <Play className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{video.title || video.video_url}</p>
                      <p className="text-white/40 text-[10px] truncate">{video.video_url}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteVideo(video.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminLoja;
