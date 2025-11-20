import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, TrendingUp, User, MoreHorizontal, Heart, MessageCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryMenu } from '@/components/tiktok/CategoryMenu';

// Imagens de exemplo temporárias até a parte de criadores ficar pronta
const EXAMPLE_IMAGES = [
  { id: 1, url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', likes: '2.3k', comments: '45', views: '12k' },
  { id: 2, url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', likes: '1.8k', comments: '32', views: '8.5k' },
  { id: 3, url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', likes: '3.1k', comments: '67', views: '15k' },
  { id: 4, url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', likes: '2.7k', comments: '54', views: '11k' },
  { id: 5, url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', likes: '1.9k', comments: '38', views: '9.2k' },
  { id: 6, url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400', likes: '2.5k', comments: '48', views: '13k' },
  { id: 7, url: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400', likes: '3.4k', comments: '72', views: '18k' },
  { id: 8, url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400', likes: '2.1k', comments: '41', views: '10k' },
  { id: 9, url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', likes: '2.9k', comments: '59', views: '14k' },
  { id: 10, url: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400', likes: '1.6k', comments: '29', views: '7.8k' },
  { id: 11, url: 'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=400', likes: '3.7k', comments: '81', views: '19k' },
  { id: 12, url: 'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=400', likes: '2.2k', comments: '44', views: '11.5k' },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('explore');

  const handleImageClick = (imageId: number) => {
    console.log('Imagem clicada:', imageId);
    // Aqui você pode abrir um modal ou navegar para detalhes
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Menu Lateral Esquerdo - Desktop Only */}
      <div className="hidden md:block">
        <CategoryMenu />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        {/* Header - Mobile Only */}
        <div className="md:hidden sticky top-0 z-50 bg-gradient-to-b from-black/95 to-black/80 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-white text-xl font-bold">Explorar</h1>
            <div className="w-10" /> {/* Spacer para centralizar título */}
          </div>
        </div>


        {/* Grid de Imagens */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="grid grid-cols-3 gap-1 p-1">
            {EXAMPLE_IMAGES.map((image) => (
              <div
                key={image.id}
                className="relative aspect-[3/4] cursor-pointer group overflow-hidden"
                onClick={() => handleImageClick(image.id)}
              >
                <img
                  src={image.url}
                  alt={`Explore ${image.id}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                
                {/* Overlay com estatísticas */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        <span>{image.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span>{image.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{image.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ícone de play no mobile */}
                <div className="md:hidden absolute top-2 right-2">
                  <div className="bg-black/60 rounded-full p-1">
                    <Play className="w-4 h-4 text-white" fill="white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10">
        <div className="grid grid-cols-4 gap-0">
          <button
            onClick={() => {
              setSelectedTab('home');
              navigate('/app');
            }}
            className="flex flex-col items-center justify-center py-3 text-white hover:text-gray-300 transition-colors"
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs">Início</span>
          </button>

          <button
            onClick={() => setSelectedTab('trending')}
            className="flex flex-col items-center justify-center py-3 text-white hover:text-gray-300 transition-colors"
          >
            <TrendingUp className="w-6 h-6 mb-1" />
            <span className="text-xs">Em alta</span>
          </button>

          <button
            onClick={() => {
              setSelectedTab('profile');
              navigate('/profile');
            }}
            className="flex flex-col items-center justify-center py-3 text-white hover:text-gray-300 transition-colors"
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-xs">Meu perfil</span>
          </button>

          <button
            onClick={() => setSelectedTab('more')}
            className="flex flex-col items-center justify-center py-3 text-white hover:text-gray-300 transition-colors"
          >
            <MoreHorizontal className="w-6 h-6 mb-1" />
            <span className="text-xs">Mais</span>
          </button>
        </div>
      </div>

    </div>
  );
}
