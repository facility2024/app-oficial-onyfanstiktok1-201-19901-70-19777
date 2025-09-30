import React, { useEffect } from 'react';
import { X, DollarSign, User, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealSalesData } from '@/hooks/useRealSalesData';

interface SaleNotificationProps {
  show: boolean;
  onClose: () => void;
}

export const SaleNotification = ({ show, onClose }: SaleNotificationProps) => {
  const { currentSale } = useRealSalesData();

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show || !currentSale) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center p-4">
      <div className="animate-slide-in-top bg-gradient-to-r from-success via-primary to-accent p-[2px] rounded-lg shadow-2xl max-w-md w-full">
        <div className="bg-background rounded-lg p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <DollarSign className="w-5 h-5 text-success animate-pulse" />
                <div className="absolute inset-0 w-5 h-5 bg-success/20 rounded-full animate-ping"></div>
              </div>
              <h3 className="font-bold text-success">
                🎉 {currentSale.type === 'transaction' ? 'Nova Venda!' : 'Venda do Painel!'}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 hover:bg-destructive/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Sale Details */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Modelo:</span>
              <Badge variant="secondary" className="text-xs">
                {currentSale.modelName}
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">Cliente:</span>
              <span className="text-sm text-accent font-semibold">
                {currentSale.customerName}
              </span>
            </div>

            <div className="flex items-center justify-between bg-success/10 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">ID:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {currentSale.id.slice(0, 8)}
                </code>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-success">
                  R$ {currentSale.amount.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentSale.timestamp.toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1">
            <div className="bg-gradient-to-r from-success to-primary h-1 rounded-full animate-progress-decrease"></div>
          </div>
        </div>
      </div>
    </div>
  );
};