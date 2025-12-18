import { ArrowLeft, Heart, MapPin, Phone, Globe, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBusinessFavorites } from "@/hooks/useBusinessFavorites";
import coconudiLogo from "@/assets/coconudi-logo-white.png";

const BusinessFavoritesPage = () => {
  const navigate = useNavigate();
  const { favorites, loading } = useGetBusinessFavorites();

  const renderStars = (rating?: number) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < fullStars ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
          }`}
        />
      );
    }
    return stars;
  };

  const handleGetDirections = (lat?: number, lng?: number) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto">
      {/* Header fixo com gradiente do app */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[rgba(124,179,66,0.95)] via-[rgba(196,132,46,0.95)] to-[rgba(139,69,19,0.95)] backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Heart className="h-5 w-5 text-white fill-white" />
            <h1 className="text-xl font-bold text-white">Meus Comércios Favoritos</h1>
          </div>
          <img src={coconudiLogo} alt="CocoNudi" className="h-8 w-auto" />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto p-4 max-w-6xl">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-gray-900/50 border-white/10 p-3">
                <Skeleton className="w-full h-28 rounded-lg mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="h-16 w-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Nenhum comércio favorito
            </h2>
            <p className="text-gray-400 mb-6">
              Salve seus comércios locais favoritos para acessá-los rapidamente
            </p>
            <Button
              onClick={() => navigate("/local-business")}
              className="bg-gradient-to-r from-[#7CB342] to-[#C4842E]"
            >
              Explorar Comércios
            </Button>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
              {favorites.length} {favorites.length === 1 ? "comércio salvo" : "comércios salvos"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {favorites.map((fav: any) => {
                const business = fav.local_businesses;
                if (!business) return null;

                return (
                  <Card
                    key={fav.id}
                    className="bg-gray-900/50 border-white/10 overflow-hidden hover:border-white/20 transition-all"
                  >
                    {business.is_sponsored && (
                      <div className="bg-gradient-to-r from-green-500 to-yellow-500 px-2 py-0.5">
                        <span className="text-[10px] font-bold text-white">
                          ⭐ PATROCINADO
                        </span>
                      </div>
                    )}

                    <div className="p-3 space-y-2">
                      {business.image_url && (
                        <img
                          src={business.image_url}
                          alt={business.name}
                          className="w-full h-28 object-cover rounded-lg"
                        />
                      )}

                      <h3 className="text-base font-semibold text-white line-clamp-1">
                        {business.name}
                      </h3>

                      {business.rating && (
                        <div className="flex items-center gap-1">
                          {renderStars(business.rating)}
                        </div>
                      )}

                      {business.category && (
                        <p className="text-xs text-gray-400">{business.category}</p>
                      )}

                      {business.description && (
                        <p className="text-xs text-gray-300 line-clamp-1">
                          {business.description}
                        </p>
                      )}

                      <div className="space-y-1 text-xs text-gray-400">
                        {business.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{business.address}</span>
                          </div>
                        )}
                        {business.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{business.phone}</span>
                          </div>
                        )}
                        {business.website && (
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3 w-3 flex-shrink-0" />
                            <a
                              href={business.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline line-clamp-1"
                            >
                              {business.website}
                            </a>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleGetDirections(business.latitude, business.longitude)}
                        size="sm"
                        className="w-full bg-gradient-to-r from-[#7CB342] to-[#C4842E] hover:from-[#558B2F] hover:to-[#8B4513] text-white text-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Como Chegar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessFavoritesPage;
