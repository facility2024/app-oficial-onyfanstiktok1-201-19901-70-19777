import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MapPin } from 'lucide-react';
import L from 'leaflet';

// Import dos ícones do Leaflet
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Configuração dos ícones
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface StateData {
  state: string;
  count: number;
  percentage: string;
}

interface CurrentLocation {
  state: string;
  city: string;
  lat?: number;
  lng?: number;
}

interface FixedMapProps {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
}

// Coordenadas simplificadas dos principais estados
const stateCoordinates: Record<string, { lat: number; lng: number }> = {
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Minas Gerais': { lat: -19.9167, lng: -43.9345 },
  'Bahia': { lat: -12.9714, lng: -38.5014 },
  'Paraná': { lat: -25.4244, lng: -49.2654 },
  'Rio Grande do Sul': { lat: -30.0346, lng: -51.2177 },
  'Pernambuco': { lat: -8.0476, lng: -34.8770 },
  'Ceará': { lat: -3.7327, lng: -38.5267 },
  'Pará': { lat: -1.4558, lng: -48.5044 },
  'Santa Catarina': { lat: -27.2423, lng: -50.2189 },
  'Goiás': { lat: -16.6869, lng: -49.2648 },
  'Amazonas': { lat: -3.1190, lng: -60.0217 },
  'Distrito Federal': { lat: -15.8267, lng: -47.9218 }
};

export const FixedMap = ({ statesData, currentLocation, totalUsers }: FixedMapProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header do mapa */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="text-lg">🇧🇷</div>
          <div>
            <h3 className="font-semibold text-sm">Mapa do Brasil - Usuários Online</h3>
            <p className="text-xs text-muted-foreground">Distribuição em tempo real</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="destructive" className="animate-pulse text-xs">
            🔴 {totalUsers.toLocaleString()} online
          </Badge>
          
          {currentLocation && (
            <Badge variant="secondary" className="text-xs">
              📍 {currentLocation.state}
            </Badge>
          )}
        </div>
      </div>

      {/* Container do mapa - agora ocupando todo o espaço */}
      <div className="flex-1 relative min-h-[400px]">
        <MapContainer 
          center={[-14.235, -51.925]} 
          zoom={4} 
          className="w-full h-full rounded-lg"
          style={{ minHeight: '400px', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {statesData.map(state => {
            const coordinates = stateCoordinates[state.state];
            if (!coordinates) return null;

            const isCurrentLocation = currentLocation?.state === state.state;
            
            return (
              <Marker 
                key={state.state}
                position={[coordinates.lat, coordinates.lng]}
              >
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{state.state}</h4>
                      {isCurrentLocation && (
                        <span style={{ background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                          📍 VOCÊ ESTÁ AQUI
                        </span>
                      )}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Usuários Online:</strong> {state.count.toLocaleString()}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Percentual:</strong> {state.percentage}%
                    </div>
                    <div style={{ padding: '6px', background: '#f3f4f6', borderRadius: '4px', fontSize: '11px', textAlign: 'center' }}>
                      🔴 AO VIVO • Total Brasil: {totalUsers.toLocaleString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Botões flutuantes */}
        <div className="absolute top-4 left-4 space-y-2">
          {/* Botão para ver cards dos estados */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                <Users className="w-4 h-4 mr-2" />
                Ver Estados (Cards)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2 text-lg">
                  <Users className="w-5 h-5" />
                  <span>Estados do Brasil - Ranking de Usuários Online</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                {/* Top 3 Estados em destaque */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    🏆 Top 3 Estados
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statesData.slice(0, 3).map((state, index) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const colors = ['bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300', 
                                     'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300', 
                                     'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300'];
                      const isCurrentLocation = currentLocation?.state === state.state;
                      
                      return (
                        <div key={state.state} className={`p-6 rounded-xl border-2 ${colors[index]} ${isCurrentLocation ? 'ring-2 ring-green-500' : ''} transition-all duration-300 hover:scale-105 shadow-lg`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-3xl">{medals[index]}</span>
                              <div>
                                <h5 className="font-bold text-lg">{state.state}</h5>
                                <p className="text-sm text-muted-foreground">#{index + 1} no ranking</p>
                              </div>
                            </div>
                            {isCurrentLocation && (
                              <Badge variant="secondary" className="animate-pulse">
                                📍 Você está aqui
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-muted-foreground">Usuários Online:</span>
                              <span className="text-xl font-bold text-primary">{state.count.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-muted-foreground">Percentual:</span>
                              <span className="text-lg font-bold text-accent">{state.percentage}%</span>
                            </div>

                            {/* Barra de progresso */}
                            <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                              <div 
                                className={`h-3 rounded-full transition-all duration-1000 ${
                                  isCurrentLocation ? 'bg-green-500' : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(parseFloat(state.percentage), 100)}%` }}
                              ></div>
                            </div>

                            <div className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${
                              state.count > 500 
                                ? 'bg-red-100 text-red-700' 
                                : state.count > 200 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-blue-100 text-blue-700'
                            }`}>
                              {state.count > 500 ? '🔴 Alta Densidade' : state.count > 200 ? '🟡 Média Densidade' : '🔵 Baixa Densidade'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Outros Estados em grid */}
                {statesData.length > 3 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      📊 Outros Estados ({statesData.length - 3})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {statesData.slice(3).map((state, index) => {
                        const isCurrentLocation = currentLocation?.state === state.state;
                        
                        return (
                          <div key={state.state} className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                            isCurrentLocation 
                              ? 'bg-green-50 border-green-300 shadow-lg' 
                              : 'bg-muted/30 border-border hover:border-primary/50'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-muted-foreground">#{index + 4}</span>
                                <div>
                                  <h6 className="font-semibold">{state.state}</h6>
                                </div>
                              </div>
                              {isCurrentLocation && (
                                <Badge variant="secondary" className="text-xs">📍</Badge>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Usuários:</span>
                                <span className="font-bold text-sm">{state.count.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Percentual:</span>
                                <span className="font-bold text-sm text-primary">{state.percentage}%</span>
                              </div>
                              
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    isCurrentLocation ? 'bg-green-500' : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(parseFloat(state.percentage), 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resumo geral */}
                <div className="mt-6 p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20">
                  <div className="text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <h4 className="text-xl font-bold mb-4">Estatísticas Gerais do Brasil</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white/50 p-3 rounded-lg">
                        <div className="font-bold text-lg text-primary">{statesData.length}</div>
                        <div className="text-muted-foreground">Estados Detectados</div>
                      </div>
                      <div className="bg-white/50 p-3 rounded-lg">
                        <div className="font-bold text-lg text-success">{totalUsers.toLocaleString()}</div>
                        <div className="text-muted-foreground">Usuários Online</div>
                      </div>
                      <div className="bg-white/50 p-3 rounded-lg">
                        {currentLocation ? (
                          <>
                            <div className="font-bold text-lg text-green-600">✅ Detectado</div>
                            <div className="text-muted-foreground">{currentLocation.city}, {currentLocation.state}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-lg text-yellow-600">⏳ Detectando</div>
                            <div className="text-muted-foreground">Sua Localização</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Legenda */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm">
          <div className="text-xs space-y-1">
            <div className="font-semibold">📍 Legenda:</div>
            <div>• Clique nos marcadores</div>
            <div>• Arraste para navegar</div>
            <div>• Scroll para zoom</div>
          </div>
        </div>
      </div>
    </div>
  );
};