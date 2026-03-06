import { useEffect, useRef } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

interface ClusterPoint {
  lat: number;
  lng: number;
  label: string;
  count: number;
}

interface MapClustererProps {
  map: google.maps.Map | null;
  points: ClusterPoint[];
  visible: boolean;
  onMarkerClick?: (point: ClusterPoint) => void;
}

export const MapClustererLayer = ({ map, points, visible, onMarkerClick }: MapClustererProps) => {
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map || !visible) {
      // Clean up
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      return;
    }

    // Clear old
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Create markers
    const markers = points
      .filter(p => p.count > 0)
      .map(point => {
        const marker = new google.maps.Marker({
          position: { lat: point.lat, lng: point.lng },
          title: `${point.label}: ${point.count} usuários`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#10b981',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: Math.min(6 + point.count * 2, 18),
          },
        });

        marker.addListener('click', () => onMarkerClick?.(point));
        return marker;
      });

    markersRef.current = markers;

    // Create or update clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current.addMarkers(markers);
    } else {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        algorithm: new SuperClusterAlgorithm({ radius: 100 }),
        renderer: {
          render: ({ count, position }) => {
            const size = Math.min(30 + count * 3, 60);
            return new google.maps.Marker({
              position,
              icon: {
                url: createClusterSvg(count, size),
                scaledSize: new google.maps.Size(size, size),
                anchor: new google.maps.Point(size / 2, size / 2),
              },
              title: `${count} usuários`,
              zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });
    }

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, points, visible]);

  return null;
};

function createClusterSvg(count: number, size: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#10b981" fill-opacity="0.85" stroke="white" stroke-width="2"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 8}" fill="#059669" fill-opacity="0.6"/>
    <text x="${size/2}" y="${size/2 + 5}" text-anchor="middle" fill="white" font-size="${Math.max(12, size * 0.3)}" font-weight="bold" font-family="Arial">${count}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
