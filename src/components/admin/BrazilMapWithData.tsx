import React, { useState } from 'react';

interface BrazilMapWithDataProps {
  onlineUsersByState: { [state: string]: number };
}

interface StatePosition {
  code: string;
  name: string;
  x: number; // posição horizontal em %
  y: number; // posição vertical em %
  region: string;
}

export const BrazilMapWithData = ({ onlineUsersByState }: BrazilMapWithDataProps) => {
  const [hoveredState, setHoveredState] = useState<StatePosition | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Posições dos estados sobre o mapa (baseado na imagem)
  const statePositions: StatePosition[] = [
    // Norte
    { code: 'AC', name: 'Acre', x: 18, y: 65, region: 'Norte' },
    { code: 'AP', name: 'Amapá', x: 50, y: 15, region: 'Norte' },
    { code: 'AM', name: 'Amazonas', x: 30, y: 35, region: 'Norte' },
    { code: 'PA', name: 'Pará', x: 48, y: 35, region: 'Norte' },
    { code: 'RO', name: 'Rondônia', x: 32, y: 58, region: 'Norte' },
    { code: 'RR', name: 'Roraima', x: 35, y: 12, region: 'Norte' },
    { code: 'TO', name: 'Tocantins', x: 52, y: 52, region: 'Norte' },

    // Nordeste
    { code: 'AL', name: 'Alagoas', x: 70, y: 55, region: 'Nordeste' },
    { code: 'BA', name: 'Bahia', x: 60, y: 58, region: 'Nordeste' },
    { code: 'CE', name: 'Ceará', x: 65, y: 28, region: 'Nordeste' },
    { code: 'MA', name: 'Maranhão', x: 55, y: 30, region: 'Nordeste' },
    { code: 'PB', name: 'Paraíba', x: 70, y: 35, region: 'Nordeste' },
    { code: 'PE', name: 'Pernambuco', x: 68, y: 45, region: 'Nordeste' },
    { code: 'PI', name: 'Piauí', x: 58, y: 42, region: 'Nordeste' },
    { code: 'RN', name: 'Rio Grande do Norte', x: 72, y: 30, region: 'Nordeste' },
    { code: 'SE', name: 'Sergipe', x: 68, y: 58, region: 'Nordeste' },

    // Centro-Oeste
    { code: 'GO', name: 'Goiás', x: 52, y: 65, region: 'Centro-Oeste' },
    { code: 'MT', name: 'Mato Grosso', x: 42, y: 58, region: 'Centro-Oeste' },
    { code: 'MS', name: 'Mato Grosso do Sul', x: 45, y: 72, region: 'Centro-Oeste' },
    { code: 'DF', name: 'Distrito Federal', x: 54, y: 67, region: 'Centro-Oeste' },

    // Sudeste
    { code: 'ES', name: 'Espírito Santo', x: 62, y: 75, region: 'Sudeste' },
    { code: 'MG', name: 'Minas Gerais', x: 56, y: 72, region: 'Sudeste' },
    { code: 'RJ', name: 'Rio de Janeiro', x: 58, y: 78, region: 'Sudeste' },
    { code: 'SP', name: 'São Paulo', x: 52, y: 78, region: 'Sudeste' },

    // Sul
    { code: 'PR', name: 'Paraná', x: 48, y: 82, region: 'Sul' },
    { code: 'RS', name: 'Rio Grande do Sul', x: 45, y: 92, region: 'Sul' },
    { code: 'SC', name: 'Santa Catarina', x: 50, y: 88, region: 'Sul' }
  ];

  const getStateUserCount = (stateName: string) => {
    return onlineUsersByState[stateName] || 0;
  };

  const handleMouseMove = (e: React.MouseEvent, state: StatePosition) => {
    setHoveredState(state);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="w-full h-[600px] md:h-[700px] lg:h-[800px] relative bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <img 
        src="/lovable-uploads/24a5e9ee-1a77-472c-ac34-4fa227321806.png"
        alt="Mapa do Brasil por regiões"
        className="w-full h-full object-contain drop-shadow-lg"
      />
      
      {/* Pontos interativos dos estados */}
      {statePositions.map((state) => {
        const userCount = getStateUserCount(state.name);
        const hasUsers = userCount > 0;
        
        return (
          <div
            key={state.code}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer
                       ${hasUsers ? 'animate-pulse' : ''}`}
            style={{
              left: `${state.x}%`,
              top: `${state.y}%`,
            }}
            onMouseEnter={(e) => handleMouseMove(e, state)}
            onMouseMove={(e) => handleMouseMove(e, state)}
            onMouseLeave={() => setHoveredState(null)}
          >
            {/* Círculo do estado */}
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-300 hover:scale-150
                           ${hasUsers 
                             ? 'bg-green-500 ring-2 ring-green-300' 
                             : 'bg-gray-400'
                           }`}>
              {/* Ponto central */}
              <div className="w-1 h-1 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>
        );
      })}

      {/* Tooltip flutuante */}
      {hoveredState && (
        <div 
          className="fixed z-50 bg-black/90 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none transition-opacity duration-200"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-bold text-sm">{hoveredState.name} ({hoveredState.code})</div>
          <div className="text-xs text-gray-300 mb-1">{hoveredState.region}</div>
          {getStateUserCount(hoveredState.name) > 0 ? (
            <div className="text-green-400 text-xs">
              🟢 {getStateUserCount(hoveredState.name)} usuário{getStateUserCount(hoveredState.name) > 1 ? 's' : ''} online
            </div>
          ) : (
            <div className="text-gray-400 text-xs">
              ⚫ Nenhum usuário online
            </div>
          )}
        </div>
      )}
      
      {/* Overlay com resumo de dados */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg backdrop-blur-sm">
        <h4 className="font-semibold text-sm mb-2">Resumo Nacional</h4>
        <div className="text-xs space-y-1">
          <div className="flex justify-between items-center gap-3">
            <span className="text-gray-600">Estados ativos:</span>
            <span className="font-medium text-green-600">
              {Object.values(onlineUsersByState).filter(count => count > 0).length}
            </span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-gray-600">Total usuários:</span>
            <span className="font-bold text-primary">
              {Object.values(onlineUsersByState).reduce((sum, count) => sum + count, 0)}
            </span>
          </div>
        </div>
        
        {Object.keys(onlineUsersByState).length === 0 && (
          <p className="text-xs text-gray-500 mt-2">Nenhum usuário online</p>
        )}
      </div>
    </div>
  );
};