import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, MapPin, Monitor, Smartphone, Info } from 'lucide-react';
import ad1 from '@/assets/ads/ad1.png';
import ad2 from '@/assets/ads/ad2.png';
import ad3 from '@/assets/ads/ad3.png';
import ad4 from '@/assets/ads/ad4.png';
import ad5 from '@/assets/ads/ad5.png';

const currentAds = [
  { id: 1, image: ad1, title: 'ASHA CLUB', link: '#', status: 'ativo' },
  { id: 2, image: ad2, title: 'INNER CLUB', link: '#', status: 'ativo' },
  { id: 3, image: ad3, title: 'Terça - Realize todos seus fetiches', link: '#', status: 'ativo' },
  { id: 4, image: ad4, title: 'Quinta - Desfile de Lingerie', link: '#', status: 'ativo' },
  { id: 5, image: ad5, title: 'O Melhor Night Club de BH', link: '#', status: 'ativo' },
];

const bannerLocations = [
  {
    icon: Monitor,
    title: 'Feed Principal (Desktop)',
    description: 'Barra lateral direita do feed de vídeos',
    page: 'TikTokApp.tsx',
    format: '600x300px',
    rotation: 'Automática a cada 4 segundos',
  },
  {
    icon: Smartphone,
    title: 'Marketplace',
    description: 'Rodapé da página do Marketplace, centralizado',
    page: 'MarketplacePage.tsx',
    format: '600x300px',
    rotation: 'Automática a cada 4 segundos',
  },
  {
    icon: MapPin,
    title: 'Comércios Locais',
    description: 'Dentro dos cards de comércios locais',
    page: 'LocalBusinessPage.tsx',
    format: 'Responsivo',
    rotation: 'Automática a cada 4 segundos',
  },
];

export const AdminAds = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Megaphone className="w-8 h-8 text-yellow-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Banners Patrocinados</h2>
          <p className="text-gray-400 text-sm">Gerencie os anúncios exibidos no app</p>
        </div>
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
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Formato:</span>
                    <span className="text-green-400 font-mono">{loc.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rotação:</span>
                    <span className="text-yellow-400">{loc.rotation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Arquivo:</span>
                    <span className="text-purple-400 font-mono text-[10px]">{loc.page}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anúncios atuais */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            📢 Anúncios Ativos ({currentAds.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentAds.map((ad) => (
              <div key={ad.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-40 object-cover"
                />
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium text-sm truncate">{ad.title}</h4>
                    <Badge className="bg-green-600 text-white text-[10px]">
                      {ad.status}
                    </Badge>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Link: {ad.link}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
            <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Como alterar os banners</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Atualmente os banners são gerenciados via código no arquivo{' '}
              <code className="bg-gray-800 px-1 rounded text-purple-400">src/components/tiktok/AdCarousel.tsx</code>.
              As imagens ficam em{' '}
              <code className="bg-gray-800 px-1 rounded text-purple-400">src/assets/ads/</code>.
              Para adicionar ou trocar um banner, substitua a imagem na pasta e atualize o array no componente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
