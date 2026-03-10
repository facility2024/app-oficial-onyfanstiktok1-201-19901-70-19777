import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import rainbowLogo from '@/assets/coconudi-rainbow-logo.png';

const CDN_BASE = 'https://tiktokonyfans.b-cdn.net/material%20coconudi/CAPAS%20SITE%20EXCLUSIVO';

const availableImageNumbers = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
];

const exclusiveImages = availableImageNumbers.map((imageNumber) => ({
  id: `img-${imageNumber}`,
  title: `Conteúdo Exclusivo ${imageNumber}`,
  url: `${CDN_BASE}/${imageNumber}.jpg`,
}));

const ExclusividadeConteudo = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<typeof exclusiveImages[0] | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('exclusividade_user');
    if (!stored) {
      navigate('/exclusividade');
      return;
    }
    setUser(JSON.parse(stored));
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('exclusividade_user');
    navigate('/exclusividade');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
    }}>
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #7CB342 0%, #558B2F 35%, #C4842E 70%, #8B4513 100%)',
        }}
      >
        <img src={rainbowLogo} alt="CocoNudi" className="h-10 object-contain" />
        <div className="flex items-center gap-3">
          <span className="text-white/90 text-sm hidden sm:block">Olá, {user.name}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20 text-xs">
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Conteúdos Exclusivos</h2>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">VIP</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {exclusiveImages.map((img) => (
            <Card
              key={img.id}
              className="group cursor-pointer border border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              onClick={() => setSelectedImage(img)}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <Badge className="absolute top-2 right-2 bg-yellow-500/80 text-white text-[10px] border-0">
                  Exclusivo
                </Badge>
              </div>
              <CardContent className="p-3 space-y-1">
                <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{img.title}</p>
                <p className="text-white/60 text-xs">Toque para ampliar</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="bg-black/95 border-white/10 max-w-lg p-0 overflow-hidden">
          {selectedImage && (
            <div>
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="w-full max-h-[85vh] object-contain"
              />
              <div className="p-4">
                <p className="text-white font-semibold">{selectedImage.title}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExclusividadeConteudo;
