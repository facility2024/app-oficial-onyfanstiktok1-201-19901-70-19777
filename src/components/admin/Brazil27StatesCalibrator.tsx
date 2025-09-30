import React from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';

interface StaticState {
  code: string;
  name: string;
  x: number;
  y: number;
  region: string;
}

interface Brazil27StatesCalibratorProps {
  onlineUsersByState?: { [state: string]: number };
}

export const Brazil27StatesCalibrator = ({ onlineUsersByState }: Brazil27StatesCalibratorProps) => {
  const { stateStats } = useGeolocation();
  
  const states: StaticState[] = [
    // Norte (7 estados) - azul
    { code: 'AC', name: 'Acre', x: 25, y: 58, region: 'Norte' },
    { code: 'AP', name: 'Amapá', x: 50, y: 18, region: 'Norte' },
    { code: 'AM', name: 'Amazonas', x: 35, y: 32, region: 'Norte' },
    { code: 'PA', name: 'Pará', x: 48, y: 30, region: 'Norte' },
    { code: 'RO', name: 'Rondônia', x: 32, y: 55, region: 'Norte' },
    { code: 'RR', name: 'Roraima', x: 35, y: 15, region: 'Norte' },
    { code: 'TO', name: 'Tocantins', x: 52, y: 48, region: 'Norte' },

    // Nordeste (9 estados) - verde
    { code: 'AL', name: 'Alagoas', x: 64, y: 48, region: 'Nordeste' },
    { code: 'BA', name: 'Bahia', x: 56, y: 52, region: 'Nordeste' },
    { code: 'CE', name: 'Ceará', x: 62, y: 28, region: 'Nordeste' },
    { code: 'MA', name: 'Maranhão', x: 55, y: 32, region: 'Nordeste' },
    { code: 'PB', name: 'Paraíba', x: 65, y: 36, region: 'Nordeste' },
    { code: 'PE', name: 'Pernambuco', x: 63, y: 42, region: 'Nordeste' },
    { code: 'PI', name: 'Piauí', x: 56, y: 40, region: 'Nordeste' },
    { code: 'RN', name: 'Rio Grande do Norte', x: 66, y: 32, region: 'Nordeste' },
    { code: 'SE', name: 'Sergipe', x: 62, y: 50, region: 'Nordeste' },

    // Centro-Oeste (4 estados) - amarelo
    { code: 'GO', name: 'Goiás', x: 52, y: 62, region: 'Centro-Oeste' },
    { code: 'MT', name: 'Mato Grosso', x: 45, y: 55, region: 'Centro-Oeste' },
    { code: 'MS', name: 'Mato Grosso do Sul', x: 47, y: 70, region: 'Centro-Oeste' },
    { code: 'DF', name: 'Distrito Federal', x: 53, y: 64, region: 'Centro-Oeste' },

    // Sudeste (4 estados) - vermelho
    { code: 'ES', name: 'Espírito Santo', x: 60, y: 72, region: 'Sudeste' },
    { code: 'MG', name: 'Minas Gerais', x: 56, y: 68, region: 'Sudeste' },
    { code: 'RJ', name: 'Rio de Janeiro', x: 58, y: 76, region: 'Sudeste' },
    { code: 'SP', name: 'São Paulo', x: 52, y: 78, region: 'Sudeste' },

    // Sul (3 estados) - roxo
    { code: 'PR', name: 'Paraná', x: 50, y: 82, region: 'Sul' },
    { code: 'RS', name: 'Rio Grande do Sul', x: 48, y: 90, region: 'Sul' },
    { code: 'SC', name: 'Santa Catarina', x: 52, y: 86, region: 'Sul' }
  ];

  const regionColors = {
    'Norte': 'bg-blue-500',
    'Nordeste': 'bg-green-500',
    'Centro-Oeste': 'bg-yellow-500',
    'Sudeste': 'bg-red-500',
    'Sul': 'bg-purple-500'
  };

  // Converter nomes completos para códigos
  const nameToCode: { [key: string]: string } = {
    'São Paulo': 'SP',
    'Rio de Janeiro': 'RJ',
    'Minas Gerais': 'MG',
    'Bahia': 'BA',
    'Rio Grande do Sul': 'RS',
    'Paraná': 'PR',
    'Pernambuco': 'PE',
    'Ceará': 'CE',
    'Pará': 'PA',
    'Santa Catarina': 'SC',
    'Goiás': 'GO',
    'Maranhão': 'MA',
    'Paraíba': 'PB',
    'Mato Grosso': 'MT',
    'Espírito Santo': 'ES',
    'Piauí': 'PI',
    'Alagoas': 'AL',
    'Rio Grande do Norte': 'RN',
    'Mato Grosso do Sul': 'MS',
    'Distrito Federal': 'DF',
    'Sergipe': 'SE',
    'Rondônia': 'RO',
    'Acre': 'AC',
    'Amazonas': 'AM',
    'Roraima': 'RR',
    'Amapá': 'AP',
    'Tocantins': 'TO'
  };

  const getStateUserCount = (stateCode: string) => {
    // Primeiro, usar dados reais do Supabase se disponíveis
    if (onlineUsersByState) {
      // Procurar por nome completo do estado
      const state = states.find(s => s.code === stateCode);
      if (state && onlineUsersByState[state.name]) {
        return onlineUsersByState[state.name];
      }
      
      // Procurar por código
      if (onlineUsersByState[stateCode]) {
        return onlineUsersByState[stateCode];
      }
    }
    
    // Fallback para dados do geolocation hook (pode ser removido)
    if (stateStats[stateCode]) {
      return stateStats[stateCode];
    }
    
    // Procura por nome completo convertido para código
    for (const [fullName, code] of Object.entries(nameToCode)) {
      if (code === stateCode && stateStats[fullName]) {
        return stateStats[fullName];
      }
    }
    
    return 0;
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mapa 3D como marca d'água */}
      <div className="w-full h-full relative p-4">
        <div className="relative w-full h-full max-w-3xl mx-auto" style={{ maxHeight: '500px' }}>
          <div className="relative w-full h-full">
            {/* Imagem do mapa como marca d'água */}
            <img 
              src="/lovable-uploads/0e809378-a44a-46fb-9831-b0966c586bfd.png"
              alt="Mapa do Brasil"
              className="w-full h-full object-contain drop-shadow-lg opacity-30 filter brightness-110"
              style={{ maxHeight: '480px' }}
            />
            
            {/* Todos os 27 estados coloridos por região */}
            {states.map((state) => {
              const userCount = getStateUserCount(state.code);
              const hasUsers = userCount > 0;
              
              return (
                <div
                  key={state.code}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group
                             ${regionColors[state.region as keyof typeof regionColors]} w-5 h-5 
                             ${hasUsers ? 'animate-pulse ring-2 ring-white' : ''} 
                             rounded-full border-2 border-white shadow-lg
                             hover:scale-150 transition-all duration-300 cursor-pointer`}
                  style={{
                    left: `${state.x}%`,
                    top: `${state.y}%`,
                  }}
                >
                  {/* Ponto central */}
                  <div className="w-1 h-1 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  
                  {/* Tooltip com informações completas */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3
                                 bg-black/90 text-white px-3 py-2 rounded-lg shadow-xl
                                 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
                                 whitespace-nowrap text-sm font-medium z-50">
                    <div className="font-bold">{state.name} ({state.code})</div>
                    <div className="text-xs text-gray-300">{state.region}</div>
                    {hasUsers ? (
                      <div className="text-green-400 text-xs mt-1">
                        🟢 {userCount} usuário{userCount > 1 ? 's' : ''} online
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs mt-1">
                        ⚫ Nenhum usuário online
                      </div>
                    )}
                    
                    {/* Triângulo do tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 
                                   border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};