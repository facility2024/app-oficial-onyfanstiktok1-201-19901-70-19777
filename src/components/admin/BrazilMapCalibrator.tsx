import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DraggablePin {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

export const BrazilMapCalibrator = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  
  const [pins, setPins] = useState<DraggablePin[]>([
    { id: 'norte', name: 'NORTE (RR/AM)', x: 35, y: 20, color: 'bg-blue-500' },
    { id: 'nordeste', name: 'NORDESTE (CE/PE)', x: 65, y: 35, color: 'bg-green-500' },
    { id: 'centro-oeste', name: 'CENTRO-OESTE (GO/MT)', x: 45, y: 55, color: 'bg-yellow-500' },
    { id: 'sudeste', name: 'SUDESTE (SP/RJ)', x: 55, y: 75, color: 'bg-red-500' },
    { id: 'sul', name: 'SUL (RS/SC)', x: 50, y: 85, color: 'bg-purple-500' },
    { id: 'extremos', name: 'EXTREMOS (AC/AP)', x: 25, y: 15, color: 'bg-orange-500' }
  ]);

  const handleMouseDown = (pinId: string) => {
    setIsDragging(pinId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPins(pins.map(pin => 
      pin.id === isDragging 
        ? { ...pin, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
        : pin
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const copyCoordinates = () => {
    const coordinates = pins.map(pin => 
      `${pin.name}: top: '${pin.y.toFixed(1)}%', left: '${pin.x.toFixed(1)}%'`
    ).join('\n');
    
    navigator.clipboard.writeText(coordinates);
    alert('Coordenadas copiadas para a área de transferência!');
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-border shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🎯</div>
          <div>
            <h3 className="font-semibold text-lg">Calibrador do Mapa do Brasil</h3>
            <p className="text-sm text-muted-foreground">Arraste os 6 pinos para as posições corretas no mapa</p>
          </div>
        </div>
        
        <Button onClick={copyCoordinates} variant="outline">
          📋 Copiar Coordenadas
        </Button>
      </div>

      {/* Mapa com pinos móveis */}
      <div className="flex-1 relative p-4">
        <div className="relative w-full h-full max-w-3xl mx-auto" style={{ maxHeight: '500px' }}>
          <div 
            ref={mapRef}
            className="relative w-full h-full cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Imagem do mapa */}
            <img 
              src="/lovable-uploads/0e809378-a44a-46fb-9831-b0966c586bfd.png"
              alt="Mapa do Brasil"
              className="w-full h-full object-contain drop-shadow-lg pointer-events-none"
              style={{ maxHeight: '480px' }}
            />
            
            {/* Pinos arrastáveis */}
            {pins.map((pin) => (
              <div
                key={pin.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move z-10
                           ${pin.color} w-6 h-6 rounded-full border-2 border-white shadow-lg
                           hover:scale-125 transition-transform duration-200
                           ${isDragging === pin.id ? 'scale-150 shadow-xl' : ''}`}
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                }}
                onMouseDown={() => handleMouseDown(pin.id)}
              >
                {/* Ponto central */}
                <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                
                {/* Label */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2
                               text-xs font-semibold text-gray-800 bg-white/95 px-2 py-1 rounded shadow-sm
                               whitespace-nowrap">
                  {pin.name}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Coordenadas em tempo real */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur p-4 rounded-lg shadow-lg max-w-sm">
          <div className="font-semibold mb-3 text-sm">📍 Coordenadas dos Pinos:</div>
          <div className="space-y-1 text-xs font-mono">
            {pins.map((pin) => (
              <div key={pin.id} className="flex items-center space-x-2">
                <div className={`w-3 h-3 ${pin.color} rounded-full`}></div>
                <span className="font-medium">{pin.name}:</span>
                <span>top: {pin.y.toFixed(1)}%, left: {pin.x.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};