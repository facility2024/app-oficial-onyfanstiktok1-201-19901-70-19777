import React from 'react';
import { Home, Users, Gamepad2, Play, DollarSign, Settings, BookOpen, Shield, Sparkles, MapPin, Bot, Tags, Brain } from 'lucide-react';
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
    { id: 'local-businesses', label: 'Comércios', icon: MapPin, shortLabel: '📍' },
    { id: 'chat-panels', label: 'Chat IA', icon: Bot, shortLabel: '🤖' },
    { id: 'gamification', label: 'Gamificação', icon: Gamepad2, shortLabel: '🎮' },
    { id: 'roles', label: 'Roles', icon: Shield, shortLabel: '🛡️' },
    { id: 'money', label: 'Financeiro', icon: DollarSign, shortLabel: '💰' },
    { id: 'settings', label: 'Configurações', icon: Settings, shortLabel: '⚙️' },
    { id: 'app', label: 'App', icon: Play, shortLabel: '🎵' },
    { id: 'documentation', label: 'Documentação', icon: BookOpen, shortLabel: '📘' },
  ];

  return (
    <nav className="bg-black/80 shadow-lg border-b border-white/10 fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
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
                    "flex items-center px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm lg:text-base font-medium transition-all duration-200 shadow-elegant",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-glow" 
                      : "text-primary-foreground/70 hover:bg-primary/20 hover:text-primary-foreground"
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