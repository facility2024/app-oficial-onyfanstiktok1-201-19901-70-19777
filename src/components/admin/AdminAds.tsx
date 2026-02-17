import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Megaphone, MapPin, Monitor, Smartphone, Info, Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import ad1 from '@/assets/ads/ad1.png';
import ad2 from '@/assets/ads/ad2.png';
import ad3 from '@/assets/ads/ad3.png';
import ad4 from '@/assets/ads/ad4.png';
import ad5 from '@/assets/ads/ad5.png';

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

const defaultAds: Ad[] = [
  { id: 1, image: ad1, title: 'ASHA CLUB', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 2, image: ad2, title: 'INNER CLUB', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 3, image: ad3, title: 'Terça - Realize todos seus fetiches', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 4, image: ad4, title: 'Quinta - Desfile de Lingerie', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
  { id: 5, image: ad5, title: 'O Melhor Night Club de BH', link: '#', active: true, locations: { feed: true, marketplace: true, comercios: true } },
];

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

  useEffect(() => {
    const stored = localStorage.getItem('admin_ads');
    if (stored) {
      setAds(JSON.parse(stored));
    } else {
      setAds(defaultAds);
      localStorage.setItem('admin_ads', JSON.stringify(defaultAds));
    }
  }, []);

  const saveAds = (updated: Ad[]) => {
    setAds(updated);
    localStorage.setItem('admin_ads', JSON.stringify(updated));
  };

  const toggleAdActive = (id: number) => {
    const updated = ads.map(ad => ad.id === id ? { ...ad, active: !ad.active } : ad);
    saveAds(updated);
    toast.success('Status do anúncio atualizado');
  };

  const toggleLocation = (adId: number, location: 'feed' | 'marketplace' | 'comercios') => {
    const updated = ads.map(ad => {
      if (ad.id === adId) {
        return { ...ad, locations: { ...ad.locations, [location]: !ad.locations[location] } };
      }
      return ad;
    });
    saveAds(updated);
    toast.success('Localização atualizada');
  };

  const deleteAd = (id: number) => {
    const updated = ads.filter(ad => ad.id !== id);
    saveAds(updated);
    toast.success('Anúncio removido');
  };

  const createAd = () => {
    if (!newAd.title) { toast.error('Título é obrigatório'); return; }
    const ad: Ad = {
      id: Date.now(),
      image: newAd.imageUrl || ad1,
      title: newAd.title,
      link: newAd.link || '#',
      active: true,
      locations: { feed: true, marketplace: true, comercios: true },
    };
    const updated = [...ads, ad];
    saveAds(updated);
    setNewAd({ title: '', link: '', imageUrl: '' });
    setShowCreateModal(false);
    toast.success('Anúncio criado com sucesso!');
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
            <p className="text-gray-400 text-sm">Gerencie os anúncios exibidos no app</p>
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
                <Label className="text-gray-300">URL da Imagem</Label>
                <Input
                  value={newAd.imageUrl}
                  onChange={e => setNewAd(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://imagem.com/banner.png"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-gray-500 text-xs mt-1">Deixe vazio para usar imagem padrão</p>
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
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Preview da imagem */}
                  <div className="relative w-full md:w-48 h-28 rounded overflow-hidden flex-shrink-0">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 bg-black/70 text-[10px] text-gray-300 px-1.5 py-0.5 rounded font-mono">
                      600×300px
                    </div>
                  </div>

                  {/* Info */}
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
                          variant="ghost"
                          onClick={() => toggleAdActive(ad.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          {ad.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteAd(ad.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Localizações */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ad.locations.feed}
                          onCheckedChange={() => toggleLocation(ad.id, 'feed')}
                        />
                        <span className="text-gray-300 text-sm flex items-center gap-1">
                          <Monitor className="w-3 h-3" /> Feed
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ad.locations.marketplace}
                          onCheckedChange={() => toggleLocation(ad.id, 'marketplace')}
                        />
                        <span className="text-gray-300 text-sm flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> Marketplace
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ad.locations.comercios}
                          onCheckedChange={() => toggleLocation(ad.id, 'comercios')}
                        />
                        <span className="text-gray-300 text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Comércios
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
