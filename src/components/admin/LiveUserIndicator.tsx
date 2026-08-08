import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';

export const LiveUserIndicator = () => {
  const { stats, isLoading } = useRealTimeStats();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
          {stats.totalOnlineUsers} usuários online
        </Badge>
      </div>
      
      {Object.keys(stats.onlineUsersByState).length > 0 && (
        <div className="text-xs text-muted-foreground">
          {Object.keys(stats.onlineUsersByState).length} estados ativos
        </div>
      )}
    </div>
  );
};