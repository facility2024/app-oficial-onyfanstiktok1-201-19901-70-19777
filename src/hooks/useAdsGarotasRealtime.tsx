import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdsGarotasRealtime(onChange?: () => void) {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("ads_garotas_top_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ads_garotas_top" },
        () => {
          setHasUpdate(true);
          onChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { hasUpdate, clear: () => setHasUpdate(false) };
}
