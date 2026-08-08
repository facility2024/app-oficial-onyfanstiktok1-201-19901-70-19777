import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Megaphone, MapPin, Monitor, Smartphone, Info, Plus, Trash2, Edit, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Ad {
  id: number;
  image: string;
  title: string;
  link: string;
  active: boolean;
  locations: {
    feed: boolean;
    marketplace: boolean;
    comercios: boolean;
  };
}

const bannerLocations = [
  { icon: Monitor, title: 'Feed Principal (Desktop)', description: 'Barra lateral direita do feed de vídeos', format: '600x300px', key: 'feed' },
  { icon: Smartphone, title: 'Marketplace', description: 'Rodapé da página do Marketplace, centralizado', format: '600x300px', key: 'marketplace' },
  { icon: MapPin, title: 'Comércios Locais', description: 'Dentro dos cards de comércios locais', format: 'Responsivo', key: 'comercios' },
];

export const AdminAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', link: '', imageUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdsFromSupabase();
  }, []);

  const loadAdsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'sponsored_ads')
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar anúncios:', error);
        return;
      }

      if (data?.setting_value) {
        const parsed = data.setting_value as any;
        if (Array.isArray(parsed)) {
          setAds(parsed);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
    }
  };

  const saveAdsToSupabase = async (updated: Ad[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: 'sponsored_ads',
          setting_value: updated as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      setAds(updated);
      toast.success('✅ Anúncios salvos e publicados!');
    } catch (err: any) {
      console.error('Erro ao salvar anúncios:', err);
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAdActive = (id: number) => {
    const updated = ads.map(ad => ad.id === id ? { ...ad, active: !ad.active } : ad);
    saveAdsToSupabase(updated);
  };

  const toggleLocation = (adId: number, location: 'feed' | 'marketplace' | 'comercios') => {
    const updated = ads.map(ad => {
      if (ad.id === adId) {
        return { ...ad, locations: { ...ad.locations, [location]: !ad.locations[location] } };
      }
      return ad;
    });
    saveAdsToSupabase(updated);
  };

  const deleteAd = (id: number) => {
    const updated = ads.filter(ad => ad.id !== id);
    saveAdsToSupabase(updated);
  };

  const createAd = () => {
    if (!newAd.title) { toast.error('Título é obrigatório'); return; }
    if (!newAd.imageUrl) { toast.error('URL da imagem é obrigatória'); return; }
    const ad: Ad = {
      id: Date.now(),
      image: newAd.imageUrl,
      title: newAd.title,
      link: newAd.link || '#',
      active: true,
      locations: { feed: true, marketplace: true, comercios: true },
    };
    const updated = [...ads, ad];
    saveAdsToSupabase(updated);
    setNewAd({ title: '', link: '', imageUrl: '' });
    setShowCreateModal(false);
  };

  const updateAd = () => {
    if (!editingAd) return;
    const updated = ads.map(ad => ad.id === editingAd.id ? editingAd : ad);
    saveAdsToSupabase(updated);
    setEditingAd(null);
  };

  const activeCount = ads.filter(a => a.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Banners Patrocinados</h2>
            <p className="text-gray-400 text-sm">Gerencie os anúncios exibidos no app (salvo no Supabase)</p>
          </div>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Criar Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Criar Novo Anúncio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-gray-300">Título *</Label>
                <Input
                  value={newAd.title}
                  onChange={e => setNewAd(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome do anúncio"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Link (URL)</Label>
                <Input
                  value={newAd.link}
                  onChange={e => setNewAd(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="https://..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">URL da Imagem *</Label>
                <Input
                  value={newAd.imageUrl}
                  onChange={e => setNewAd(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://imagem.com/banner.png"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button onClick={createAd} className="w-full bg-green-600 hover:bg-green-700">
                Criar Anúncio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Onde os banners aparecem */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Onde os banners aparecem no app
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bannerLocations.map((loc, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <loc.icon className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold">{loc.title}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-3">{loc.description}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Formato:</span>
                  <span className="text-green-400 font-mono">{loc.format}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anúncios */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            📢 Anúncios ({activeCount} ativos / {ads.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ads.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum anúncio cadastrado</p>
              <p className="text-sm mt-1">Clique em "Criar Anúncio" para começar</p>
            </div>
          )}
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative w-full md:w-48 h-28 rounded overflow-hidden flex-shrink-0">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                    <div className="absolute bottom-1 left-1 bg-black/70 text-[10px] text-gray-300 px-1.5 py-0.5 rounded font-mono">
                      600×300px
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">{ad.title}</h4>
                        <p className="text-gray-500 text-xs">Link: {ad.link}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={ad.active ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}>
                          {ad.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingAd({ ...ad })}
                          className="border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleAdActive(ad.id)} className="text-gray-400 hover:text-white">
                          {ad.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteAd(ad.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={ad.locations.feed} onCheckedChange={() => toggleLocation(ad.id, 'feed')} />
                        <span className="text-gray-300 text-sm flex items-center gap-1"><Monitor className="w-3 h-3" /> Feed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={ad.locations.marketplace} onCheckedChange={() => toggleLocation(ad.id, 'marketplace')} />
                        <span className="text-gray-300 text-sm flex items-center gap-1"><Smartphone className="w-3 h-3" /> Marketplace</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={ad.locations.comercios} onCheckedChange={() => toggleLocation(ad.id, 'comercios')} />
                        <span className="text-gray-300 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" /> Comércios</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={!!editingAd} onOpenChange={(open) => !open && setEditingAd(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Editar Anúncio</DialogTitle>
          </DialogHeader>
          {editingAd && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-gray-300">Título *</Label>
                <Input
                  value={editingAd.title}
                  onChange={e => setEditingAd({ ...editingAd, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Link (URL)</Label>
                <Input
                  value={editingAd.link}
                  onChange={e => setEditingAd({ ...editingAd, link: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">URL da Imagem</Label>
                <Input
                  value={editingAd.image}
                  onChange={e => setEditingAd({ ...editingAd, image: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="w-full h-32 rounded overflow-hidden border border-gray-700">
                <img src={editingAd.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <Button onClick={updateAd} className="w-full bg-blue-600 hover:bg-blue-700">
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};