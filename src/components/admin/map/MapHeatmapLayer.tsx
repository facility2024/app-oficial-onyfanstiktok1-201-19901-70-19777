import { useEffect, useRef } from 'react';

interface MapHeatmapLayerProps {
  points: { lat: number; lng: number; weight: number }[];
  visible: boolean;
}

/**
 * Custom Heatmap layer using Google Maps Visualization library.
 * Must load 'visualization' library in useJsApiLoader.
 */
export const MapHeatmapLayer = ({ points, visible }: MapHeatmapLayerProps) => {
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!visible || !window.google?.maps?.visualization) {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
      return;
    }

    const heatmapData = points.map(p =>
      ({ location: new google.maps.LatLng(p.lat, p.lng), weight: p.weight })
    );

    if (heatmapRef.current) {
      heatmapRef.current.setData(heatmapData);
    } else {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        radius: 40,
        opacity: 0.7,
        gradient: [
          'rgba(0, 0, 0, 0)',
          'rgba(16, 185, 129, 0.4)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(239, 68, 68, 1)',
        ],
      });
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
    };
  }, [points, visible]);

  return null;
};

/**
 * Standalone hook-like component that attaches heatmap to the map instance.
 */
export const HeatmapOverlay = ({ points, visible, map }: MapHeatmapLayerProps & { map: google.maps.Map | null }) => {
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !visible || !window.google?.maps?.visualization) {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
      return;
    }

    const heatmapData = points.map(p => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      weight: p.weight,
    }));

    if (!heatmapRef.current) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        radius: 45,
        opacity: 0.65,
        gradient: [
          'rgba(0, 0, 0, 0)',
          'rgba(16, 185, 129, 0.3)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(250, 204, 21, 0.6)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.9)',
          'rgba(220, 38, 38, 1)',
        ],
      });
      heatmapRef.current.setMap(map);
    } else {
      heatmapRef.current.setData(heatmapData);
      if (!heatmapRef.current.getMap()) {
        heatmapRef.current.setMap(map);
      }
    }
  }, [map, points, visible]);

  // Hide/show
  useEffect(() => {
    if (heatmapRef.current) {
      heatmapRef.current.setMap(visible && map ? map : null);
    }
  }, [visible, map]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
    };
  }, []);

  return null;
};
