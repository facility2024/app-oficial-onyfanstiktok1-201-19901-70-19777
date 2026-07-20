import React, { useEffect, useState } from 'react';
import { Search, Phone, Globe, Star, MapPin, ExternalLink, ArrowLeft, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdCarousel } from '@/components/tiktok/AdCarousel';
import { useBusinessFavorites } from '@/hooks/useBusinessFavorites';
import coconudiLogo from '@/assets/coconudi-logo-new.png';

interface LocalBusiness {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  rating?: number;
  image_url?: string;
  is_active?: boolean;
  is_sponsored?: boolean;
}

const LocalBusinessPage = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('local_businesses' as any)
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setBusinesses((data as any) || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Todos', ...new Set(businesses.map(b => b.category).filter(Boolean))];

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'Todos' || business.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-700 text-gray-700'
            }`}
          />
        ))}
        <span className="text-xs text-gray-400 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const handleGetDirections = (business: LocalBusiness) => {
    if (business.google_maps_url) {
      window.open(business.google_maps_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Header com gradiente da navbar */}
      <div className="sticky top-0 z-20 border-b border-white/10" style={{
        background: 'linear-gradient(to right, rgba(88, 28, 135, 0.95) 0%, rgba(59, 7, 100, 0.95) 35%, rgba(24, 24, 27, 0.98) 70%, rgba(10, 10, 10, 1) 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Botão Voltar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="text-gray-800 hover:bg-white/20 flex-shrink-0"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>

          {/* Logo CocoNudi */}
          <img 
            src={coconudiLogo} 
            alt="CocoNudi" 
            className="h-10 w-auto object-contain"
          />
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 h-5 w-5" />
            <Input
              type="text"
              placeholder="Sugestões - Pesquisa"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/90 border-none text-gray-900 placeholder:text-gray-600"
            />
          </div>

          {/* Botão Favoritos */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/business-favorites')}
            className="text-gray-800 hover:bg-white/20 flex-shrink-0"
          >
            <Heart className="h-6 w-6" />
          </Button>
        </div>

        {/* Filtros de Categoria */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-[#7CB342] to-[#C4842E] text-white'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - 2 colunas: cards à esquerda, banner à direita */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Cards de Negócios em Grid (2/3 da largura) */}
          <div className="lg:col-span-2">
            {loading ? (
              // Loading skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-gray-900/50 border-white/10 animate-pulse">
                    <CardContent className="p-3">
                      <div className="h-24 bg-gray-800 rounded-lg mb-2" />
                      <div className="h-4 bg-gray-800 rounded w-3/4 mb-1" />
                      <div className="h-3 bg-gray-800 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <Card className="bg-gray-900/50 border-white/10">
                <CardContent className="p-8 text-center">
                  <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-white text-lg mb-2">Nenhum comércio encontrado</p>
                  <p className="text-gray-400">Tente ajustar sua pesquisa</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredBusinesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita - Banner de Anúncio (1/3 da largura) */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Banner de Evento/Show */}
              <Card className="bg-gray-900/50 border border-white/10 overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-purple-500 text-white text-xs font-semibold">
                        EVENTO ESPECIAL
                      </Badge>
                    </div>
                    <AdCarousel location="comercios" />
                  </div>
                </CardContent>
              </Card>

              {/* Informações adicionais */}
              <Card className="bg-gray-900/50 border border-white/10">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-400" />
                    Negócios Locais
                  </h4>
                  <p className="text-gray-400 text-sm">
                    Descubra os melhores comércios da sua região. Apoie o comércio local!
                  </p>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-gray-500">
                      💡 Dica: Use a busca para encontrar estabelecimentos específicos
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente BusinessCard separado para usar o hook de favoritos
const BusinessCard = ({ business }: { business: LocalBusiness }) => {
  const navigate = useNavigate();
  const { isFavorite, loading, toggleFavorite } = useBusinessFavorites(business.id);

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-700 text-gray-700'
            }`}
          />
        ))}
        <span className="text-xs text-gray-400 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    navigate(`/local-business/${business.id}`);
  };

  const handleGetDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (business.google_maps_url) {
      window.open(business.google_maps_url, '_blank');
    }
  };

  return (
    <Card 
      className="bg-gray-900/50 border border-white/10 hover:border-white/20 transition-all overflow-hidden relative cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Badge PATROCINADO */}
        {business.is_sponsored && (
          <div className="px-3 pt-2">
            <Badge className="bg-green-500 text-white text-xs font-semibold">
              PATROCINADO
            </Badge>
          </div>
        )}

        {/* Botão Favorito */}
        <button
          onClick={toggleFavorite}
          disabled={loading}
          className="absolute top-2 right-2 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all"
        >
          <Heart
            className={`h-4 w-4 transition-all ${
              isFavorite ? 'fill-pink-500 text-pink-500' : 'text-white'
            }`}
          />
        </button>

        {/* Imagem Compacta */}
        {business.image_url && (
          <div className="relative w-full h-28 overflow-hidden mt-2 mx-3" style={{ width: 'calc(100% - 1.5rem)' }}>
            <img
              src={business.image_url}
              alt={business.name}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-3 space-y-2">
          {/* Nome */}
          <h3 className="text-base font-semibold text-white line-clamp-1">
            {business.name}
          </h3>

          {/* Categoria */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3 w-3" />
            <span>{business.category}</span>
          </div>

          {/* Avaliação */}
          {renderStars(business.rating)}

          {/* Descrição */}
          {business.description && (
            <p className="text-gray-300 text-xs line-clamp-1">
              {business.description}
            </p>
          )}

          {/* Endereço */}
          <p className="text-gray-400 text-xs flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{business.address}</span>
          </p>

          {/* Info adicional */}
          <div className="flex flex-wrap gap-2 text-xs">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="h-3 w-3" />
                <span>{business.phone}</span>
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <Globe className="h-3 w-3" />
                <span>Site</span>
              </a>
            )}
          </div>

          {/* CTA Button compacto com gradiente */}
          <Button
            onClick={handleGetDirections}
            size="sm"
            className="w-full text-white font-semibold text-xs"
            style={{
              background: 'linear-gradient(135deg, rgba(88, 28, 135, 1) 0%, rgba(10, 10, 10, 1) 100%)'
            }}
          >
            Como Chegar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocalBusinessPage;
