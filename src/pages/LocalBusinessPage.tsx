import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Phone, Globe, Star, Navigation, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface LocalBusiness {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  image_url?: string;
  is_active: boolean;
}

// Componente para recentralizar o mapa
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
};

const LocalBusinessPage = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<LocalBusiness[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<LocalBusiness | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number]>([-23.550520, -46.633308]); // São Paulo default
  const [isLoading, setIsLoading] = useState(true);

  // Ícone customizado para marcadores
  const businessIcon = new Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const userIcon = new Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  // Buscar localização do usuário
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Erro ao obter localização:', error);
          toast.info('Usando localização padrão: São Paulo');
        }
      );
    }
  }, []);

  // Buscar comércios locais
  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('local_businesses' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setBusinesses((data as any) || []);
      setFilteredBusinesses((data as any) || []);
    } catch (error) {
      console.error('Erro ao buscar comércios:', error);
      toast.error('Erro ao carregar comércios locais');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar comércios pela busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredBusinesses(businesses);
    } else {
      const filtered = businesses.filter(
        (business) =>
          business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          business.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          business.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBusinesses(filtered);
    }
  }, [searchTerm, businesses]);

  const handleBusinessClick = (business: LocalBusiness) => {
    setSelectedBusiness(business);
    setUserLocation([business.latitude, business.longitude]);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/90 to-secondary/90 text-white p-4 shadow-lg z-10">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-2xl font-bold">Comércios Locais</h1>
        </div>
        
        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Buscar comércios, categorias ou endereços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/95 border-0 text-gray-900"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Lista lateral de comércios (Desktop) */}
        <div className="hidden md:flex md:w-96 flex-col bg-card border-r overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              {filteredBusinesses.length} comércios encontrados
            </h2>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBusinesses.map((business) => (
                  <Card
                    key={business.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                      selectedBusiness?.id === business.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleBusinessClick(business)}
                  >
                    <div className="flex gap-3">
                      {business.image_url && (
                        <img
                          src={business.image_url}
                          alt={business.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{business.name}</h3>
                        <p className="text-sm text-muted-foreground mb-1">{business.category}</p>
                        {business.rating && (
                          <div className="flex gap-1 mb-2">{renderStars(business.rating)}</div>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={12} />
                          {business.address}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          <MapContainer
            center={userLocation}
            zoom={13}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <RecenterMap lat={userLocation[0]} lng={userLocation[1]} />

            {/* Marcador da localização do usuário */}
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="text-center">
                  <Navigation size={20} className="mx-auto mb-1 text-primary" />
                  <strong>Você está aqui</strong>
                </div>
              </Popup>
            </Marker>

            {/* Marcadores dos comércios */}
            {filteredBusinesses.map((business) => (
              <Marker
                key={business.id}
                position={[business.latitude, business.longitude]}
                icon={businessIcon}
                eventHandlers={{
                  click: () => setSelectedBusiness(business),
                }}
              >
                <Popup>
                  <div className="min-w-[250px]">
                    {business.image_url && (
                      <img
                        src={business.image_url}
                        alt={business.name}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    )}
                    <h3 className="font-bold text-lg mb-1">{business.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{business.category}</p>
                    {business.rating && (
                      <div className="flex gap-1 mb-2">{renderStars(business.rating)}</div>
                    )}
                    <p className="text-sm mb-2">{business.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <MapPin size={12} />
                      {business.address}
                    </p>
                    {business.phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <Phone size={12} />
                        {business.phone}
                      </p>
                    )}
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <Globe size={12} />
                        Visitar site
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Card flutuante do comércio selecionado (Mobile) */}
          {selectedBusiness && (
            <div className="md:hidden absolute bottom-4 left-4 right-4 z-[1000]">
              <Card className="p-4 shadow-2xl">
                <div className="flex gap-3">
                  {selectedBusiness.image_url && (
                    <img
                      src={selectedBusiness.image_url}
                      alt={selectedBusiness.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-1">{selectedBusiness.name}</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      {selectedBusiness.category}
                    </p>
                    {selectedBusiness.rating && (
                      <div className="flex gap-1 mb-2">{renderStars(selectedBusiness.rating)}</div>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedBusiness.latitude},${selectedBusiness.longitude}`, '_blank')}
                    >
                      <Navigation size={16} className="mr-2" />
                      Como chegar
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalBusinessPage;
