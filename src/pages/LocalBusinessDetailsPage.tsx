import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Phone, Globe, Heart, ExternalLink, Clock, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessFavorites } from '@/hooks/useBusinessFavorites';
import coconudiLogo from '@/assets/coconudi-logo-white.png';

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

const LocalBusinessDetailsPage = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<LocalBusiness | null>(null);
  const [relatedBusinesses, setRelatedBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, loading: favoriteLoading, toggleFavorite } = useBusinessFavorites(businessId);

  useEffect(() => {
    if (businessId) {
      fetchBusiness();
    }
  }, [businessId]);

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      
      // Fetch main business
      const { data, error } = await (supabase as any)
        .from('local_businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      const businessData = data as LocalBusiness;
      setBusiness(businessData);

      // Fetch related businesses from same category
      if (businessData?.category) {
        const { data: related } = await (supabase as any)
          .from('local_businesses')
          .select('*')
          .eq('category', businessData.category)
          .eq('is_active', true)
          .neq('id', businessId)
          .limit(4);
        
        setRelatedBusinesses((related as LocalBusiness[]) || []);
      }
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-700 text-gray-700'
            }`}
          />
        ))}
        <span className="text-sm text-gray-300 ml-2">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const handleGetDirections = () => {
    if (business?.google_maps_url) {
      window.open(business.google_maps_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black overflow-y-auto">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-20 border-b border-white/10 p-4" style={{
          background: 'linear-gradient(to right, rgba(0, 245, 212, 0.95) 0%, rgba(0, 229, 204, 0.95) 25%, rgba(191, 234, 124, 0.95) 50%, rgba(254, 228, 64, 0.95) 75%, rgba(255, 217, 61, 0.95) 100%)'
        }}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full bg-white/30" />
            <Skeleton className="h-10 w-32 bg-white/30" />
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <Skeleton className="w-full h-64 bg-gray-800 rounded-xl" />
          <Skeleton className="h-8 w-3/4 bg-gray-800" />
          <Skeleton className="h-6 w-1/2 bg-gray-800" />
          <Skeleton className="h-24 w-full bg-gray-800" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Comércio não encontrado</h2>
          <p className="text-gray-400 mb-4">Este comércio não existe ou foi removido</p>
          <Button onClick={() => navigate('/local-business')} variant="outline">
            Voltar para Negócios Locais
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/10" style={{
        background: 'linear-gradient(to right, rgba(0, 245, 212, 0.95) 0%, rgba(0, 229, 204, 0.95) 25%, rgba(191, 234, 124, 0.95) 50%, rgba(254, 228, 64, 0.95) 75%, rgba(255, 217, 61, 0.95) 100%)'
      }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/local-business')}
              className="text-gray-800 hover:bg-white/20"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <img 
              src={coconudiLogo} 
              alt="CocoNudi" 
              className="h-10 w-auto object-contain"
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className="text-gray-800 hover:bg-white/20"
          >
            <Heart className={`h-6 w-6 ${isFavorite ? 'fill-pink-500 text-pink-500' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
        {/* Hero Image */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900">
          {business.image_url ? (
            <img
              src={business.image_url}
              alt={business.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="h-16 w-16 text-gray-700" />
            </div>
          )}
          
          {/* Sponsored Badge */}
          {business.is_sponsored && (
            <Badge className="absolute top-4 left-4 bg-green-500 text-white text-sm font-semibold px-3 py-1">
              PATROCINADO
            </Badge>
          )}
        </div>

        {/* Business Info Card */}
        <Card className="bg-gray-900/50 border border-white/10">
          <CardContent className="p-6 space-y-4">
            {/* Name & Rating */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{business.name}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                {renderStars(business.rating)}
                <div className="flex items-center gap-2 text-gray-400">
                  <Tag className="h-4 w-4" />
                  <span>{business.category}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {business.description && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-gray-300 leading-relaxed">{business.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info Card */}
        <Card className="bg-gray-900/50 border border-white/10">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-400" />
              Localização & Contato
            </h3>

            {/* Address */}
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-gray-300">{business.address}</p>
            </div>

            {/* Phone */}
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Phone className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <span className="text-gray-300">{business.phone}</span>
                <ExternalLink className="h-4 w-4 text-gray-500 ml-auto" />
              </a>
            )}

            {/* Website */}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Globe className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <span className="text-gray-300 truncate">{business.website}</span>
                <ExternalLink className="h-4 w-4 text-gray-500 ml-auto flex-shrink-0" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* Get Directions Button */}
        {business.google_maps_url && (
          <Button
            onClick={handleGetDirections}
            className="w-full py-6 text-lg font-semibold text-gray-900"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 245, 212, 1) 0%, rgba(191, 234, 124, 1) 50%, rgba(254, 228, 64, 1) 100%)'
            }}
          >
            <MapPin className="h-5 w-5 mr-2" />
            Como Chegar
          </Button>
        )}

        {/* Related Businesses */}
        {relatedBusinesses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Outros em {business.category}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {relatedBusinesses.map((related) => (
                <Card
                  key={related.id}
                  className="bg-gray-900/50 border border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/local-business/${related.id}`)}
                >
                  <CardContent className="p-0">
                    {related.image_url && (
                      <div className="w-full h-24 overflow-hidden">
                        <img
                          src={related.image_url}
                          alt={related.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="text-sm font-semibold text-white line-clamp-1">
                        {related.name}
                      </h4>
                      <div className="flex items-center gap-1 mt-1">
                        {related.rating && (
                          <>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-400">{related.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalBusinessDetailsPage;
