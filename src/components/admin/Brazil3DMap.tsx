import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { Mesh, Vector3, Shape, Vector2, Group } from 'three';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users } from 'lucide-react';

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

interface Brazil3DMapProps {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
}

// Coordenadas aproximadas dos estados brasileiros (lat, lng convertidas para posições 3D)
const statePositions: Record<string, [number, number, number]> = {
  'AC': [-8, 0, -70], // Acre
  'AL': [-9, 0, -36], // Alagoas
  'AP': [1, 0, -52], // Amapá
  'AM': [-4, 0, -65], // Amazonas
  'BA': [-12, 0, -42], // Bahia
  'CE': [-4, 0, -38], // Ceará
  'DF': [-15, 0, -48], // Distrito Federal
  'ES': [-19, 0, -40], // Espírito Santo
  'GO': [-16, 0, -49], // Goiás
  'MA': [-4, 0, -45], // Maranhão
  'MT': [-12, 0, -56], // Mato Grosso
  'MS': [-20, 0, -55], // Mato Grosso do Sul
  'MG': [-18, 0, -44], // Minas Gerais
  'PA': [-3, 0, -52], // Pará
  'PB': [-7, 0, -36], // Paraíba
  'PR': [-24, 0, -51], // Paraná
  'PE': [-8, 0, -37], // Pernambuco
  'PI': [-7, 0, -42], // Piauí
  'RJ': [-22, 0, -43], // Rio de Janeiro
  'RN': [-5, 0, -36], // Rio Grande do Norte
  'RS': [-30, 0, -53], // Rio Grande do Sul
  'RO': [-11, 0, -62], // Rondônia
  'RR': [2, 0, -61], // Roraima
  'SC': [-27, 0, -50], // Santa Catarina
  'SP': [-23, 0, -46], // São Paulo
  'SE': [-10, 0, -37], // Sergipe
  'TO': [-10, 0, -48], // Tocantins
};

// Coordenadas detalhadas dos estados do Brasil para forma mais realista
const brazilStatesShapes = {
  // Região Norte
  'AC': [[-11, -73], [-7, -73], [-7, -66], [-11, -66]], // Acre
  'AM': [[-2, -68], [2, -68], [2, -56], [-2, -56]], // Amazonas
  'AP': [[-1, -54], [5, -54], [5, -49], [-1, -49]], // Amapá
  'PA': [[-9, -59], [1, -59], [1, -46], [-9, -46]], // Pará
  'RO': [[-13, -66], [-7, -66], [-7, -59], [-13, -59]], // Rondônia
  'RR': [[5, -64], [8, -64], [8, -58], [5, -58]], // Roraima
  'TO': [[-13, -50], [-5, -50], [-5, -45], [-13, -45]], // Tocantins
  
  // Região Nordeste
  'AL': [[-10, -37], [-8, -37], [-8, -35], [-10, -35]], // Alagoas
  'BA': [[-18, -47], [-8, -47], [-8, -37], [-18, -37]], // Bahia
  'CE': [[-7, -41], [-2, -41], [-2, -37], [-7, -37]], // Ceará
  'MA': [[-10, -48], [-1, -48], [-1, -42], [-10, -42]], // Maranhão
  'PB': [[-8, -38], [-6, -38], [-6, -34], [-8, -34]], // Paraíba
  'PE': [[-10, -41], [-7, -41], [-7, -34], [-10, -34]], // Pernambuco
  'PI': [[-11, -46], [-2, -46], [-2, -40], [-11, -40]], // Piauí
  'RN': [[-7, -38], [-4, -38], [-4, -34], [-7, -34]], // Rio Grande do Norte
  'SE': [[-11, -38], [-10, -38], [-10, -36], [-11, -36]], // Sergipe
  
  // Região Centro-Oeste
  'DF': [[-16, -48], [-15, -48], [-15, -47], [-16, -47]], // Distrito Federal
  'GO': [[-19, -53], [-12, -53], [-12, -45], [-19, -45]], // Goiás
  'MT': [[-18, -61], [-7, -61], [-7, -50], [-18, -50]], // Mato Grosso
  'MS': [[-25, -58], [-17, -58], [-17, -50], [-25, -50]], // Mato Grosso do Sul
  
  // Região Sudeste
  'ES': [[-21, -42], [-17, -42], [-17, -39], [-21, -39]], // Espírito Santo
  'MG': [[-23, -51], [-14, -51], [-14, -39], [-23, -39]], // Minas Gerais
  'RJ': [[-24, -45], [-20, -45], [-20, -40], [-24, -40]], // Rio de Janeiro
  'SP': [[-26, -53], [-19, -53], [-19, -44], [-26, -44]], // São Paulo
  
  // Região Sul
  'PR': [[-27, -55], [-22, -55], [-22, -48], [-27, -48]], // Paraná
  'RS': [[-34, -58], [-27, -58], [-27, -49], [-34, -49]], // Rio Grande do Sul
  'SC': [[-30, -54], [-25, -54], [-25, -48], [-30, -48]], // Santa Catarina
};

const BrazilShape = () => {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {/* Base do mapa do Brasil */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[45, 1, 35]} />
        <meshPhongMaterial 
          color="hsl(210, 15%, 85%)" 
          shininess={30}
        />
      </mesh>
      
      {/* Estados em relevo com mais realismo */}
      {Object.entries(brazilStatesShapes).map(([state, coords]) => {
        const centerX = coords.reduce((sum, point) => sum + point[1], 0) / coords.length;
        const centerZ = coords.reduce((sum, point) => sum + point[0], 0) / coords.length;
        const width = Math.abs(Math.max(...coords.map(p => p[1])) - Math.min(...coords.map(p => p[1])));
        const height = Math.abs(Math.max(...coords.map(p => p[0])) - Math.min(...coords.map(p => p[0])));
        
        return (
          <group key={state}>
            {/* Estado base */}
            <mesh position={[centerX, 0.3, centerZ]}>
              <boxGeometry args={[width, 1.2, height]} />
              <meshPhongMaterial 
                color="hsl(210, 25%, 88%)" 
                shininess={80}
              />
            </mesh>
            
            {/* Bordas do estado */}
            <mesh position={[centerX, 0.9, centerZ]}>
              <boxGeometry args={[width + 0.1, 0.1, height + 0.1]} />
              <meshPhongMaterial 
                color="hsl(210, 30%, 75%)" 
                shininess={100}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Sombra e base oceânica */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[25, 25, 0.5, 32]} />
        <meshPhongMaterial 
          color="hsl(210, 50%, 30%)" 
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

const StateMarker = ({ 
  position, 
  state, 
  count, 
  isCurrentLocation,
  onClick
}: {
  position: [number, number, number];
  state: string;
  count: number;
  isCurrentLocation: boolean;
  onClick: () => void;
}) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      if (isCurrentLocation) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.2);
      }
      if (hovered) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      } else {
        meshRef.current.position.y = position[1];
      }
    }
  });

  const size = Math.max(0.5, Math.min(2, count / 100));

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial 
          color={isCurrentLocation ? "#10b981" : "#3b82f6"} 
          emissive={isCurrentLocation ? "#059669" : "#1d4ed8"}
          emissiveIntensity={isCurrentLocation ? 0.4 : 0.2}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-black/80 text-white p-2 rounded-lg text-sm pointer-events-none">
            <div className="font-bold">{state}</div>
            <div>{count.toLocaleString()} usuários</div>
          </div>
        </Html>
      )}
      
      <Text
        position={[0, size + 1, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {state}
      </Text>
    </group>
  );
};

const Scene = ({ statesData, currentLocation, totalUsers, onStateClick }: {
  statesData: StateData[];
  currentLocation: CurrentLocation | null;
  totalUsers: number;
  onStateClick: (state: StateData) => void;
}) => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.8} color="#4f46e5" />
      <spotLight position={[0, 25, 0]} intensity={0.5} angle={Math.PI / 4} penumbra={0.5} />
      
      <BrazilShape />
      
      {statesData.map((stateData) => {
        const position = statePositions[stateData.state];
        if (!position) return null;
        
        const isCurrentLocation = currentLocation?.state === stateData.state;
        
        return (
          <StateMarker
            key={stateData.state}
            position={position}
            state={stateData.state}
            count={stateData.count}
            isCurrentLocation={isCurrentLocation}
            onClick={() => onStateClick(stateData)}
          />
        );
      })}
      
      <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
    </>
  );
};

export const Brazil3DMap = ({ statesData, currentLocation, totalUsers }: Brazil3DMapProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<StateData | null>(null);

  const handleStateClick = (state: StateData) => {
    setSelectedState(state);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="text-lg">🇧🇷</div>
          <div>
            <h3 className="font-semibold text-sm">Mapa 3D do Brasil - Usuários Online</h3>
            <p className="text-xs text-muted-foreground">Clique e arraste para rotacionar • Scroll para zoom</p>
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

      {/* Canvas 3D */}
      <div className="flex-1 relative min-h-[500px] bg-gradient-to-br from-slate-900 via-blue-900 to-green-900">
        <Canvas camera={{ position: [0, 20, 40], fov: 60 }}>
          <Scene 
            statesData={statesData}
            currentLocation={currentLocation}
            totalUsers={totalUsers}
            onStateClick={handleStateClick}
          />
        </Canvas>
        
        {/* Controles de ajuda */}
        <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-xs">
          <div className="font-semibold mb-2">🎮 Controles:</div>
          <div>• Clique e arraste: Rotacionar</div>
          <div>• Scroll: Zoom in/out</div>
          <div>• Clique na esfera: Ver estado</div>
        </div>

        {/* Estatísticas */}
        <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-xs">
          <div className="font-semibold mb-2">📊 Estatísticas:</div>
          <div>{statesData.length} estados detectados</div>
          <div>{totalUsers.toLocaleString()} usuários online</div>
          {currentLocation && (
            <div className="text-green-400">📍 Você: {currentLocation.city}, {currentLocation.state}</div>
          )}
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