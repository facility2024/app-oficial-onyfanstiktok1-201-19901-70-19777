import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TimelineEvent {
  hour: number;
  state: string;
  count: number;
}

interface MapTimelineProps {
  visible: boolean;
  onHourChange: (hour: number, events: TimelineEvent[]) => void;
}

export const MapTimeline = ({ visible, onHourChange }: MapTimelineProps) => {
  const [hourlyData, setHourlyData] = useState<TimelineEvent[][]>(Array(24).fill([]));
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch 24h data
  useEffect(() => {
    if (!visible) return;

    const fetchData = async () => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('video_views')
        .select('created_at, location_state')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', now.toISOString())
        .not('location_state', 'is', null)
        .limit(1000);

      if (!data) return;

      // Group by hour
      const grouped: TimelineEvent[][] = Array.from({ length: 24 }, () => []);

      data.forEach((row: any) => {
        const hour = new Date(row.created_at).getHours();
        const state = row.location_state;
        const existing = grouped[hour].find(e => e.state === state);
        if (existing) {
          existing.count += 1;
        } else {
          grouped[hour].push({ hour, state, count: 1 });
        }
      });

      setHourlyData(grouped);
      setTotalEvents(data.length);
      setCurrentHour(now.getHours());
    };

    fetchData();
  }, [visible]);

  // Playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentHour(prev => {
          const next = (prev + 1) % 24;
          if (next === 0) setIsPlaying(false);
          return next;
        });
      }, 800);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  // Notify parent of hour change
  useEffect(() => {
    onHourChange(currentHour, hourlyData[currentHour] || []);
  }, [currentHour, hourlyData]);

  const handleSliderChange = useCallback((value: number[]) => {
    setCurrentHour(value[0]);
    setIsPlaying(false);
  }, []);

  if (!visible) return null;

  const currentEvents = hourlyData[currentHour] || [];
  const currentTotal = currentEvents.reduce((s, e) => s + e.count, 0);

  // Build bar chart data for the timeline strip
  const maxHourCount = Math.max(1, ...hourlyData.map(h => h.reduce((s, e) => s + e.count, 0)));

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">Timeline 24h</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {totalEvents} acessos hoje
          </Badge>
          <Badge className="bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0">
            {String(currentHour).padStart(2, '0')}:00 — {currentTotal} acessos
          </Badge>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-[2px] h-8">
        {hourlyData.map((events, hour) => {
          const count = events.reduce((s, e) => s + e.count, 0);
          const height = Math.max(2, (count / maxHourCount) * 100);
          const isActive = hour === currentHour;
          const isPast = hour < currentHour;
          return (
            <div
              key={hour}
              className={`flex-1 rounded-t cursor-pointer transition-all ${
                isActive
                  ? 'bg-primary shadow-lg shadow-primary/30'
                  : isPast
                    ? 'bg-primary/40'
                    : 'bg-muted-foreground/20'
              }`}
              style={{ height: `${height}%` }}
              onClick={() => { setCurrentHour(hour); setIsPlaying(false); }}
              title={`${String(hour).padStart(2, '0')}:00 — ${count} acessos`}
            />
          );
        })}
      </div>

      {/* Slider + controls */}
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => { setCurrentHour(0); setIsPlaying(false); }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <div className="flex-1">
          <Slider
            value={[currentHour]}
            min={0}
            max={23}
            step={1}
            onValueChange={handleSliderChange}
            className="cursor-pointer"
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-12 text-right">
          {String(currentHour).padStart(2, '0')}:00
        </span>
      </div>
    </div>
  );
};
