import React from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';

export const BrazilRealMap = () => {
  const { stateStats } = useGeolocation();

  // Coordenadas baseadas na calibração manual do usuário
  const stateCoordinates = {
    // Norte (RR/AM) - top: 20.3%, left: 37.7%
    'Acre': { top: 32.4, left: 29.7, region: 'Norte' },
    'Amapá': { top: 23.0, left: 29.7, region: 'Norte' },
    'Amazonas': { top: 20.3, left: 37.7, region: 'Norte' },
    'Pará': { top: 28.0, left: 50.0, region: 'Norte' },
    'Rondônia': { top: 35.0, left: 32.0, region: 'Norte' },
    'Roraima': { top: 15.0, left: 35.0, region: 'Norte' },
    'Tocantins': { top: 38.0, left: 52.0, region: 'Norte' },

    // Nordeste (CE/PE) - top: 32.4%, left: 79.3%
    'Alagoas': { top: 45.0, left: 75.0, region: 'Nordeste' },
    'Bahia': { top: 50.0, left: 68.0, region: 'Nordeste' },
    'Ceará': { top: 32.4, left: 79.3, region: 'Nordeste' },
    'Maranhão': { top: 30.0, left: 58.0, region: 'Nordeste' },
    'Paraíba': { top: 37.0, left: 78.0, region: 'Nordeste' },
    'Pernambuco': { top: 42.0, left: 76.0, region: 'Nordeste' },
    'Piauí': { top: 36.0, left: 65.0, region: 'Nordeste' },
    'Rio Grande do Norte': { top: 34.0, left: 80.0, region: 'Nordeste' },
    'Sergipe': { top: 48.0, left: 74.0, region: 'Nordeste' },

    // Centro-Oeste (GO/MT) - top: 52.8%, left: 50.8%
    'Distrito Federal': { top: 55.0, left: 54.0, region: 'Centro-Oeste' },
    'Goiás': { top: 52.8, left: 50.8, region: 'Centro-Oeste' },
    'Mato Grosso': { top: 48.0, left: 42.0, region: 'Centro-Oeste' },
    'Mato Grosso do Sul': { top: 62.0, left: 45.0, region: 'Centro-Oeste' },

    // Sudeste (SP/RJ) - top: 64.7%, left: 65.2%
    'Espírito Santo': { top: 62.0, left: 69.0, region: 'Sudeste' },
    'Minas Gerais': { top: 58.0, left: 59.0, region: 'Sudeste' },
    'Rio de Janeiro': { top: 64.7, left: 65.2, region: 'Sudeste' },
    'São Paulo': { top: 68.0, left: 58.0, region: 'Sudeste' },

    // Sul (RS/SC) - top: 81.8%, left: 60.1%
    'Paraná': { top: 74.0, left: 55.0, region: 'Sul' },
    'Rio Grande do Sul': { top: 81.8, left: 60.1, region: 'Sul' },
    'Santa Catarina': { top: 77.0, left: 58.0, region: 'Sul' }
  };

  // Cores por região
  const regionColors = {
    'Norte': 'bg-blue-500',
    'Nordeste': 'bg-green-500', 
    'Centro-Oeste': 'bg-yellow-500',
    'Sudeste': 'bg-red-500',
    'Sul': 'bg-purple-500'
  };

  return (
    <div className="relative w-full h-full">
      {/* Imagem do mapa */}
      <img 
        src="/lovable-uploads/0e809378-a44a-46fb-9831-b0966c586bfd.png"
        alt="Mapa do Brasil"
        className="w-full h-full object-contain drop-shadow-lg"
      />
      
      {/* Pinos de todos os estados - estáticos */}
      {Object.entries(stateCoordinates).map(([stateName, coords]) => {
        const userCount = stateStats[stateName] || 0;
        const hasUsers = userCount > 0;
        const regionColor = regionColors[coords.region as keyof typeof regionColors];
        
        return (
          <div
            key={stateName}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer
                       transition-all duration-300 hover:scale-150
                       ${hasUsers 
                         ? `${regionColor} w-4 h-4 shadow-lg animate-pulse` 
                         : 'bg-gray-400 w-2 h-2 opacity-60 hover:opacity-100'
                       } 
                       rounded-full border-2 border-white`}
            style={{
              left: `${coords.left}%`,
              top: `${coords.top}%`,
            }}
          >
            {/* Ponto central */}
            <div className="w-1 h-1 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Tooltip com informações detalhadas - aparece no hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3
                           bg-black/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl
                           opacity-0 hover:opacity-100 transition-all duration-300 scale-95 hover:scale-100
                           whitespace-nowrap pointer-events-none z-20 min-w-max">
              <div className="font-bold text-sm">{stateName}</div>
              <div className="text-xs opacity-90 mb-1">{coords.region}</div>
              {hasUsers ? (
                <>
                  <div className="text-success font-semibold">🟢 {userCount} usuário{userCount > 1 ? 's' : ''} online</div>
                  <div className="text-xs opacity-75 mt-1">🔴 AO VIVO</div>
                </>
              ) : (
                <div className="text-gray-400">⚪ Nenhum usuário online</div>
              )}
              
              {/* Seta do tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                             border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
            </div>
          </div>
        );
      })}
      
      {/* Legenda das regiões */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg">
        <div className="font-semibold mb-2 text-sm">🇧🇷 Regiões do Brasil</div>
        <div className="space-y-1 text-xs">
          {Object.entries(regionColors).map(([region, color]) => (
            <div key={region} className="flex items-center space-x-2">
              <div className={`w-3 h-3 ${color} rounded-full border border-white`}></div>
              <span>{region}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          Apenas estados com usuários online aparecem no mapa
        </div>
      </div>
    </div>
  );
};