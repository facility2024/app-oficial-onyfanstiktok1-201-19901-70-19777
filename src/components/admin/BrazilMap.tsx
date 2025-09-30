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

interface BrazilMapProps {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
}

// Posições aproximadas dos estados no mapa (% from top, % from left)
const statePositions: Record<string, { top: string; left: string }> = {
  'Amazonas': { top: '25%', left: '20%' },
  'Pará': { top: '20%', left: '40%' },
  'Acre': { top: '40%', left: '10%' },
  'Rondônia': { top: '45%', left: '25%' },
  'Roraima': { top: '10%', left: '25%' },
  'Amapá': { top: '15%', left: '45%' },
  'Tocantins': { top: '45%', left: '45%' },
  'Maranhão': { top: '30%', left: '50%' },
  'Piauí': { top: '40%', left: '55%' },
  'Ceará': { top: '30%', left: '65%' },
  'Rio Grande do Norte': { top: '35%', left: '70%' },
  'Paraíba': { top: '40%', left: '70%' },
  'Pernambuco': { top: '45%', left: '70%' },
  'Alagoas': { top: '50%', left: '70%' },
  'Sergipe': { top: '52%', left: '68%' },
  'Bahia': { top: '55%', left: '60%' },
  'Minas Gerais': { top: '65%', left: '55%' },
  'Espírito Santo': { top: '70%', left: '62%' },
  'Rio de Janeiro': { top: '75%', left: '58%' },
  'São Paulo': { top: '75%', left: '50%' },
  'Paraná': { top: '80%', left: '45%' },
  'Santa Catarina': { top: '85%', left: '45%' },
  'Rio Grande do Sul': { top: '90%', left: '42%' },
  'Mato Grosso do Sul': { top: '70%', left: '40%' },
  'Mato Grosso': { top: '55%', left: '40%' },
  'Goiás': { top: '60%', left: '48%' },
  'Distrito Federal': { top: '58%', left: '50%' }
};

export const BrazilMap = ({ statesData, currentLocation, totalUsers }: BrazilMapProps) => {
  const getColorByCount = (count: number) => {
    if (count > 500) return 'bg-red-500';
    if (count > 200) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getSizeByCount = (count: number) => {
    if (count > 500) return 'w-4 h-4';
    if (count > 200) return 'w-3 h-3';
    return 'w-2 h-2';
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Container do mapa */}
      <div className="flex-1 relative bg-gradient-to-b from-blue-50 to-green-50 rounded-lg border-2 border-border overflow-hidden">
        
        {/* Mapa SVG do Brasil como background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            viewBox="0 0 400 300" 
            className="w-full h-full opacity-20"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
          >
            {/* Contorno simplificado do Brasil */}
            <path 
              d="M50 50 L350 50 L350 80 L320 80 L320 120 L350 120 L350 200 L320 200 L300 220 L250 250 L200 250 L150 220 L100 200 L80 180 L60 150 L50 120 Z" 
              fill="#e5f3ff" 
              stroke="#3b82f6" 
              strokeWidth="2"
            />
            
            {/* Região Norte */}
            <path 
              d="M50 50 L320 50 L320 120 L200 120 L150 100 L100 80 L50 80 Z" 
              fill="#dcfce7" 
              stroke="#22c55e" 
              strokeWidth="1"
              opacity="0.5"
            />
            
            {/* Região Nordeste */}
            <path 
              d="M200 120 L320 120 L320 180 L280 180 L250 160 L200 150 Z" 
              fill="#fed7aa" 
              stroke="#f97316" 
              strokeWidth="1"
              opacity="0.5"
            />
            
            {/* Região Sudeste */}
            <path 
              d="M200 150 L280 180 L250 220 L200 220 L180 200 Z" 
              fill="#dbeafe" 
              stroke="#3b82f6" 
              strokeWidth="1"
              opacity="0.5"
            />
            
            {/* Região Sul */}
            <path 
              d="M180 200 L200 220 L250 220 L200 250 L150 220 Z" 
              fill="#e0e7ff" 
              stroke="#6366f1" 
              strokeWidth="1"
              opacity="0.5"
            />
            
            {/* Região Centro-Oeste */}
            <path 
              d="M150 100 L200 120 L200 150 L180 200 L150 220 L100 200 L80 180 L60 150 L50 120 L100 80 Z" 
              fill="#f3e8ff" 
              stroke="#8b5cf6" 
              strokeWidth="1"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Título do mapa */}
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-semibold">
          🇧🇷 Brasil - Distribuição em Tempo Real
        </div>

        {/* Indicador de usuários totais */}
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs">
          <span className="text-red-500 animate-pulse">🔴</span> {totalUsers.toLocaleString()} usuários online
        </div>

        {/* Pontos dos estados */}
        {statesData.map((state) => {
          const position = statePositions[state.state];
          if (!position) return null;

          const isCurrentLocation = currentLocation?.state === state.state;
          
          return (
            <div
              key={state.state}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              style={{ top: position.top, left: position.left }}
              title={`${state.state}: ${state.count} usuários (${state.percentage}%)`}
            >
              {/* Ponto principal */}
              <div 
                className={`
                  ${getSizeByCount(state.count)} 
                  ${getColorByCount(state.count)} 
                  rounded-full border-2 border-white shadow-lg
                  ${isCurrentLocation ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                  hover:scale-150 transition-all duration-200
                  animate-pulse
                `}
              />
              
              {/* Indicador de localização atual */}
              {isCurrentLocation && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white animate-bounce" />
              )}
              
              {/* Tooltip no hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  <div className="font-semibold">{state.state}</div>
                  <div>{state.count.toLocaleString()} usuários</div>
                  <div>{state.percentage}% do total</div>
                  {isCurrentLocation && <div className="text-yellow-400">📍 Sua localização</div>}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          );
        })}

        {/* Pulsos animados para movimento */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-8 h-8 border border-primary/30 rounded-full animate-ping"
              style={{
                top: `${20 + i * 25}%`,
                left: `${30 + i * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: '3s'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Legenda e informações */}
      <div className="mt-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span>Alta densidade (500+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Média densidade (200+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Baixa densidade (&lt;200)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400 ring-2 ring-yellow-400/50"></div>
            <span>📍 Sua localização</span>
          </div>
        </div>
        
        {currentLocation && (
          <div className="pt-2 border-t border-border/50">
            <Badge variant="secondary" className="text-xs animate-fade-in">
              ✅ Localização detectada: <span className="font-semibold">{currentLocation.state}</span> - {currentLocation.city}
            </Badge>
          </div>
        )}
        
        {/* Top 3 estados */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="text-xs font-semibold mb-1">🏆 Top 3 Estados:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {statesData.slice(0, 3).map((state, index) => (
              <div key={state.state} className="flex items-center space-x-1">
                <span className={index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}></span>
                <span className="font-medium truncate">{state.state}</span>
                <span className="text-muted-foreground">({state.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};