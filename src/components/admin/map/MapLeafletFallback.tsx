import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StatePosition {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

interface LocalBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  is_sponsored: boolean;
}

interface MapLeafletFallbackProps {
  states: StatePosition[];
  getCount: (stateName: string) => number;
  showHeatmap: boolean;
  showClusters: boolean;
  showBusinesses: boolean;
}

const center: [number, number] = [-14.235, -51.9253];

const getRadius = (count: number) => {
  if (count <= 0) return 4;
  if (count <= 5) return 8;
  if (count <= 20) return 12;
  return 16;
};

const regionColor = {
  Norte: 'hsl(var(--chart-2))',
  Nordeste: 'hsl(var(--chart-5))',
  'Centro-Oeste': 'hsl(var(--chart-4))',
  Sudeste: 'hsl(var(--chart-1))',
  Sul: 'hsl(var(--chart-3))',
};

export const MapLeafletFallback = ({
  states,
  getCount,
  showHeatmap,
  showClusters,
  showBusinesses,
}: MapLeafletFallbackProps) => {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);

  const totalOnline = useMemo(
    () => states.reduce((sum, state) => sum + getCount(state.name), 0),
    [states, getCount]
  );

  const activeStates = useMemo(
    () => states.filter((state) => getCount(state.name) > 0),
    [states, getCount]
  );

  const clusteredByRegion = useMemo(() => {
    const grouped = activeStates.reduce<Record<string, StatePosition[]>>((acc, state) => {
      if (!acc[state.region]) acc[state.region] = [];
      acc[state.region].push(state);
      return acc;
    }, {});

    return Object.entries(grouped).map(([region, regionStates]) => {
      const total = regionStates.reduce((sum, state) => sum + getCount(state.name), 0);
      const lat = regionStates.reduce((sum, state) => sum + state.lat, 0) / regionStates.length;
      const lng = regionStates.reduce((sum, state) => sum + state.lng, 0) / regionStates.length;
      return { region, total, lat, lng, states: regionStates };
    });
  }, [activeStates, getCount]);

  useEffect(() => {
    if (!showBusinesses) {
      setBusinesses([]);
      return;
    }

    const fetchBusinesses = async () => {
      const { data } = await (supabase as any)
        .from('local_businesses')
        .select('id, name, category, address, latitude, longitude, rating, is_sponsored')
        .eq('is_active', true)
        .neq('latitude', 0)
        .neq('longitude', 0)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(400);

      setBusinesses((data as LocalBusiness[] | null) ?? []);
    };

    fetchBusinesses();
  }, [showBusinesses]);

  return (
    <div className="space-y-2 px-3 pb-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <MapPin className="h-3 w-3" />
          Fallback ativo (OpenStreetMap)
        </Badge>
        <Badge className="gap-1">{totalOnline} online</Badge>
        {showHeatmap && <Badge variant="secondary">Heatmap</Badge>}
        {showClusters && <Badge variant="secondary">Clusters</Badge>}
        {showBusinesses && <Badge variant="secondary">Comércios ({businesses.length})</Badge>}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60">
        <MapContainer
          center={center}
          zoom={4}
          minZoom={3}
          maxZoom={10}
          className="h-[520px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {showHeatmap &&
            activeStates.map((state) => {
              const count = getCount(state.name);
              return (
                <CircleMarker
                  key={`heat-${state.code}`}
                  center={[state.lat, state.lng]}
                  radius={Math.min(40, 10 + count * 1.2)}
                  pathOptions={{
                    color: 'hsl(var(--primary))',
                    fillColor: 'hsl(var(--primary))',
                    fillOpacity: 0.18,
                    weight: 0,
                  }}
                />
              );
            })}

          {showClusters
            ? clusteredByRegion.map((cluster) => (
                <CircleMarker
                  key={`cluster-${cluster.region}`}
                  center={[cluster.lat, cluster.lng]}
                  radius={Math.min(26, 12 + cluster.total * 0.2)}
                  pathOptions={{
                    color: regionColor[cluster.region as keyof typeof regionColor] ?? 'hsl(var(--primary))',
                    fillColor: regionColor[cluster.region as keyof typeof regionColor] ?? 'hsl(var(--primary))',
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="min-w-[170px] text-xs">
                      <p className="font-semibold">Cluster {cluster.region}</p>
                      <p className="text-muted-foreground">{cluster.states.length} estado(s) ativo(s)</p>
                      <p className="mt-1 font-medium">{cluster.total} usuários online</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            : states.map((state) => {
                const count = getCount(state.name);
                const active = count > 0;

                return (
                  <CircleMarker
                    key={state.code}
                    center={[state.lat, state.lng]}
                    radius={getRadius(count)}
                    pathOptions={{
                      color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      fillColor: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      fillOpacity: active ? 0.7 : 0.25,
                      weight: 1,
                    }}
                  >
                    <Popup>
                      <div className="min-w-[140px] text-xs">
                        <p className="font-semibold">
                          {state.name} ({state.code})
                        </p>
                        <p className="text-muted-foreground">{state.region}</p>
                        <p className="mt-1 font-medium">
                          {count} usuário{count !== 1 ? 's' : ''} online
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

          {showBusinesses &&
            businesses.map((biz) => (
              <CircleMarker
                key={`biz-${biz.id}`}
                center={[biz.latitude, biz.longitude]}
                radius={biz.is_sponsored ? 8 : 6}
                pathOptions={{
                  color: 'hsl(var(--accent))',
                  fillColor: 'hsl(var(--accent))',
                  fillOpacity: 0.85,
                  weight: biz.is_sponsored ? 2 : 1,
                }}
              >
                <Popup>
                  <div className="min-w-[180px] text-xs">
                    <p className="font-semibold">{biz.name}</p>
                    <p className="text-muted-foreground">{biz.category}</p>
                    <p className="mt-1 line-clamp-2">{biz.address}</p>
                    {biz.rating ? <p className="mt-1">⭐ {biz.rating.toFixed(1)}</p> : null}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
};
