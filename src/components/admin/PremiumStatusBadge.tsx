import React from 'react';
import { Crown, Calendar, AlertCircle } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

export const PremiumStatusBadge = () => {
  const { isPremium, loading, premiumData, getDaysRemaining } = usePremiumStatus();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-full px-3 py-1 w-20 h-6"></div>
    );
  }

  if (!isPremium) {
    return (
      <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-500/20 border border-gray-400 rounded-full text-gray-400 text-xs">
        <AlertCircle className="w-3 h-3" />
        Gratuito
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining <= 7;

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 border rounded-full text-xs ${
      isExpiringSoon 
        ? 'bg-orange-500/20 border-orange-400 text-orange-300'
        : 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border-yellow-400 text-yellow-300'
    }`}>
      <Crown className="w-3 h-3" />
      Premium
      {daysRemaining > 0 && (
        <>
          <Calendar className="w-3 h-3" />
          {daysRemaining}d
        </>
      )}
    </div>
  );
};