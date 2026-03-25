import React from 'react';
import { Home, Users, Gamepad2, Play, DollarSign, Settings, BookOpen, Shield, Sparkles, MapPin, Bot, Tags, Brain, Crown, FileText, Megaphone, Radio, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AdminNavigationProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  userId?: string;
}

export const AdminNavigation = ({ activeSection, setActiveSection, userId }: AdminNavigationProps) => {
  const { trackNavigation } = useAnalytics();
  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home, shortLabel: '🏠' },
    { id: 'videos', label: 'Vídeos', icon: Play, shortLabel: '🎬' },
    { id: 'genres', label: 'Gêneros', icon: Tags, shortLabel: '🎭' },
    { id: 'intelligent-feed', label: 'Feed IA', icon: Brain, shortLabel: '🧠' },
    { id: 'posts', label: 'Postagens', icon: BookOpen, shortLabel: '📝' },
    { id: 'users', label: 'Usuários', icon: Users, shortLabel: '👥' },
    { id: 'creators', label: 'Criadores', icon: Sparkles, shortLabel: '✨' },
    { id: 'marketplace', label: 'Marketplace', icon: Settings, shortLabel: '🛒' },
    { id: 'loja', label: 'Loja', icon: Store, shortLabel: '🏪' },
    { id: 'stores', label: 'Lojas SaaS', icon: Store, shortLabel: '🏬' },
    { id: 'local-businesses', label: 'Comércios', icon: MapPin, shortLabel: '📍' },
    { id: 'ads', label: 'Anúncios', icon: Megaphone, shortLabel: '📢' },
    { id: 'promo-ads', label: 'Promo Live', icon: Radio, shortLabel: '📺' },
    { id: 'chat-panels', label: 'Chat IA', icon: Bot, shortLabel: '🤖' },
    { id: 'gamification', label: 'Gamificação', icon: Gamepad2, shortLabel: '🎮' },
    { id: 'roles', label: 'Roles', icon: Shield, shortLabel: '🛡️' },
    { id: 'money', label: 'Financeiro', icon: DollarSign, shortLabel: '💰' },
    { id: 'vip', label: 'VIP', icon: Crown, shortLabel: '👑' },
    { id: 'webhook-logs', label: 'Webhooks', icon: FileText, shortLabel: '📋' },
    { id: 'email-events', label: 'E-mails', icon: FileText, shortLabel: '📧' },
    { id: 'settings', label: 'Configurações', icon: Settings, shortLabel: '⚙️' },
    { id: 'app', label: 'App', icon: Play, shortLabel: '🎵' },
    { id: 'documentation', label: 'Documentação', icon: BookOpen, shortLabel: '📘' },
  ];

  return (
    <nav 
      className="shadow-lg border-b border-white/10 fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      style={{
        background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
      }}
    >
      <div className="container">
        <div className="flex overflow-x-auto scrollbar-hide">
          <div className="flex space-x-1 sm:space-x-2 lg:space-x-4 py-2 sm:py-3 lg:py-4 min-w-max px-2 sm:px-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <Button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    trackNavigation(item.id, userId);
                  }}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm lg:text-base font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gray-900 text-white shadow-lg" 
                      : "text-gray-900 hover:bg-black/20 hover:text-gray-900"
                  )}
                >
                  <Icon className="w-4 h-4 mr-1 sm:mr-2 drop-shadow-md" />
                  <span className="hidden sm:inline drop-shadow-sm">{item.label}</span>
                  <span className="sm:hidden drop-shadow-sm">{item.shortLabel}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};