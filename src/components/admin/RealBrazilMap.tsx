import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MapPin, Eye, TrendingUp } from 'lucide-react';
import L from 'leaflet';

// Fix para ícones do Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
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

interface RealBrazilMapProps {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
}

// Coordenadas reais dos centros dos estados brasileiros
const stateCoordinates: Record<string, { lat: number; lng: number; capital: string }> = {
  'São Paulo': { lat: -23.5505, lng: -46.6333, capital: 'São Paulo' },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729, capital: 'Rio de Janeiro' },
  'Minas Gerais': { lat: -19.9167, lng: -43.9345, capital: 'Belo Horizonte' },
  'Bahia': { lat: -12.9714, lng: -38.5014, capital: 'Salvador' },
  'Paraná': { lat: -25.4244, lng: -49.2654, capital: 'Curitiba' },
  'Rio Grande do Sul': { lat: -30.0346, lng: -51.2177, capital: 'Porto Alegre' },
  'Pernambuco': { lat: -8.0476, lng: -34.8770, capital: 'Recife' },
  'Ceará': { lat: -3.7327, lng: -38.5267, capital: 'Fortaleza' },
  'Pará': { lat: -1.4558, lng: -48.5044, capital: 'Belém' },
  'Santa Catarina': { lat: -27.2423, lng: -50.2189, capital: 'Florianópolis' },
  'Maranhão': { lat: -2.5387, lng: -44.2825, capital: 'São Luís' },
  'Goiás': { lat: -16.6869, lng: -49.2648, capital: 'Goiânia' },
  'Amazonas': { lat: -3.1190, lng: -60.0217, capital: 'Manaus' },
  'Espírito Santo': { lat: -20.3155, lng: -40.3128, capital: 'Vitória' },
  'Paraíba': { lat: -7.2448, lng: -35.7089, capital: 'João Pessoa' },
  'Rondônia': { lat: -8.7612, lng: -63.8772, capital: 'Porto Velho' },
  'Piauí': { lat: -8.2832, lng: -42.8016, capital: 'Teresina' },
  'Alagoas': { lat: -9.5713, lng: -36.7820, capital: 'Maceió' },
  'Distrito Federal': { lat: -15.8267, lng: -47.9218, capital: 'Brasília' },
  'Mato Grosso do Sul': { lat: -20.4697, lng: -54.6201, capital: 'Campo Grande' },
  'Mato Grosso': { lat: -15.6014, lng: -56.0979, capital: 'Cuiabá' },
  'Rio Grande do Norte': { lat: -5.2240, lng: -36.1539, capital: 'Natal' },
  'Sergipe': { lat: -10.9472, lng: -37.0731, capital: 'Aracaju' },
  'Tocantins': { lat: -10.1753, lng: -48.2982, capital: 'Palmas' },
  'Acre': { lat: -8.7672, lng: -70.5515, capital: 'Rio Branco' },
  'Amapá': { lat: 1.4144, lng: -51.7865, capital: 'Macapá' },
  'Roraima': { lat: 2.7376, lng: -62.0751, capital: 'Boa Vista' }
};


export const RealBrazilMap = ({ statesData, currentLocation, totalUsers }: RealBrazilMapProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Top 3 estados
  const topStates = statesData.slice(0, 3);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header do mapa com informações principais */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="text-lg">🇧🇷</div>
          <div>
            <h3 className="font-semibold text-sm">Brasil - Distribuição em Tempo Real</h3>
            <p className="text-xs text-muted-foreground">Mapa interativo com zoom e navegação</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="destructive" className="animate-pulse">
            🔴 {totalUsers.toLocaleString()} usuários online
          </Badge>
          
          {currentLocation && (
            <Badge variant="secondary">
              📍 {currentLocation.state}
            </Badge>
          )}
        </div>
      </div>

      {/* Container do mapa real */}
      <div className="flex-1 relative">
        <MapContainer 
          center={[-14.2350, -51.9253]} 
          zoom={4} 
          className="w-full h-full" 
          style={{ minHeight: '400px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {statesData.map(state => {
            const coordinates = stateCoordinates[state.state];
            if (!coordinates) return null;

            const isCurrentLocation = currentLocation?.state === state.state;
            const size = Math.min(Math.max(state.count / 50, 25), 50);
            let color = 'hsl(217 91% 60%)';
            
            if (isCurrentLocation) {
              color = 'hsl(142 76% 36%)';
            } else if (state.count > 500) {
              color = 'hsl(0 84% 60%)';
            } else if (state.count > 200) {
              color = 'hsl(45 93% 58%)';
            }

            const customIcon = L.divIcon({
              html: `
                <div style="
                  width: ${size}px;
                  height: ${size}px;
                  background-color: ${color};
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: ${Math.max(size / 4, 10)}px;
                  position: relative;
                  ${isCurrentLocation ? 'animation: pulse 2s infinite;' : ''}
                ">
                  ${state.count > 999 ? '999+' : state.count}
                  ${isCurrentLocation ? '<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: #fbbf24; border: 2px solid white; border-radius: 50%;"></div>' : ''}
                </div>
              `,
              className: 'custom-div-icon',
              iconSize: [size, size],
              iconAnchor: [size/2, size/2]
            });
            
            return (
              <Marker 
                key={state.state}
                position={[coordinates.lat, coordinates.lng]} 
                icon={customIcon}
              >
                <Popup>
                  <div style={{ minWidth: '200px', fontFamily: 'system-ui' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{state.state}</h3>
                      {isCurrentLocation && (
                        <span style={{ background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                          📍 SEU ESTADO
                        </span>
                      )}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Capital:</strong> {coordinates.capital}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Usuários Online:</strong> {state.count.toLocaleString()}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Percentual:</strong> {state.percentage}%
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Densidade:</strong> 
                      <span style={{ color: state.count > 500 ? '#ef4444' : state.count > 200 ? '#f59e0b' : '#3b82f6' }}>
                        {state.count > 500 ? '🔴 Alta' : state.count > 200 ? '🟡 Média' : '🔵 Baixa'}
                      </span>
                    </div>
                    <div style={{ padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px', color: '#6b7280' }}>
                      🔴 AO VIVO • Total Brasil: {totalUsers.toLocaleString()} usuários
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Controles flutuantes */}
        <div className="absolute top-4 left-4 space-y-2">
          {/* Botão de informações detalhadas */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-primary/90 hover:bg-primary text-primary-foreground backdrop-blur-sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Estados com Mais Usuários Logados
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Estados com Mais Usuários Logados</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Top 3 Estados */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">🏆 Top 3 Estados</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topStates.map((state, index) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const colors = ['bg-yellow-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200'];
                      
                      return (
                        <div key={state.state} className={`p-4 rounded-lg border-2 ${colors[index]}`}>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-2xl">{medals[index]}</span>
                            <h5 className="font-semibold">{state.state}</h5>
                            {currentLocation?.state === state.state && (
                              <Badge variant="secondary" className="text-xs">📍</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Usuários:</span>
                              <span className="font-bold">{state.count.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Percentual:</span>
                              <span className="font-bold">{state.percentage}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Posição:</span>
                              <span className="font-bold">{index + 1}º lugar</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Outros Estados */}
                {statesData.length > 3 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">📊 Outros Estados Detectados ({statesData.length - 3})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {statesData.slice(3).map((state, index) => (
                        <div key={state.state} className="p-3 bg-muted/50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-medium text-sm">{state.state}</h6>
                            {currentLocation?.state === state.state && (
                              <Badge variant="secondary" className="text-xs">📍</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Usuários:</span>
                              <div className="font-semibold">{state.count.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Percentual:</span>
                              <div className="font-semibold">{state.percentage}%</div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">Posição: </span>
                            <span className="font-semibold">{index + 4}º lugar</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status da Localização */}
                {currentLocation ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Sua Localização Detectada</h4>
                    </div>
                    <p className="text-green-700">
                      ✅ Seu estado (<strong>{currentLocation.state}</strong>) foi registrado com sucesso e está sendo monitorado em tempo real.
                    </p>
                    {currentLocation.city && (
                      <p className="text-sm text-green-600 mt-1">
                        📍 Cidade detectada: {currentLocation.city}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-800">Detectando Localização</h4>
                    </div>
                    <p className="text-yellow-700">
                      ⏳ Estamos detectando sua localização para incluí-lo nas estatísticas em tempo real...
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Legenda flutuante */}
        <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <h4 className="font-semibold text-xs mb-2">Legenda</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
              <span>Alta densidade (500+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white"></div>
              <span>Média densidade (200+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
              <span>Baixa densidade (&lt;200)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white relative">
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white"></div>
              </div>
              <span>📍 Sua localização</span>
            </div>
          </div>
        </div>

        {/* Instruções de uso */}
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg max-w-xs">
          <div className="text-xs space-y-1">
            <div className="font-semibold">🗺️ Como usar:</div>
            <div>• Clique e arraste para mover</div>
            <div>• Use scroll para zoom</div>
            <div>• Clique nos pinos para detalhes</div>
          </div>
        </div>
      </div>
    </div>
  );
};