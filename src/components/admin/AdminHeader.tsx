import React, { useState, useEffect } from 'react';
import { Bell, Smartphone, LogOut, User, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { PremiumStatusBadge } from './PremiumStatusBadge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import coconudiLogo from '@/assets/coconudi-logo-header.png';

interface AdminHeaderProps {
  notifications: number;
  setNotifications: (count: number) => void;
  user: SupabaseUser;
  onLogout: () => void;
}

export const AdminHeader = ({ notifications: _legacyCount, setNotifications: _legacySet, user, onLogout }: AdminHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead } = useAdminNotifications();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  const typeColors: Record<string, string> = {
    sale: 'bg-green-500/20 text-green-400',
    creator_application: 'bg-purple-500/20 text-purple-400',
    new_user: 'bg-blue-500/20 text-blue-400',
    security: 'bg-red-500/20 text-red-400',
    vip_expired: 'bg-yellow-500/20 text-yellow-400',
  };

  const typeLabels: Record<string, string> = {
    sale: 'Venda',
    creator_application: 'Criador',
    new_user: 'Usuário',
    security: 'Segurança',
    vip_expired: 'VIP',
  };

  return (
    <header 
      className="sticky top-0 z-40 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-opacity-95"
      style={{
        background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
      }}
    >
      <div className="flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4 w-full">
        {/* Sidebar Toggle + Logo */}
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
          <PremiumStatusBadge />
          
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
            <div className="font-bold text-xs sm:text-sm">{formatTime(currentTime)}</div>
            <div className="text-xs opacity-70 hidden sm:block">{formatDate(currentTime)}</div>
          </div>
          
          {/* Notificações com Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2 hover:bg-black/10 text-gray-900"
                title="Notificações"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center p-0 animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0 bg-gray-900 border-gray-700" align="end">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-700">
                <h3 className="font-semibold text-white text-sm">Notificações ({unreadCount} novas)</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-green-400 hover:text-green-300 h-7 px-2">
                    <CheckCheck className="w-3 h-3 mr-1" /> Marcar lidas
                  </Button>
                )}
              </div>

              {/* List */}
              <ScrollArea className="max-h-80">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Nenhuma notificação nas últimas 24h
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex items-start gap-3 p-3 border-b border-gray-800 cursor-pointer transition-colors ${
                        n.read ? 'opacity-60' : 'bg-gray-800/50 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeColors[n.type] || 'bg-gray-700 text-gray-300'}`}>
                            {typeLabels[n.type] || n.type}
                          </span>
                          <span className="text-[10px] text-gray-500">{formatAgo(n.timestamp)}</span>
                          {!n.read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                        </div>
                        <p className="text-xs font-medium text-white truncate">{n.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{n.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* User info */}
          <div className="flex items-center space-x-2 text-gray-900 text-xs">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline max-w-32 truncate">{user.email}</span>
          </div>

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
