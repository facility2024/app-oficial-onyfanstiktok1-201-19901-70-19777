import React from 'react';
import { Badge } from '@/components/ui/badge';

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

interface SimpleMapProps {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
}

export const SimpleMap = ({ statesData, currentLocation, totalUsers }: SimpleMapProps) => {
  // Top 5 estados para mostrar
  const topStates = statesData.slice(0, 5);

  return (
    <div className="w-full flex flex-col bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur border-b">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🇧🇷</div>
          <div>
            <h3 className="font-semibold text-sm">Brasil - Distribuição de Usuários</h3>
            <p className="text-xs text-muted-foreground">Estados com mais usuários online</p>
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

      {/* Mapa simulado com cards dos estados */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {topStates.map((state, index) => {
            const isCurrentLocation = currentLocation?.state === state.state;
            const medals = ['🥇', '🥈', '🥉', '🏅', '⭐'];
            
            return (
              <div 
                key={state.state}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  isCurrentLocation 
                    ? 'bg-green-100 border-green-300 shadow-lg' 
                    : 'bg-white/70 border-gray-200 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{medals[index]}</span>
                    <div>
                      <h4 className="font-semibold text-sm">{state.state}</h4>
                      <p className="text-xs text-muted-foreground">#{index + 1} no ranking</p>
                    </div>
                  </div>
                  
                  {isCurrentLocation && (
                    <Badge variant="secondary" className="text-xs animate-pulse">
                      📍 Você está aqui
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Usuários Online:</span>
                    <span className="font-bold text-sm">{state.count.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Percentual:</span>
                    <span className="font-bold text-sm text-primary">{state.percentage}%</span>
                  </div>

                  {/* Barra de progresso visual */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isCurrentLocation ? 'bg-green-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(parseFloat(state.percentage), 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Densidade indicator */}
                <div className="mt-3 flex items-center justify-center">
                  <div className={`w-full text-center py-1 px-2 rounded-md text-xs font-medium ${
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

          {/* Card de resumo total */}
          <div className="col-span-full md:col-span-1 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border-2 border-dashed border-primary/30">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <h4 className="font-semibold text-sm mb-2">Estatísticas Gerais</h4>
              <div className="space-y-1 text-xs">
                <div>Total de Estados: {statesData.length}</div>
                <div>Usuários Detectados: {totalUsers.toLocaleString()}</div>
                {currentLocation && (
                  <div className="text-green-600 font-medium">
                    ✅ Sua localização: {currentLocation.city}, {currentLocation.state}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer com informações */}
      <div className="p-3 bg-white/60 backdrop-blur text-center">
        <p className="text-xs text-muted-foreground">
          🔴 Dados em tempo real • Atualizado automaticamente
        </p>
      </div>
    </div>
  );
};