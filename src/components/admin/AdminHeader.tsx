import React, { useState, useEffect } from 'react';
import { Bell, BookOpen, Smartphone, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { PremiumStatusBadge } from './PremiumStatusBadge';

interface AdminHeaderProps {
  notifications: number;
  setNotifications: (count: number) => void;
  user: SupabaseUser;
  onLogout: () => void;
}

export const AdminHeader = ({ notifications, setNotifications, user, onLogout }: AdminHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleNotificationClick = () => {
    setNotifications(0);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-gradient-dark border-border/40 backdrop-blur supports-[backdrop-filter]:bg-gradient-dark/95">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4">
        {/* Logo e Título */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-accent rounded-full blur-md opacity-60 animate-pulse"></div>
            <img 
              src="/lovable-uploads/8cacce58-4e74-4148-a1a0-c8b35b22b5b6.png" 
              alt="Logo Coroa" 
              className="relative w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 filter drop-shadow-lg"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-accent drop-shadow-lg leading-tight">
              <span className="hidden md:inline">Painel OnyFans & TikTok</span>
              <span className="hidden sm:inline md:hidden">Painel OF & TT</span>
              <span className="sm:hidden">Panel</span>
            </h1>
          </div>
        </div>

        {/* Seção Direita */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Premium Status Badge */}
          <PremiumStatusBadge />
          
          {/* Botão App TikTok */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none"
            title="Abrir Aplicativo TikTok"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">App</span>
          </Button>
          
          {/* Relógio */}
          <div className="flex flex-col items-center text-accent text-xs leading-tight">
            <div className="font-bold text-xs sm:text-sm">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs opacity-80 hidden sm:block">
              {formatDate(currentTime)}
            </div>
          </div>
          
          {/* Notificações */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-accent/20 text-accent"
              title="Notificações de Vendas"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs h-5 w-5 rounded-full flex items-center justify-center p-0 animate-bounce">
                  {notifications > 9 ? '9+' : notifications}
                </Badge>
              )}
            </Button>
          </div>

          {/* Informações do usuário */}
          <div className="flex items-center space-x-2 text-accent text-xs">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline max-w-32 truncate">
              {user.email}
            </span>
          </div>

          {/* Botão de Logout */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            title="Sair do sistema"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline ml-2">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};