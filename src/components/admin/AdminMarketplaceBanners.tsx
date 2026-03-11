import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Image, Plus, Trash2, Edit, Eye, EyeOff, List, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceBanner {
  id: number;
  src: string;
  alt: string;
  active: boolean;
}

const SETTING_KEY = 'marketplace_banners';

const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 400;
const BANNER_RATIO = '3:1';

// Sem fallback estático — banners vêm exclusivamente do admin
const getDefaultBanners = (): MarketplaceBanner[] => [];

export const AdminMarketplaceBanners = () => {
  const [banners, setBanners] = useState<MarketplaceBanner[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<MarketplaceBanner | null>(null);
  const [newBanner, setNewBanner] = useState({ src: '', alt: '' });
  const [batchUrls, setBatchUrls] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load banners from Supabase
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', SETTING_KEY)
          .maybeSingle();

        if (!error && data?.setting_value) {
          const parsed = data.setting_value as unknown as MarketplaceBanner[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBanners(parsed);
            setIsLoading(false);
            return;
          }
        }
        // No data found — start empty (admin will add banners)
        setBanners([]);
      } catch {
        setBanners(getDefaultBanners());
      }
      setIsLoading(false);
    };

    loadBanners();
  }, []);

  const saveBannersToSupabase = async (updated: MarketplaceBanner[]) => {
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('id')
      .eq('setting_key', SETTING_KEY)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('admin_settings')
        .update({ setting_value: updated as any, updated_at: new Date().toISOString() })
        .eq('setting_key', SETTING_KEY);
    } else {
      await supabase
        .from('admin_settings')
        .insert({ setting_key: SETTING_KEY, setting_value: updated as any });
    }
  };

  const saveBanners = (updated: MarketplaceBanner[]) => {
    setBanners(updated);
  };

  const publishBanners = async () => {
    setIsSaving(true);
    try {
      await saveBannersToSupabase(banners);
      toast.success('✅ Banners publicados com sucesso! Alterações visíveis no Marketplace.');
    } catch {
      toast.error('Erro ao publicar banners');
    }
    setIsSaving(false);
  };

  const toggleActive = (id: number) => {
    const updated = banners.map(b => b.id === id ? { ...b, active: !b.active } : b);
    saveBanners(updated);
    toast.success('Status atualizado — clique em Publicar para aplicar');
  };

  const deleteBanner = (id: number) => {
    const updated = banners.filter(b => b.id !== id);
    saveBanners(updated);
    toast.success('Banner removido — clique em Publicar para aplicar');
  };

  const createBanner = () => {
    if (!newBanner.src) { toast.error('URL da imagem é obrigatória'); return; }
    const banner: MarketplaceBanner = {
      id: Date.now(),
      src: newBanner.src,
      alt: newBanner.alt || 'Banner Marketplace',
      active: true,
    };
    saveBanners([...banners, banner]);
    setNewBanner({ src: '', alt: '' });
    setShowCreateModal(false);
    toast.success('Banner criado — clique em Publicar para aplicar');
  };

  const createBatchBanners = () => {
    const urls = batchUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) { toast.error('Insira pelo menos uma URL'); return; }
    const newBanners: MarketplaceBanner[] = urls.map((url, i) => ({
      id: Date.now() + i,
      src: url,
      alt: `Banner ${banners.length + i + 1}`,
      active: true,
    }));
    saveBanners([...banners, ...newBanners]);
    setBatchUrls('');
    setShowBatchModal(false);
    toast.success(`${newBanners.length} banners criados — clique em Publicar para aplicar`);
  };

  const updateBanner = () => {
    if (!editingBanner) return;
    const updated = banners.map(b => b.id === editingBanner.id ? editingBanner : b);
    saveBanners(updated);
    setEditingBanner(null);
    toast.success('Banner atualizado — clique em Publicar para aplicar');
  };

  const activeCount = banners.filter(b => b.active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="ml-3 text-gray-400">Carregando banners...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Image className="w-8 h-8 text-amber-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Banners do Marketplace</h2>
            <p className="text-gray-400 text-sm">Gerencie os banners do carrossel do Marketplace</p>
          </div>
        </div>
      <div className="flex gap-2">
          <Button
            onClick={publishBanners}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold animate-pulse hover:animate-none"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            🚀 Publicar Banners
          </Button>
          <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <List className="w-4 h-4 mr-2" /> Envio em Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Envio em Lote de Banners</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-gray-300">URLs das imagens (uma por linha)</Label>
                  <Textarea
                    value={batchUrls}
                    onChange={e => setBatchUrls(e.target.value)}
                    placeholder={"https://exemplo.com/banner1.png\nhttps://exemplo.com/banner2.png\nhttps://exemplo.com/banner3.png"}
                    className="bg-gray-800 border-gray-700 text-white min-h-[150px] font-mono text-sm"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Cada URL será criada como um banner ativo. Dimensão recomendada: {BANNER_WIDTH}x{BANNER_HEIGHT}px ({BANNER_RATIO})
                  </p>
                </div>
                <Button onClick={createBatchBanners} className="w-full bg-amber-600 hover:bg-amber-700">
                  Criar Banners em Lote
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Adicionar Banner Unitário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-gray-300">URL da Imagem *</Label>
                  <Input
                    value={newBanner.src}
                    onChange={e => setNewBanner(prev => ({ ...prev, src: e.target.value }))}
                    placeholder="https://cdn.exemplo.com/banner.png"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Texto alternativo (alt)</Label>
                  <Input
                    value={newBanner.alt}
                    onChange={e => setNewBanner(prev => ({ ...prev, alt: e.target.value }))}
                    placeholder="Descrição do banner"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <p className="text-gray-400 text-xs">📐 Dimensão recomendada: <span className="text-amber-400 font-bold">{BANNER_WIDTH}x{BANNER_HEIGHT}px</span> (proporção {BANNER_RATIO})</p>
                </div>
                {newBanner.src && (
                  <div className="w-full aspect-[3/1] rounded overflow-hidden border border-gray-700">
                    <img src={newBanner.src} alt="Preview" className="w-full h-full object-contain bg-black" />
                  </div>
                )}
                <Button onClick={createBanner} className="w-full bg-green-600 hover:bg-green-700">
                  Adicionar Banner
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dimensões Info */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-blue-400" />
            Especificações do Banner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs">Largura</p>
              <p className="text-amber-400 font-bold text-lg">{BANNER_WIDTH}px</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs">Altura</p>
              <p className="text-amber-400 font-bold text-lg">{BANNER_HEIGHT}px</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs">Proporção</p>
              <p className="text-amber-400 font-bold text-lg">{BANNER_RATIO}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-gray-500 text-xs">Formatos</p>
              <p className="text-amber-400 font-bold text-lg">PNG/JPG</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Banners */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            📸 Banners ({activeCount} ativos / {banners.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {banners.map((banner, index) => (
              <div key={banner.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative w-full md:w-64 aspect-[3/1] rounded overflow-hidden flex-shrink-0 border border-gray-600">
                    <img src={banner.src} alt={banner.alt} className="w-full h-full object-contain bg-black" />
                    <div className="absolute bottom-1 left-1 bg-black/70 text-[10px] text-gray-300 px-1.5 py-0.5 rounded font-mono">
                      {BANNER_WIDTH}×{BANNER_HEIGHT}px
                    </div>
                    <div className="absolute top-1 left-1 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded font-mono">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-white font-semibold">{banner.alt}</h4>
                        <p className="text-gray-500 text-xs truncate max-w-xs">{banner.src}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={banner.active ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}>
                          {banner.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBanner({ ...banner })}
                          className="border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(banner.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          {banner.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBanner(banner.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <p className="text-gray-500 text-center py-8">Nenhum banner cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Edição */}
      <Dialog open={!!editingBanner} onOpenChange={(open) => !open && setEditingBanner(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Editar Banner</DialogTitle>
          </DialogHeader>
          {editingBanner && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-gray-300">URL da Imagem *</Label>
                <Input
                  value={editingBanner.src}
                  onChange={e => setEditingBanner({ ...editingBanner, src: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Texto alternativo (alt)</Label>
                <Input
                  value={editingBanner.alt}
                  onChange={e => setEditingBanner({ ...editingBanner, alt: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="w-full aspect-[3/1] rounded overflow-hidden border border-gray-700">
                <img src={editingBanner.src} alt="Preview" className="w-full h-full object-contain bg-black" />
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <p className="text-gray-400 text-xs">📐 Dimensão recomendada: <span className="text-amber-400 font-bold">{BANNER_WIDTH}x{BANNER_HEIGHT}px</span></p>
              </div>
              <Button onClick={updateBanner} className="w-full bg-blue-600 hover:bg-blue-700">
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
