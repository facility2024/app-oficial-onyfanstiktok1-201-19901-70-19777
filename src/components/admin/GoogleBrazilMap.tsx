import React, { useState, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Users, Search, Filter, Wifi, Monitor, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeviceStats {
  desktop: number;
  mobile: number;
}

interface StatePosition {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

interface GoogleBrazilMapProps {
  onlineUsersByState: { [state: string]: number };
  deviceStatsByState?: { [state: string]: DeviceStats };
  totalDeviceStats?: DeviceStats;
}

const STATE_POSITIONS: StatePosition[] = [
  // Norte
  { code: 'AC', name: 'Acre', lat: -9.0238, lng: -70.812, region: 'Norte' },
  { code: 'AP', name: 'Amapá', lat: 1.4099, lng: -51.7694, region: 'Norte' },
  { code: 'AM', name: 'Amazonas', lat: -3.4168, lng: -65.8561, region: 'Norte' },
  { code: 'PA', name: 'Pará', lat: -3.4168, lng: -49.5024, region: 'Norte' },
  { code: 'RO', name: 'Rondônia', lat: -10.8375, lng: -63.3692, region: 'Norte' },
  { code: 'RR', name: 'Roraima', lat: 2.7376, lng: -62.0751, region: 'Norte' },
  { code: 'TO', name: 'Tocantins', lat: -10.1753, lng: -48.2982, region: 'Norte' },
  // Nordeste
  { code: 'AL', name: 'Alagoas', lat: -9.5713, lng: -36.782, region: 'Nordeste' },
  { code: 'BA', name: 'Bahia', lat: -12.5797, lng: -41.7007, region: 'Nordeste' },
  { code: 'CE', name: 'Ceará', lat: -5.4984, lng: -39.3206, region: 'Nordeste' },
  { code: 'MA', name: 'Maranhão', lat: -4.9609, lng: -45.2744, region: 'Nordeste' },
  { code: 'PB', name: 'Paraíba', lat: -7.24, lng: -36.782, region: 'Nordeste' },
  { code: 'PE', name: 'Pernambuco', lat: -8.8137, lng: -36.9541, region: 'Nordeste' },
  { code: 'PI', name: 'Piauí', lat: -7.7183, lng: -42.7289, region: 'Nordeste' },
  { code: 'RN', name: 'Rio Grande do Norte', lat: -5.7945, lng: -36.354, region: 'Nordeste' },
  { code: 'SE', name: 'Sergipe', lat: -10.5741, lng: -37.3857, region: 'Nordeste' },
  // Centro-Oeste
  { code: 'GO', name: 'Goiás', lat: -15.827, lng: -49.8362, region: 'Centro-Oeste' },
  { code: 'MT', name: 'Mato Grosso', lat: -12.6819, lng: -56.9211, region: 'Centro-Oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', lat: -20.7722, lng: -54.7852, region: 'Centro-Oeste' },
  { code: 'DF', name: 'Distrito Federal', lat: -15.7998, lng: -47.8645, region: 'Centro-Oeste' },
  // Sudeste
  { code: 'ES', name: 'Espírito Santo', lat: -19.1834, lng: -40.3089, region: 'Sudeste' },
  { code: 'MG', name: 'Minas Gerais', lat: -18.5122, lng: -44.555, region: 'Sudeste' },
  { code: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, region: 'Sudeste' },
  { code: 'SP', name: 'São Paulo', lat: -23.5505, lng: -46.6333, region: 'Sudeste' },
  // Sul
  { code: 'PR', name: 'Paraná', lat: -25.2521, lng: -52.0215, region: 'Sul' },
  { code: 'RS', name: 'Rio Grande do Sul', lat: -30.0346, lng: -51.2177, region: 'Sul' },
  { code: 'SC', name: 'Santa Catarina', lat: -27.2423, lng: -50.2189, region: 'Sul' },
];

const REGION_COLORS: Record<string, { hex: string; text: string; dot: string }> = {
  Norte:          { hex: '#10b981', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  Nordeste:       { hex: '#ef4444', text: 'text-red-400', dot: 'bg-red-500' },
  'Centro-Oeste': { hex: '#f59e0b', text: 'text-amber-400', dot: 'bg-amber-500' },
  Sudeste:        { hex: '#facc15', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  Sul:            { hex: '#8b5cf6', text: 'text-violet-400', dot: 'bg-violet-500' },
};

const REGIONS = ['Todas', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const mapContainerStyle = { width: '100%', height: '500px' };
const center = { lat: -14.235, lng: -51.9253 };
const mapOptions = {
  mapTypeId: 'roadmap' as const,
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

// Create colored pin SVG as data URI
function createPinSvg(color: string, hasUsers: boolean, count: number): string {
  const size = hasUsers ? (count > 5 ? 32 : 24) : 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2" opacity="${hasUsers ? 1 : 0.4}"/>
    <circle cx="12" cy="12" r="3" fill="white" opacity="0.9"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const GoogleBrazilMap = ({ onlineUsersByState, deviceStatsByState = {}, totalDeviceStats = { desktop: 0, mobile: 0 } }: GoogleBrazilMapProps) => {
  const [selectedState, setSelectedState] = useState<StatePosition | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredState, setHoveredState] = useState<StatePosition | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
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

  if (loadError) {
    return (
      <div className="text-center py-8 text-destructive">
        Erro ao carregar Google Maps. Verifique a API Key.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* Filters */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Google Map */}
        <Card className="lg:col-span-2 bg-gradient-card border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {!isLoaded ? (
              <div className="flex items-center justify-center" style={{ height: 500 }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={4}
                options={mapOptions}
              >
                {filteredStates.map((state) => {
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

                {selectedState && (
                  <InfoWindowF
                    position={{ lat: selectedState.lat, lng: selectedState.lng }}
                    onCloseClick={() => setSelectedState(null)}
                  >
                    <div className="p-1 min-w-[150px]">
                      <div className="font-bold text-sm text-gray-900">
                        {selectedState.name} ({selectedState.code})
                      </div>
                      <div className="text-xs text-gray-500">{selectedState.region}</div>
                      {getCount(selectedState.name) > 0 ? (
                        <>
                          <div className="font-semibold text-emerald-600 mt-1">
                            🟢 {getCount(selectedState.name)} usuário{getCount(selectedState.name) > 1 ? 's' : ''} online
                          </div>
                          <div className="flex gap-3 mt-1 text-xs">
                            {(deviceStatsByState[selectedState.name]?.desktop || 0) > 0 && (
                              <span className="text-blue-600">🖥️ {deviceStatsByState[selectedState.name].desktop} desktop</span>
                            )}
                            {(deviceStatsByState[selectedState.name]?.mobile || 0) > 0 && (
                              <span className="text-orange-600">📱 {deviceStatsByState[selectedState.name].mobile} mobile</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400 mt-1 text-xs">Nenhum usuário online</div>
                      )}
                    </div>
                  </InfoWindowF>
                )}
              </GoogleMap>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: online user list */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Usuários por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[440px] overflow-y-auto space-y-1 pr-1">
            <AnimatePresence mode="popLayout">
              {sortedOnlineStates.map((state) => {
                const colors = REGION_COLORS[state.region];
                return (
                  <motion.div
                    key={state.code}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer
                      ${hoveredState?.code === state.code ? 'bg-primary/10' : 'hover:bg-muted/40'}
                      ${state.count > 0 ? '' : 'opacity-50'}`}
                    onMouseEnter={() => setHoveredState(state)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => setSelectedState(state)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${state.count > 0 ? colors.dot : 'bg-gray-500'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{state.name}</div>
                        <div className="text-[10px] text-muted-foreground">{state.region}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {state.count > 0 && (
                        <>
                          {(deviceStatsByState[state.name]?.desktop || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                              <Monitor className="w-3 h-3" />
                              {deviceStatsByState[state.name].desktop}
                            </span>
                          )}
                          {(deviceStatsByState[state.name]?.mobile || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                              <Smartphone className="w-3 h-3" />
                              {deviceStatsByState[state.name].mobile}
                            </span>
                          )}
                        </>
                      )}
                      <Badge
                        variant={state.count > 0 ? 'default' : 'secondary'}
                        className={`text-[10px] px-1.5 py-0 h-5 ${state.count > 0 ? 'bg-emerald-600 text-white' : ''}`}
                      >
                        {state.count}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {sortedOnlineStates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Nenhum estado encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
