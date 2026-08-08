import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnlineViewersData {
  desktop: number;
  mobile: number;
  total: number;
  views48h: number;
}

export function useOnlineViewers(configId: string | undefined) {
  const [data, setData] = useState<OnlineViewersData>({
    desktop: 0,
    mobile: 0,
    total: 0,
    views48h: 0,
  });

  useEffect(() => {
    if (!configId) return;

    const fetchData = async () => {
      const { data: counts } = await supabase.rpc('get_live_online_counts', {
        p_config_id: configId,
      });
      const { data: views } = await supabase.rpc('get_live_views_48h', {
        p_config_id: configId,
      });

      if (counts && Array.isArray(counts) && counts[0]) {
        setData({
          desktop: Number(counts[0].desktop_count),
          mobile: Number(counts[0].mobile_count),
          total: Number(counts[0].total_count),
          views48h: Number(views || 0),
        });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // polling 10s

    // Realtime fallback
    const channel = supabase
      .channel('active-sessions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_sessions' },
        fetchData
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [configId]);

  return data;
}
