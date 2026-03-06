import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Users, Search, Filter, Wifi, Monitor, Smartphone, Flame, Layers, Store, Clock, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeatmapOverlay } from './map/MapHeatmapLayer';
import { MapClustererLayer } from './map/MapClusterer';
import { MapBusinessPins } from './map/MapBusinessPins';
import { MapTimeline } from './map/MapTimeline';
import { MapAuthFallback } from './map/MapAuthFallback';


// --- Types ---
interface DeviceStats { desktop: number; mobile: number; }
interface StatePosition { code: string; name: string; lat: number; lng: number; region: string; }

interface GoogleBrazilMapProps {
  onlineUsersByState: { [state: string]: number };
  deviceStatsByState?: { [state: string]: DeviceStats };
  totalDeviceStats?: DeviceStats;
}

// --- Constants ---
const STATE_POSITIONS: StatePosition[] = [
  { code: 'AC', name: 'Acre', lat: -9.0238, lng: -70.812, region: 'Norte' },
  { code: 'AP', name: 'Amapá', lat: 1.4099, lng: -51.7694, region: 'Norte' },
  { code: 'AM', name: 'Amazonas', lat: -3.4168, lng: -65.8561, region: 'Norte' },
  { code: 'PA', name: 'Pará', lat: -3.4168, lng: -49.5024, region: 'Norte' },
  { code: 'RO', name: 'Rondônia', lat: -10.8375, lng: -63.3692, region: 'Norte' },
  { code: 'RR', name: 'Roraima', lat: 2.7376, lng: -62.0751, region: 'Norte' },
  { code: 'TO', name: 'Tocantins', lat: -10.1753, lng: -48.2982, region: 'Norte' },
  { code: 'AL', name: 'Alagoas', lat: -9.5713, lng: -36.782, region: 'Nordeste' },
  { code: 'BA', name: 'Bahia', lat: -12.5797, lng: -41.7007, region: 'Nordeste' },
  { code: 'CE', name: 'Ceará', lat: -5.4984, lng: -39.3206, region: 'Nordeste' },
  { code: 'MA', name: 'Maranhão', lat: -4.9609, lng: -45.2744, region: 'Nordeste' },
  { code: 'PB', name: 'Paraíba', lat: -7.24, lng: -36.782, region: 'Nordeste' },
  { code: 'PE', name: 'Pernambuco', lat: -8.8137, lng: -36.9541, region: 'Nordeste' },
  { code: 'PI', name: 'Piauí', lat: -7.7183, lng: -42.7289, region: 'Nordeste' },
  { code: 'RN', name: 'Rio Grande do Norte', lat: -5.7945, lng: -36.354, region: 'Nordeste' },
  { code: 'SE', name: 'Sergipe', lat: -10.5741, lng: -37.3857, region: 'Nordeste' },
  { code: 'GO', name: 'Goiás', lat: -15.827, lng: -49.8362, region: 'Centro-Oeste' },
  { code: 'MT', name: 'Mato Grosso', lat: -12.6819, lng: -56.9211, region: 'Centro-Oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', lat: -20.7722, lng: -54.7852, region: 'Centro-Oeste' },
  { code: 'DF', name: 'Distrito Federal', lat: -15.7998, lng: -47.8645, region: 'Centro-Oeste' },
  { code: 'ES', name: 'Espírito Santo', lat: -19.1834, lng: -40.3089, region: 'Sudeste' },
  { code: 'MG', name: 'Minas Gerais', lat: -18.5122, lng: -44.555, region: 'Sudeste' },
  { code: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, region: 'Sudeste' },
  { code: 'SP', name: 'São Paulo', lat: -23.5505, lng: -46.6333, region: 'Sudeste' },
  { code: 'PR', name: 'Paraná', lat: -25.2521, lng: -52.0215, region: 'Sul' },
  { code: 'RS', name: 'Rio Grande do Sul', lat: -30.0346, lng: -51.2177, region: 'Sul' },
  { code: 'SC', name: 'Santa Catarina', lat: -27.2423, lng: -50.2189, region: 'Sul' },
];

const REGION_COLORS: Record<string, { hex: string; dot: string }> = {
  Norte:          { hex: '#10b981', dot: 'bg-emerald-500' },
  Nordeste:       { hex: '#ef4444', dot: 'bg-red-500' },
  'Centro-Oeste': { hex: '#f59e0b', dot: 'bg-amber-500' },
  Sudeste:        { hex: '#facc15', dot: 'bg-yellow-400' },
  Sul:            { hex: '#8b5cf6', dot: 'bg-violet-500' },
};

const REGIONS = ['Todas', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const LIBRARIES: ('visualization')[] = ['visualization'];

const mapOptions: google.maps.MapOptions = {
  mapTypeId: 'roadmap',
  zoom: 4,
  minZoom: 3,
  maxZoom: 12,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4a5568' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#2d3748' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { featureType: 'road', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
  restriction: {
    latLngBounds: { north: 6, south: -35, west: -75, east: -30 },
    strictBounds: false,
  },
};

const center = { lat: -14.235, lng: -51.9253 };

function createPinSvg(color: string, hasUsers: boolean, count: number): string {
  const size = hasUsers ? (count > 5 ? 32 : 24) : 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2" opacity="${hasUsers ? 1 : 0.4}"/>
    <circle cx="12" cy="12" r="3" fill="white" opacity="0.9"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// --- Component ---
export const GoogleBrazilMap = ({ onlineUsersByState, deviceStatsByState = {}, totalDeviceStats = { desktop: 0, mobile: 0 } }: GoogleBrazilMapProps) => {
  const [selectedState, setSelectedState] = useState<StatePosition | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredState, setHoveredState] = useState<StatePosition | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  // Layer toggles
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClusters, setShowClusters] = useState(false);
  const [showBusinesses, setShowBusinesses] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [googleAuthFailed, setGoogleAuthFailed] = useState(false);

  // Timeline state
  const [timelineHour, setTimelineHour] = useState(new Date().getHours());

  useEffect(() => {
    const mapsWindow = window as Window & { gm_authFailure?: () => void };
    const previousAuthFailureHandler = mapsWindow.gm_authFailure;

    mapsWindow.gm_authFailure = () => {
      setGoogleAuthFailed(true);
      previousAuthFailureHandler?.();
    };

    return () => {
      mapsWindow.gm_authFailure = previousAuthFailureHandler;
    };
  }, []);

  const handleGeocodeBusinesses = useCallback(async () => {
    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-businesses');
      if (error) throw error;
      toast({
        title: '📍 Geocodificação concluída',
        description: `${data.updated} de ${data.total} comércios atualizados com coordenadas.`,
      });
      // Toggle businesses off/on to refresh pins
      setShowBusinesses(false);
      setTimeout(() => setShowBusinesses(true), 500);
    } catch (err) {
      toast({ title: '❌ Erro na geocodificação', description: String(err), variant: 'destructive' });
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const getCount = useCallback((name: string) => onlineUsersByState[name] || 0, [onlineUsersByState]);

  const totalOnline = useMemo(
    () => Object.values(onlineUsersByState).reduce((s, c) => s + c, 0),
    [onlineUsersByState]
  );

  const activeStates = useMemo(
    () => Object.entries(onlineUsersByState).filter(([, c]) => c > 0).length,
    [onlineUsersByState]
  );

  const filteredStates = useMemo(() => {
    return STATE_POSITIONS.filter((s) => {
      const regionMatch = selectedRegion === 'Todas' || s.region === selectedRegion;
      const searchMatch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
      return regionMatch && searchMatch;
    });
  }, [selectedRegion, searchQuery]);

  const sortedOnlineStates = useMemo(() => {
    return STATE_POSITIONS
      .map((s) => ({ ...s, count: getCount(s.name) }))
      .filter((s) => {
        const regionMatch = selectedRegion === 'Todas' || s.region === selectedRegion;
        const searchMatch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
        return regionMatch && searchMatch;
      })
      .sort((a, b) => b.count - a.count);
  }, [onlineUsersByState, selectedRegion, searchQuery, getCount]);

  // Heatmap data points
  const heatmapPoints = useMemo(() => {
    return STATE_POSITIONS
      .filter((s) => getCount(s.name) > 0)
      .map((s) => ({ lat: s.lat, lng: s.lng, weight: getCount(s.name) }));
  }, [getCount]);

  // Cluster points
  const clusterPoints = useMemo(() => {
    return STATE_POSITIONS.map((s) => ({ lat: s.lat, lng: s.lng, label: s.name, count: getCount(s.name) }));
  }, [getCount]);

  const handleTimelineChange = useCallback((hour: number, events: any[]) => {
    setTimelineHour(hour);
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  const hasGoogleMapError = Boolean(loadError) || googleAuthFailed;
  const keyPreview = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : 'chave ausente';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'origem desconhecida';

  if (loadError) {
    return (
      <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
        <p className="font-medium text-destructive">Erro ao carregar Google Maps</p>
        <p className="text-muted-foreground">Origem atual: {currentOrigin}</p>
        <p className="text-muted-foreground">Chave ativa: {keyPreview}</p>
        <p className="text-muted-foreground">Detalhe: {loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Carregando Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-600/80 text-white gap-1.5 px-3 py-1">
          <Wifi className="w-3 h-3" />
          {totalOnline} online
        </Badge>
        <Badge variant="outline" className="border-primary/40 text-primary gap-1.5 px-3 py-1">
          <MapPin className="w-3 h-3" />
          {activeStates} estados ativos
        </Badge>
        <Badge variant="outline" className="border-blue-400/40 text-blue-400 gap-1.5 px-3 py-1">
          <Monitor className="w-3 h-3" />
          {totalDeviceStats.desktop} desktop
        </Badge>
        <Badge variant="outline" className="border-orange-400/40 text-orange-400 gap-1.5 px-3 py-1">
          <Smartphone className="w-3 h-3" />
          {totalDeviceStats.mobile} mobile
        </Badge>
      </div>

      {/* Filters + Layer toggles */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 bg-background/50"
          />
        </div>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full sm:w-44 h-9 bg-background/50">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Layer toggle buttons */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={showHeatmap ? 'default' : 'outline'}
          className={`h-7 text-[11px] gap-1 ${showHeatmap ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}`}
          onClick={() => setShowHeatmap(!showHeatmap)}
        >
          <Flame className="w-3 h-3" />
          Heatmap
        </Button>
        <Button
          size="sm"
          variant={showClusters ? 'default' : 'outline'}
          className={`h-7 text-[11px] gap-1 ${showClusters ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : ''}`}
          onClick={() => setShowClusters(!showClusters)}
        >
          <Layers className="w-3 h-3" />
          Clusters
        </Button>
        <Button
          size="sm"
          variant={showBusinesses ? 'default' : 'outline'}
          className={`h-7 text-[11px] gap-1 ${showBusinesses ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : ''}`}
          onClick={() => setShowBusinesses(!showBusinesses)}
        >
          <Store className="w-3 h-3" />
          Comércios
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`h-7 text-[11px] gap-1 ${isGeocoding ? 'animate-pulse' : ''}`}
          onClick={handleGeocodeBusinesses}
          disabled={isGeocoding}
        >
          <Navigation className="w-3 h-3" />
          {isGeocoding ? 'Geocodificando...' : 'Geocodificar'}
        </Button>
        <Button
          size="sm"
          variant={showTimeline ? 'default' : 'outline'}
          className={`h-7 text-[11px] gap-1 ${showTimeline ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600' : ''}`}
          onClick={() => setShowTimeline(!showTimeline)}
        >
          <Clock className="w-3 h-3" />
          Timeline 24h
        </Button>
      </div>

      {/* Google Map */}
      <Card className="bg-gradient-card border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {hasGoogleMapError ? (
            <MapAuthFallback currentOrigin={currentOrigin} keyPreview={keyPreview} />
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '520px' }}
              center={center}
              zoom={4}
              options={mapOptions}
              onLoad={onMapLoad}
            >
              {/* Default markers (hidden when clusters active) */}
              {!showClusters && filteredStates.map((state) => {
                const count = getCount(state.name);
                const hasUsers = count > 0;
                const colors = REGION_COLORS[state.region];
                return (
                  <MarkerF
                    key={state.code}
                    position={{ lat: state.lat, lng: state.lng }}
                    icon={{
                      url: createPinSvg(colors.hex, hasUsers, count),
                      scaledSize: new google.maps.Size(
                        hasUsers ? (count > 5 ? 32 : 24) : 14,
                        hasUsers ? (count > 5 ? 32 : 24) : 14
                      ),
                      anchor: new google.maps.Point(
                        (hasUsers ? (count > 5 ? 16 : 12) : 7),
                        (hasUsers ? (count > 5 ? 16 : 12) : 7)
                      ),
                    }}
                    onClick={() => setSelectedState(state)}
                  />
                );
              })}

              {/* InfoWindow */}
              {selectedState && (
                <InfoWindowF
                  position={{ lat: selectedState.lat, lng: selectedState.lng }}
                  onCloseClick={() => setSelectedState(null)}
                >
                  <div className="p-1 min-w-[150px]">
                    <div className="font-bold text-sm" style={{ color: '#111' }}>
                      {selectedState.name} ({selectedState.code})
                    </div>
                    <div className="text-xs" style={{ color: '#666' }}>{selectedState.region}</div>
                    {getCount(selectedState.name) > 0 ? (
                      <>
                        <div className="font-semibold mt-1" style={{ color: '#059669' }}>
                          🟢 {getCount(selectedState.name)} usuário{getCount(selectedState.name) > 1 ? 's' : ''} online
                        </div>
                        <div className="flex gap-3 mt-1 text-xs">
                          {(deviceStatsByState[selectedState.name]?.desktop || 0) > 0 && (
                            <span style={{ color: '#2563eb' }}>🖥️ {deviceStatsByState[selectedState.name].desktop} desktop</span>
                          )}
                          {(deviceStatsByState[selectedState.name]?.mobile || 0) > 0 && (
                            <span style={{ color: '#ea580c' }}>📱 {deviceStatsByState[selectedState.name].mobile} mobile</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-xs" style={{ color: '#999' }}>Nenhum usuário online</div>
                    )}
                  </div>
                </InfoWindowF>
              )}

              {/* Heatmap Layer */}
              <HeatmapOverlay map={mapRef} points={heatmapPoints} visible={showHeatmap} />

              {/* Business Pins */}
              <MapBusinessPins visible={showBusinesses} />
            </GoogleMap>
          )}

          {/* Clusterer (rendered outside GoogleMap children to avoid re-render issues) */}
          {!hasGoogleMapError && isLoaded && (
            <MapClustererLayer
              map={mapRef}
              points={clusterPoints}
              visible={showClusters}
              onMarkerClick={(point) => {
                const state = STATE_POSITIONS.find(s => s.name === point.label);
                if (state) setSelectedState(state);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <MapTimeline visible={showTimeline} onHourChange={handleTimelineChange} />

      {/* Bottom horizontal banner - States */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max px-1">
          <AnimatePresence mode="popLayout">
            {sortedOnlineStates.map((state) => {
              const colors = REGION_COLORS[state.region];
              return (
                <motion.div
                  key={state.code}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border border-border/50 bg-card min-w-[80px] cursor-pointer transition-colors
                    ${hoveredState?.code === state.code ? 'bg-primary/10 border-primary/40' : 'hover:bg-muted/40'}
                    ${state.count > 0 ? '' : 'opacity-40'}`}
                  onMouseEnter={() => setHoveredState(state)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => setSelectedState(state)}
                >
                  <div className={`w-3 h-3 rounded-full ${state.count > 0 ? colors.dot : 'bg-muted-foreground/40'}`} />
                  <span className="text-[11px] font-semibold">{state.code}</span>
                  <span className="text-[9px] text-muted-foreground">{state.region}</span>
                  <Badge
                    variant={state.count > 0 ? 'default' : 'secondary'}
                    className={`text-[10px] px-1.5 py-0 h-5 ${state.count > 0 ? 'bg-emerald-600 text-white' : ''}`}
                  >
                    {state.count}
                  </Badge>
                  {state.count > 0 && (
                    <div className="flex gap-1">
                      {(deviceStatsByState[state.name]?.desktop || 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-blue-400">
                          <Monitor className="w-2.5 h-2.5" />{deviceStatsByState[state.name].desktop}
                        </span>
                      )}
                      {(deviceStatsByState[state.name]?.mobile || 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-orange-400">
                          <Smartphone className="w-2.5 h-2.5" />{deviceStatsByState[state.name].mobile}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {sortedOnlineStates.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-xs w-full">
              Nenhum estado encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
