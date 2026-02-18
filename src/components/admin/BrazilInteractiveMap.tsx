import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Users, Search, Filter, Wifi, Monitor, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import brazilMapImg from '@/assets/brazil-map-regions.png';

interface DeviceStats {
  desktop: number;
  mobile: number;
}

interface StatePosition {
  code: string;
  name: string;
  x: number;
  y: number;
  region: string;
}

interface BrazilInteractiveMapProps {
  onlineUsersByState: { [state: string]: number };
  deviceStatsByState?: { [state: string]: DeviceStats };
  totalDeviceStats?: DeviceStats;
}

const STATE_POSITIONS: StatePosition[] = [
  // Norte
  { code: 'AC', name: 'Acre', x: 12, y: 55, region: 'Norte' },
  { code: 'AP', name: 'Amapá', x: 52, y: 10, region: 'Norte' },
  { code: 'AM', name: 'Amazonas', x: 28, y: 30, region: 'Norte' },
  { code: 'PA', name: 'Pará', x: 46, y: 30, region: 'Norte' },
  { code: 'RO', name: 'Rondônia', x: 25, y: 55, region: 'Norte' },
  { code: 'RR', name: 'Roraima', x: 32, y: 10, region: 'Norte' },
  { code: 'TO', name: 'Tocantins', x: 50, y: 48, region: 'Norte' },
  // Nordeste
  { code: 'AL', name: 'Alagoas', x: 76, y: 48, region: 'Nordeste' },
  { code: 'BA', name: 'Bahia', x: 64, y: 55, region: 'Nordeste' },
  { code: 'CE', name: 'Ceará', x: 72, y: 28, region: 'Nordeste' },
  { code: 'MA', name: 'Maranhão', x: 56, y: 30, region: 'Nordeste' },
  { code: 'PB', name: 'Paraíba', x: 78, y: 34, region: 'Nordeste' },
  { code: 'PE', name: 'Pernambuco', x: 76, y: 40, region: 'Nordeste' },
  { code: 'PI', name: 'Piauí', x: 60, y: 38, region: 'Nordeste' },
  { code: 'RN', name: 'Rio Grande do Norte', x: 80, y: 30, region: 'Nordeste' },
  { code: 'SE', name: 'Sergipe', x: 74, y: 52, region: 'Nordeste' },
  // Centro-Oeste
  { code: 'GO', name: 'Goiás', x: 52, y: 62, region: 'Centro-Oeste' },
  { code: 'MT', name: 'Mato Grosso', x: 38, y: 50, region: 'Centro-Oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', x: 40, y: 68, region: 'Centro-Oeste' },
  { code: 'DF', name: 'Distrito Federal', x: 55, y: 60, region: 'Centro-Oeste' },
  // Sudeste
  { code: 'ES', name: 'Espírito Santo', x: 70, y: 65, region: 'Sudeste' },
  { code: 'MG', name: 'Minas Gerais', x: 60, y: 65, region: 'Sudeste' },
  { code: 'RJ', name: 'Rio de Janeiro', x: 66, y: 72, region: 'Sudeste' },
  { code: 'SP', name: 'São Paulo', x: 50, y: 74, region: 'Sudeste' },
  // Sul
  { code: 'PR', name: 'Paraná', x: 48, y: 80, region: 'Sul' },
  { code: 'RS', name: 'Rio Grande do Sul', x: 44, y: 92, region: 'Sul' },
  { code: 'SC', name: 'Santa Catarina', x: 50, y: 86, region: 'Sul' },
];

const REGION_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  Norte:         { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  Nordeste:      { dot: 'bg-red-500',     text: 'text-red-400',     bg: 'bg-red-500/20' },
  'Centro-Oeste': { dot: 'bg-amber-500',  text: 'text-amber-400',  bg: 'bg-amber-500/20' },
  Sudeste:       { dot: 'bg-yellow-400',   text: 'text-yellow-300', bg: 'bg-yellow-400/20' },
  Sul:           { dot: 'bg-violet-500',   text: 'text-violet-400', bg: 'bg-violet-500/20' },
};

const REGIONS = ['Todas', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

export const BrazilInteractiveMap = ({ onlineUsersByState, deviceStatsByState = {}, totalDeviceStats = { desktop: 0, mobile: 0 } }: BrazilInteractiveMapProps) => {
  const [hoveredState, setHoveredState] = useState<StatePosition | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  const getCount = (name: string) => onlineUsersByState[name] || 0;

  const totalOnline = useMemo(
    () => Object.values(onlineUsersByState).reduce((s, c) => s + c, 0),
    [onlineUsersByState]
  );

  const activeStates = useMemo(
    () => Object.entries(onlineUsersByState).filter(([, c]) => c > 0).length,
    [onlineUsersByState]
  );

  const filteredStates = useMemo(() => {
    return STATE_POSITIONS.filter((s) => {
      const regionMatch = selectedRegion === 'Todas' || s.region === selectedRegion;
      const searchMatch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
      return regionMatch && searchMatch;
    });
  }, [selectedRegion, searchQuery]);

  // Sorted list for sidebar
  const sortedOnlineStates = useMemo(() => {
    return STATE_POSITIONS
      .map((s) => ({ ...s, count: getCount(s.name) }))
      .filter((s) => {
        const regionMatch = selectedRegion === 'Todas' || s.region === selectedRegion;
        const searchMatch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
        return regionMatch && searchMatch;
      })
      .sort((a, b) => b.count - a.count);
  }, [onlineUsersByState, selectedRegion, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-600/80 text-white gap-1.5 px-3 py-1">
          <Wifi className="w-3 h-3" />
          {totalOnline} online
        </Badge>
        <Badge variant="outline" className="border-primary/40 text-primary gap-1.5 px-3 py-1">
          <MapPin className="w-3 h-3" />
          {activeStates} estados ativos
        </Badge>
        <Badge variant="outline" className="border-blue-400/40 text-blue-400 gap-1.5 px-3 py-1">
          <Monitor className="w-3 h-3" />
          {totalDeviceStats.desktop} desktop
        </Badge>
        <Badge variant="outline" className="border-orange-400/40 text-orange-400 gap-1.5 px-3 py-1">
          <Smartphone className="w-3 h-3" />
          {totalDeviceStats.mobile} mobile
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estado..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 bg-background/50"
          />
        </div>
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full sm:w-44 h-9 bg-background/50">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <Card className="lg:col-span-2 bg-gradient-card border-border/50 overflow-hidden">
          <CardContent className="p-0 relative" style={{ minHeight: 420 }}>
            <div className="relative w-full" style={{ paddingBottom: '100%' }}>
              <img
                src={brazilMapImg}
                alt="Mapa do Brasil"
                className="absolute inset-0 w-full h-full object-contain p-4"
                draggable={false}
              />

              {/* State markers */}
              <AnimatePresence>
                {filteredStates.map((state) => {
                  const count = getCount(state.name);
                  const hasUsers = count > 0;
                  const colors = REGION_COLORS[state.region];

                  return (
                    <motion.div
                      key={state.code}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      style={{ left: `${state.x}%`, top: `${state.y}%` }}
                      onMouseEnter={() => setHoveredState(state)}
                      onMouseLeave={() => setHoveredState(null)}
                    >
                      {/* Pulse ring for active states */}
                      {hasUsers && (
                        <span className={`absolute inset-0 rounded-full ${colors.dot} opacity-40 animate-ping`} />
                      )}

                      {/* Dot */}
                      <div
                        className={`relative w-4 h-4 rounded-full border-2 border-white/80 shadow-md transition-transform duration-200 group-hover:scale-[1.8]
                          ${hasUsers ? colors.dot : 'bg-gray-400/60'}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1 h-1 bg-white rounded-full" />
                        </div>
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="bg-black/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                          <div className="font-bold">{state.name} ({state.code})</div>
                          <div className="text-gray-400 text-[10px]">{state.region}</div>
                          {hasUsers ? (
                            <>
                              <div className={`${colors.text} font-semibold mt-0.5`}>
                                🟢 {count} usuário{count > 1 ? 's' : ''} online
                              </div>
                              <div className="flex gap-2 mt-0.5 text-[10px]">
                                {(deviceStatsByState[state.name]?.desktop || 0) > 0 && (
                                  <span className="text-blue-300">🖥️ {deviceStatsByState[state.name].desktop}</span>
                                )}
                                {(deviceStatsByState[state.name]?.mobile || 0) > 0 && (
                                  <span className="text-orange-300">📱 {deviceStatsByState[state.name].mobile}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-500 mt-0.5">Nenhum usuário</div>
                          )}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/95" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Region legend */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg p-2.5 text-[10px] space-y-1">
              {Object.entries(REGION_COLORS).map(([region, colors]) => (
                <div key={region} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className="text-white/80">{region}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: online user list */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Usuários por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[380px] overflow-y-auto space-y-1 pr-1">
            <AnimatePresence mode="popLayout">
              {sortedOnlineStates.map((state) => {
                const colors = REGION_COLORS[state.region];
                return (
                  <motion.div
                    key={state.code}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-center justify-between p-2 rounded-md transition-colors
                      ${hoveredState?.code === state.code ? 'bg-primary/10' : 'hover:bg-muted/40'}
                      ${state.count > 0 ? '' : 'opacity-50'}`}
                    onMouseEnter={() => setHoveredState(state)}
                    onMouseLeave={() => setHoveredState(null)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${state.count > 0 ? colors.dot : 'bg-gray-500'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{state.name}</div>
                        <div className="text-[10px] text-muted-foreground">{state.region}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {state.count > 0 && (
                        <>
                          {(deviceStatsByState[state.name]?.desktop || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-400">
                              <Monitor className="w-3 h-3" />
                              {deviceStatsByState[state.name].desktop}
                            </span>
                          )}
                          {(deviceStatsByState[state.name]?.mobile || 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                              <Smartphone className="w-3 h-3" />
                              {deviceStatsByState[state.name].mobile}
                            </span>
                          )}
                        </>
                      )}
                      <Badge
                        variant={state.count > 0 ? 'default' : 'secondary'}
                        className={`text-[10px] px-1.5 py-0 h-5 ${state.count > 0 ? 'bg-emerald-600 text-white' : ''}`}
                      >
                        {state.count}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {sortedOnlineStates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Nenhum estado encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
