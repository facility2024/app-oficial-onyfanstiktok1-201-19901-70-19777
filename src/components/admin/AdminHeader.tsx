import React, { useState, useEffect } from 'react';
import { Bell, BookOpen, Smartphone, LogOut, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { PremiumStatusBadge } from './PremiumStatusBadge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import coconudiLogo from '@/assets/coconudi-logo-header.png';

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
    <header 
      className="sticky top-0 z-40 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-opacity-95"
      style={{
        background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
      }}
    >
      <div className="flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4 w-full">
        {/* Sidebar Toggle + Logo e Título */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <SidebarTrigger className="text-gray-900 hover:bg-black/10 p-2 rounded-lg" />
          <img 
            src={coconudiLogo} 
            alt="CocoNudi Logo" 
            className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 object-contain drop-shadow-lg cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate('/app')}
            title="Ir para Home"
          />
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 drop-shadow-sm leading-tight">
              <span className="hidden md:inline">CocoNudi Admin</span>
              <span className="hidden sm:inline md:hidden">Admin</span>
              <span className="sm:hidden">Admin</span>
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
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none shadow-md"
            title="Abrir Aplicativo TikTok"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">App</span>
          </Button>
          
          {/* Relógio */}
          <div className="flex flex-col items-center text-gray-900 text-xs leading-tight">
            <div className="font-bold text-xs sm:text-sm">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs opacity-70 hidden sm:block">
              {formatDate(currentTime)}
            </div>
          </div>
          
          {/* Notificações */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-black/10 text-gray-900"
              title="Notificações de Vendas"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center p-0 animate-bounce">
                  {notifications > 9 ? '9+' : notifications}
                </Badge>
              )}
            </Button>
          </div>

          {/* Informações do usuário */}
          <div className="flex items-center space-x-2 text-gray-900 text-xs">
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
            className="text-red-600 hover:text-red-700 hover:bg-red-100/50"
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