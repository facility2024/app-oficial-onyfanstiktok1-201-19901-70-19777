import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MapPin } from 'lucide-react';

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

interface SimpleMapViewProps {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
}

export const SimpleMapView = ({ statesData, currentLocation, totalUsers }: SimpleMapViewProps) => {
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

      {/* Container do mapa visual do Brasil */}
      <div className="flex-1 relative min-h-[400px] bg-gradient-to-br from-blue-500 via-blue-400 to-green-400 flex items-center justify-center overflow-hidden">
        {/* Mapa visual estilizado do Brasil */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Formato simplificado do Brasil com SVG */}
          <div className="relative">
            <svg width="300" height="350" viewBox="0 0 300 350" className="drop-shadow-2xl">
              {/* Fundo do país */}
              <path 
                d="M50 80 Q60 60 90 70 Q130 50 170 60 Q210 45 250 70 Q270 90 260 130 Q280 150 270 180 Q260 220 240 250 Q220 280 180 290 Q140 300 100 280 Q70 260 50 220 Q40 180 45 140 Q35 110 50 80 Z"
                fill="hsl(var(--primary))"
                className="opacity-90"
              />
              {/* Contorno */}
              <path 
                d="M50 80 Q60 60 90 70 Q130 50 170 60 Q210 45 250 70 Q270 90 260 130 Q280 150 270 180 Q260 220 240 250 Q220 280 180 290 Q140 300 100 280 Q70 260 50 220 Q40 180 45 140 Q35 110 50 80 Z"
                fill="none"
                stroke="white"
                strokeWidth="2"
                className="opacity-80"
              />
              
              {/* Pontos de calor dos estados mais ativos */}
              {statesData.slice(0, 8).map((state, index) => {
                const positions = [
                  { x: 150, y: 120 }, // Centro
                  { x: 200, y: 100 }, // Nordeste
                  { x: 120, y: 150 }, // Sudeste
                  { x: 180, y: 200 }, // Sul
                  { x: 100, y: 180 }, // Centro-Oeste
                  { x: 230, y: 140 }, // Norte
                  { x: 160, y: 180 }, // Interior
                  { x: 140, y: 100 }  // Norte
                ];
                
                const isCurrentLocation = currentLocation?.state === state.state;
                const size = Math.max(8, Math.min(20, state.count / 10));
                
                return (
                  <g key={state.state}>
                    {/* Pulsação para localização atual */}
                    {isCurrentLocation && (
                      <circle 
                        cx={positions[index]?.x || 150} 
                        cy={positions[index]?.y || 120}
                        r={size + 5}
                        fill="white"
                        className="animate-ping opacity-50"
                      />
                    )}
                    {/* Ponto do estado */}
                    <circle 
                      cx={positions[index]?.x || 150} 
                      cy={positions[index]?.y || 120}
                      r={size}
                      fill={isCurrentLocation ? "white" : "hsl(var(--accent))"}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:scale-110 transition-transform"
                    />
                    {/* Label do estado */}
                    <text 
                      x={positions[index]?.x || 150} 
                      y={(positions[index]?.y || 120) - size - 8}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      className="drop-shadow-lg"
                    >
                      {state.state}
                    </text>
                    <text 
                      x={positions[index]?.x || 150} 
                      y={(positions[index]?.y || 120) - size + 18}
                      textAnchor="middle"
                      fill="white"
                      fontSize="8"
                      className="drop-shadow-lg"
                    >
                      {state.count}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Estatísticas flutuantes */}
            <div className="absolute -top-8 left-0 right-0 text-center">
              <h3 className="text-white text-xl font-bold drop-shadow-lg mb-2">Brasil Online</h3>
              <div className="flex justify-center space-x-4 text-white text-sm">
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1">
                  <div className="font-bold">{totalUsers.toLocaleString()}</div>
                  <div className="text-xs">usuários</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1">
                  <div className="font-bold">{statesData.length}</div>
                  <div className="text-xs">estados</div>
                </div>
              </div>
            </div>

            {/* Preview dos top 3 estados */}
            <div className="absolute -bottom-16 left-0 right-0">
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                {statesData.slice(0, 3).map((state, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const isCurrentLocation = currentLocation?.state === state.state;
                  
                  return (
                    <div key={state.state} className={`p-2 rounded-lg text-xs backdrop-blur ${
                      isCurrentLocation 
                        ? 'bg-white/30 border border-white/50' 
                        : 'bg-white/20'
                    }`}>
                      <div className="text-lg">{medals[index]}</div>
                      <div className="font-semibold text-white">{state.state}</div>
                      <div className="text-white/90">{state.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Botão para ver detalhes */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur">
                <Users className="w-4 h-4 mr-2" />
                Ver Estados Detalhados
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
            <div className="font-semibold">📍 Informações:</div>
            <div>• {statesData.length} estados detectados</div>
            <div>• {totalUsers.toLocaleString()} usuários online</div>
            <div>• Clique no botão para detalhes</div>
          </div>
        </div>
      </div>
    </div>
  );
};