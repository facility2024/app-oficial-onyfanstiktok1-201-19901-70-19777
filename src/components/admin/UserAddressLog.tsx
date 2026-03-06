import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Monitor, Smartphone, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface UserRecord {
  id: string;
  user_id: string | null;
  location_state: string | null;
  location_city: string | null;
  location_address: string | null;
  location_neighborhood: string | null;
  device_type: string | null;
  last_seen_at: string | null;
  is_online: boolean | null;
}

export const UserAddressLog = () => {
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRecords = async () => {
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('online_users')
        .select('id, user_id, location_state, location_city, location_address, location_neighborhood, device_type, last_seen_at, is_online')
        .gte('last_seen_at', fortyEightHoursAgo)
        .order('last_seen_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching address log:', error);
        return;
      }

      setRecords(data || []);
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    intervalRef.current = setInterval(fetchRecords, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h atrás`;
    return `${Math.floor(diffH / 24)}d atrás`;
  };

  const getDeviceIcon = (type: string | null) => {
    const t = (type || '').toLowerCase();
    if (t === 'desktop') return <Monitor className="w-3.5 h-3.5 text-blue-400" />;
    return <Smartphone className="w-3.5 h-3.5 text-orange-400" />;
  };

  const getDeviceLabel = (type: string | null) => {
    const t = (type || '').toLowerCase();
    if (t === 'desktop') return 'Desktop';
    if (t === 'tablet') return 'Tablet';
    return 'Mobile';
  };

  const buildAddress = (r: UserRecord) => {
    const parts: string[] = [];
    if (r.location_neighborhood) parts.push(r.location_neighborhood);
    if (r.location_city) parts.push(r.location_city);
    if (r.location_state) parts.push(r.location_state);
    if (parts.length === 0 && r.location_address) return r.location_address;
    return parts.join(', ') || 'Localização desconhecida';
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm">Registro de Acessos (48h)</CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {records.length} registros
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => { setIsLoading(true); fetchRecords(); }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[220px]">
          {isLoading && records.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs py-8">
              Carregando registros...
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs py-8">
              Nenhum registro nas últimas 48h
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              <AnimatePresence>
                {records.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />

                    {/* Device */}
                    <div className="flex items-center gap-1.5 min-w-[75px]">
                      {getDeviceIcon(r.device_type)}
                      <span className="text-[11px] font-medium">{getDeviceLabel(r.device_type)}</span>
                    </div>

                    {/* Address */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{buildAddress(r)}</p>
                      {r.location_address && (
                        <p className="text-[10px] text-muted-foreground truncate">{r.location_address}</p>
                      )}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{formatTime(r.last_seen_at)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
