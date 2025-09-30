import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

interface BrazilStaticMapProps {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
}

// Mapeamento CALIBRADO - todos os estados concentrados dentro do mapa
const allBrazilStates = {
  // Região Norte - parte superior
  'RR': { name: 'Roraima', top: '15%', left: '35%' },        // Extremo norte
  'AP': { name: 'Amapá', top: '18%', left: '50%' },          // Norte-centro
  'AM': { name: 'Amazonas', top: '32%', left: '35%' },       // Norte-oeste, maior estado
  'PA': { name: 'Pará', top: '30%', left: '48%' },           // Norte-leste
  'RO': { name: 'Rondônia', top: '55%', left: '32%' },       // Oeste
  'AC': { name: 'Acre', top: '58%', left: '25%' },           // Sudoeste
  
  // Região Nordeste - parte direita superior
  'MA': { name: 'Maranhão', top: '32%', left: '55%' },       // Nordeste-oeste
  'PI': { name: 'Piauí', top: '40%', left: '56%' },          // Centro-nordeste
  'CE': { name: 'Ceará', top: '28%', left: '62%' },          // Nordeste
  'RN': { name: 'Rio Grande do Norte', top: '32%', left: '66%' }, // Nordeste-ponta
  'PB': { name: 'Paraíba', top: '36%', left: '65%' },        // Nordeste
  'PE': { name: 'Pernambuco', top: '42%', left: '63%' },     // Leste
  'AL': { name: 'Alagoas', top: '48%', left: '64%' },        // Leste
  'SE': { name: 'Sergipe', top: '50%', left: '62%' },        // Leste
  'BA': { name: 'Bahia', top: '52%', left: '56%' },          // Centro-leste, grande
  
  // Região Centro-Oeste - centro
  'TO': { name: 'Tocantins', top: '48%', left: '52%' },      // Centro-norte
  'MT': { name: 'Mato Grosso', top: '55%', left: '45%' },    // Centro-oeste
  'GO': { name: 'Goiás', top: '62%', left: '52%' },          // Centro
  'DF': { name: 'Distrito Federal', top: '64%', left: '53%' }, // Centro (pequeno)
  'MS': { name: 'Mato Grosso do Sul', top: '70%', left: '47%' }, // Centro-sul
  
  // Região Sudeste - parte inferior direita
  'MG': { name: 'Minas Gerais', top: '68%', left: '56%' },   // Sudeste, grande
  'ES': { name: 'Espírito Santo', top: '72%', left: '60%' }, // Leste
  'RJ': { name: 'Rio de Janeiro', top: '76%', left: '58%' }, // Sudeste
  'SP': { name: 'São Paulo', top: '78%', left: '52%' },      // Sudeste
  
  // Região Sul - parte inferior
  'PR': { name: 'Paraná', top: '82%', left: '50%' },         // Sul
  'SC': { name: 'Santa Catarina', top: '86%', left: '52%' }, // Sul
  'RS': { name: 'Rio Grande do Sul', top: '90%', left: '48%' } // Extremo sul
};

// Mapeamento de nomes completos para siglas
const stateNameToCode: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO'
};

export const BrazilStaticMap = ({ statesData, currentLocation, totalUsers }: BrazilStaticMapProps) => {
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Verificar se statesData é válido antes de usar reduce
  const validStatesData = Array.isArray(statesData) ? statesData : [];
  
  // Criar mapa de dados dos estados convertendo nomes para códigos
  const stateDataMap = validStatesData.reduce((acc, state) => {
    // Primeiro tenta encontrar pelo código direto, depois pelo nome completo
    const stateCode = stateNameToCode[state.state] || state.state;
    acc[stateCode] = state;
    return acc;
  }, {} as Record<string, StateData>);

  // Debug: log dos estados com conversão
  console.log('Estados convertidos:', validStatesData.map(s => {
    const code = stateNameToCode[s.state] || s.state;
    return `${s.state} -> ${code}: ${s.count}`;
  }));

  const handleStateClick = (stateCode: string) => {
    const stateData = stateDataMap[stateCode];
    if (stateData) {
      setSelectedState(stateData);
      setIsModalOpen(true);
    } else {
      // Se não tem dados, cria um objeto temporário para mostrar
      setSelectedState({
        state: `${stateCode} - ${allBrazilStates[stateCode as keyof typeof allBrazilStates]?.name || stateCode}`,
        count: 0,
        percentage: "0"
      });
      setIsModalOpen(true);
    }
  };

  const getPinSize = (count: number) => {
    if (count > 500) return 'w-6 h-6';
    if (count > 200) return 'w-5 h-5';
    return 'w-4 h-4';
  };

  const getPinColor = (stateCode: string, count: number) => {
    const isCurrentLocation = currentLocation?.state === stateCode;
    if (isCurrentLocation) return 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50';
    if (count > 500) return 'bg-red-500 shadow-lg shadow-red-500/50';
    if (count > 200) return 'bg-yellow-500 shadow-lg shadow-yellow-500/50';
    return 'bg-blue-500 shadow-lg shadow-blue-500/50';
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-border shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🇧🇷</div>
          <div>
            <h3 className="font-semibold text-lg">Mapa do Brasil - Usuários Online</h3>
            <p className="text-sm text-muted-foreground">Clique nos pinos para ver detalhes dos estados</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="destructive" className="animate-pulse">
            🔴 {totalUsers.toLocaleString()} online
          </Badge>
          
          <Badge variant="outline">
            📊 {validStatesData.length}/27 estados ativos
          </Badge>
          
          {currentLocation && (
            <Badge variant="secondary">
              📍 {currentLocation.city}, {currentLocation.state}
            </Badge>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative p-4">
        <div className="relative w-full h-full max-w-3xl mx-auto" style={{ maxHeight: '500px' }}>
          {/* Imagem do mapa do Brasil */}
          <img 
            src="/lovable-uploads/0e809378-a44a-46fb-9831-b0966c586bfd.png"
            alt="Mapa do Brasil"
            className="w-full h-full object-contain drop-shadow-lg"
            style={{ maxHeight: '480px' }}
          />
          
          {/* MAPA CALIBRADO - todos os 27 estados dentro do contorno */}
          {Object.entries(allBrazilStates).map(([stateCode, stateInfo]) => {
            const stateData = stateDataMap[stateCode];
            const hasUsers = stateData && stateData.count > 0;
            
            return (
              <div
                key={stateCode}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{
                  top: stateInfo.top,
                  left: stateInfo.left,
                }}
                onClick={() => handleStateClick(stateCode)}
              >
                {/* Marcador calibrado */}
                <div className={`
                  ${hasUsers 
                    ? `${getPinColor(stateCode, stateData.count)} ${getPinSize(stateData.count)}` 
                    : 'bg-gray-300 w-2 h-2 opacity-50'
                  }
                  rounded-full border border-white
                  transition-all duration-300 hover:scale-125
                  flex items-center justify-center
                  relative z-10 shadow-sm
                `}>
                  {hasUsers && <div className="w-1 h-1 bg-white rounded-full"></div>}
                </div>
                
                {/* Label para verificação - será removido depois */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1
                               text-xs font-semibold text-gray-800 bg-white/90 px-1 py-0.5 rounded shadow-sm
                               opacity-0 group-hover:opacity-100 transition-opacity">
                  {stateCode}
                </div>
                
                {/* Tooltip - sempre aparece no hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                               opacity-0 group-hover:opacity-100 transition-opacity duration-200
                               bg-black text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap pointer-events-none z-10">
                  <div className="font-semibold">{stateCode} - {stateInfo.name}</div>
                  <div>
                    {hasUsers 
                      ? `${stateData.count.toLocaleString()} usuários online` 
                      : 'Nenhum usuário online'
                    }
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                                 border-4 border-transparent border-t-black"></div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legenda - posição ajustada */}
        <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg max-w-xs">
          <div className="font-semibold mb-2 text-sm">📊 Legenda:</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Baixa densidade (&lt; 200)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Média densidade (200-500)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Alta densidade (&gt; 500)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Sua localização</span>
            </div>
          </div>
        </div>

        {/* Estatísticas - posição ajustada */}
        <div className="absolute top-6 right-6 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg max-w-xs">
          <div className="font-semibold mb-2 text-sm">📈 Estatísticas:</div>
          <div className="space-y-1 text-xs">
            <div><strong>27</strong> estados mapeados</div>
            <div><strong>{validStatesData.length}</strong> estados com usuários</div>
            <div><strong>{totalUsers.toLocaleString()}</strong> usuários online</div>
            {currentLocation && (
              <div className="text-green-600 font-medium">
                📍 Você está em {currentLocation.state}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhes do estado */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>📍</span>
              <span>{selectedState?.state}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedState && (
            <div className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-2">
                  {selectedState.count.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">usuários online</div>
                <div className="text-lg font-semibold text-accent mt-2">
                  {selectedState.percentage}% do total
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="h-4 rounded-full bg-primary transition-all duration-1000"
                  style={{ width: `${Math.min(parseFloat(selectedState.percentage), 100)}%` }}
                ></div>
              </div>
              
              <div className={`text-center py-3 px-4 rounded-lg font-medium ${
                selectedState.count > 500 
                  ? 'bg-red-100 text-red-700' 
                  : selectedState.count > 200 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-blue-100 text-blue-700'
              }`}>
                {selectedState.count > 500 
                  ? '🔴 Alta Densidade de Usuários' 
                  : selectedState.count > 200 
                    ? '🟡 Média Densidade de Usuários' 
                    : '🔵 Baixa Densidade de Usuários'
                }
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};