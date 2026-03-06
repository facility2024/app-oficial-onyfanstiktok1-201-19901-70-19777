import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface StatePosition {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

interface MapLeafletFallbackProps {
  states: StatePosition[];
  getCount: (stateName: string) => number;
}

const center: [number, number] = [-14.235, -51.9253];

const getRadius = (count: number) => {
  if (count <= 0) return 4;
  if (count <= 5) return 8;
  if (count <= 20) return 12;
  return 16;
};

export const MapLeafletFallback = ({ states, getCount }: MapLeafletFallbackProps) => {
  const totalOnline = states.reduce((sum, state) => sum + getCount(state.name), 0);

  return (
    <div className="space-y-2 px-3 pb-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <MapPin className="h-3 w-3" />
          Fallback ativo (OpenStreetMap)
        </Badge>
        <Badge className="gap-1">
          {totalOnline} online
        </Badge>
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

          {states.map((state) => {
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
                    <p className="font-semibold">{state.name} ({state.code})</p>
                    <p className="text-muted-foreground">{state.region}</p>
                    <p className="mt-1 font-medium">{count} usuário{count !== 1 ? 's' : ''} online</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
