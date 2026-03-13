import React, { useState, useEffect } from 'react';
import { Store, Plus, Trash2, Play, Save, ExternalLink, ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CDN_BASE = 'https://tiktokonyfans.b-cdn.net/material%20coconudi/CAPAS%20SITE%20EXCLUSIVO';

interface LojaProduct {
  id: number;
  title: string;
  cover_url: string | null;
  is_active: boolean;
}

interface ProductVideo {
  id: string;
  product_id: number;
  video_url: string;
  title: string | null;
  sort_order: number;
  is_active: boolean;
}

const AdminLoja = () => {
  const [products, setProducts] = useState<LojaProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [videoCounts, setVideoCounts] = useState<Record<number, number>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdCover, setNewProdCover] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchVideoCounts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchProductVideos(selectedProduct);
      const prod = products.find(p => p.id === selectedProduct);
      setCoverUrl(prod?.cover_url || '');
    }
  }, [selectedProduct, products]);

  const fetchProducts = async () => {
    const { data, error } = await (supabase as any)
      .from('loja_products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data) setProducts(data);
  };

  const saveCover = async () => {
    if (!selectedProduct) return;
    const { error } = await (supabase as any)
      .from('loja_products')
      .update({ cover_url: coverUrl.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', selectedProduct);
    if (error) {
      toast.error('Erro ao salvar capa');
    } else {
      toast.success(coverUrl.trim() ? 'Capa atualizada!' : 'Capa padrão restaurada!');
      fetchProducts();
    }
  };

  const fetchVideoCounts = async () => {
    // Fetch all video records in pages of 1000 to avoid Supabase default limit
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from('loja_product_videos')
        .select('product_id')
        .eq('is_active', true)
        .range(from, from + pageSize - 1);
      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    const counts: Record<number, number> = {};
    allData.forEach((v: any) => {
      counts[v.product_id] = (counts[v.product_id] || 0) + 1;
    });
    setVideoCounts(counts);
  };

  const fetchProductVideos = async (productId: number) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loja_product_videos')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });
    if (error) toast.error('Erro ao carregar vídeos');
    else setVideos((data as any[]) || []);
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
    if (error) toast.error('Erro ao adicionar vídeo');
    else {
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
    if (error) toast.error('Erro ao adicionar vídeos');
    else {
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
    if (error) toast.error('Erro ao remover vídeo');
    else {
      toast.success('Vídeo removido!');
      if (selectedProduct) {
        fetchProductVideos(selectedProduct);
        fetchVideoCounts();
      }
    }
  };

  const handleCreateProduct = async () => {
    if (!newProdTitle.trim()) {
      toast.error('Informe o nome do produto');
      return;
    }
    const { data, error } = await (supabase as any)
      .from('loja_products')
      .insert({
        title: newProdTitle.trim(),
        cover_url: newProdCover.trim() || null,
        sort_order: products.length + 1,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar produto: ' + error.message);
      return;
    }
    toast.success(`Produto #${data.id} "${newProdTitle}" criado!`);
    setNewProdTitle('');
    setNewProdCover('');
    setShowCreateModal(false);
    fetchProducts();
  };

  const getCoverImage = (product: LojaProduct) => {
    if (product.cover_url) return product.cover_url;
    const fileName = product.id < 10 ? `0${product.id}` : `${product.id}`;
    return `${CDN_BASE}/${fileName}.jpg`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-amber-400" />
        <h2 className="text-2xl font-bold text-white">Nossa Loja</h2>
        <Badge variant="outline" className="text-amber-400 border-amber-400/30">
          {products.length} Produtos
        </Badge>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="ml-auto bg-green-600 hover:bg-green-700 text-white font-bold"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Criar Produto
        </Button>
      </div>

      {/* Grid de produtos */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
        {products.map((product) => {
          const count = videoCounts[product.id] || 0;
          const isSelected = selectedProduct === product.id;
          return (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product.id)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                isSelected
                  ? 'border-amber-400 shadow-lg shadow-amber-400/20'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <img
                src={getCoverImage(product)}
                alt={product.title}
                className="w-full aspect-square object-cover"
                loading="lazy"
                onError={(e) => { const f = product.id < 10 ? `0${product.id}` : `${product.id}`; e.currentTarget.src = `${CDN_BASE}/${f}.jpg`; }}
              />
              {product.cover_url && (
                <div className="absolute bottom-0.5 left-0.5">
                  <ImageIcon className="w-3 h-3 text-green-400 drop-shadow-lg" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-lg">#{product.id}</span>
                <span className="text-white/80 text-[8px] font-semibold leading-tight text-center px-1 truncate max-w-full">{product.title}</span>
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
            {/* Editar capa */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
              <p className="text-amber-300 text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Capa do Produto
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="URL da nova capa (deixe vazio para padrão)"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="flex-1 bg-white/10 border-white/30 text-white placeholder:text-white/40 text-sm"
                />
                <Button onClick={saveCover} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs">
                  <Upload className="w-3 h-3 mr-1" /> Salvar Capa
                </Button>
              </div>
              {coverUrl && (
                <img src={coverUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-white/20" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
            </div>

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
                  placeholder="https://cdn.bunny.net/video1.mp4&#10;https://cdn.bunny.net/video2.mp4"
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
                  <div key={video.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
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

      {/* Modal Criar Produto */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Criar Novo Produto
            </h3>
            <div>
              <label className="text-white/70 text-sm">Nome do Produto *</label>
              <Input
                value={newProdTitle}
                onChange={e => setNewProdTitle(e.target.value)}
                className="bg-white/10 border-white/20 text-white mt-1"
                placeholder="Ex: Coroas, Novinhas..."
              />
            </div>
            <div>
              <label className="text-white/70 text-sm">URL da Capa (opcional)</label>
              <Input
                value={newProdCover}
                onChange={e => setNewProdCover(e.target.value)}
                className="bg-white/10 border-white/20 text-white mt-1"
                placeholder="https://cdn.../imagem.jpg"
              />
            </div>
            {newProdCover && (
              <img src={newProdCover} alt="Preview" className="w-full h-32 object-cover rounded-lg" onError={e => { e.currentTarget.src = '/placeholder.svg'; }} />
            )}
            <div className="flex gap-2">
              <Button onClick={handleCreateProduct} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold">
                <Plus className="w-4 h-4 mr-1" /> Criar Produto
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="text-white/60">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoja;
