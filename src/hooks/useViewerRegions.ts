import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RegionCount {
  region: string;
  count: number;
}

interface SessionLocation {
  region: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  device_type: string;
}

export function useViewerRegions(configId: string | undefined) {
  const [regions, setRegions] = useState<RegionCount[]>([]);
  const [locations, setLocations] = useState<SessionLocation[]>([]);

  useEffect(() => {
    if (!configId) return;

    const fetchData = async () => {
      const { data } = await (supabase as any)
        .from('active_sessions')
        .select('region, city, neighborhood, address, device_type')
        .eq('config_id', configId)
        .gte(
          'last_seen_at',
          new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
        );

      if (!data) return;

      // Agrupa por estado
      const map: Record<string, number> = {};
      (data as SessionLocation[]).forEach((s) => {
        const r = s.region || 'Desconhecido';
        map[r] = (map[r] || 0) + 1;
      });

      setRegions(
        Object.entries(map)
          .map(([region, count]) => ({ region, count }))
          .sort((a, b) => b.count - a.count)
      );
      setLocations(data as SessionLocation[]);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [configId]);

  return { regions, locations, total: locations.length };
}
