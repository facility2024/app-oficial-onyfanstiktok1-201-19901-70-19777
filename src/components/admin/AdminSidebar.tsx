import React from 'react';
import { 
  Home, 
  Users, 
  Gamepad2, 
  Play, 
  DollarSign, 
  Settings, 
  BookOpen, 
  Shield, 
  Sparkles, 
  MapPin, 
  Bot, 
  Tags, 
  Brain, 
  Crown, 
  FileText,
  Store,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface AdminSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  userId?: string;
}

const navigationGroups = [
  {
    label: 'Principal',
    items: [
      { id: 'home', label: 'Dashboard', icon: Home },
      { id: 'app', label: 'Ver App', icon: Play },
    ]
  },
  {
    label: 'Conteúdo',
    items: [
      { id: 'videos', label: 'Vídeos', icon: Play },
      { id: 'genres', label: 'Gêneros', icon: Tags },
      { id: 'intelligent-feed', label: 'Feed Inteligente', icon: Brain },
      { id: 'posts', label: 'Postagens', icon: Calendar },
    ]
  },
  {
    label: 'Usuários',
    items: [
      { id: 'users', label: 'Usuários', icon: Users },
      { id: 'creators', label: 'Criadores', icon: Sparkles },
      { id: 'roles', label: 'Permissões', icon: Shield },
    ]
  },
  {
    label: 'Negócios',
    items: [
      { id: 'marketplace', label: 'Marketplace', icon: Store },
      { id: 'local-businesses', label: 'Comércios Locais', icon: MapPin },
    ]
  },
  {
    label: 'Ferramentas',
    items: [
      { id: 'chat-panels', label: 'Painéis de Chat IA', icon: Bot },
      { id: 'gamification', label: 'Gamificação', icon: Gamepad2 },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'money', label: 'Financeiro', icon: DollarSign },
      { id: 'vip', label: 'Usuários VIP', icon: Crown },
      { id: 'webhook-logs', label: 'Webhooks', icon: FileText },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings', label: 'Configurações', icon: Settings },
      { id: 'documentation', label: 'Documentação', icon: BookOpen },
    ]
  },
];

export const AdminSidebar = ({ activeSection, setActiveSection, userId }: AdminSidebarProps) => {
  const { trackNavigation } = useAnalytics();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleItemClick = (itemId: string) => {
    setActiveSection(itemId);
    trackNavigation(itemId, userId);
  };

  return (
    <Sidebar 
      className="border-r border-white/10 bg-gradient-to-b from-gray-900 to-black"
      collapsible="icon"
    >
      <SidebarContent className="py-4">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-gray-400 text-xs uppercase tracking-wider px-4 mb-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleItemClick(item.id)}
                        tooltip={item.label}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                          isActive 
                            ? "bg-gradient-to-r from-green-600 to-amber-600 text-white shadow-lg" 
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className={cn(
                          "w-5 h-5 flex-shrink-0",
                          isActive ? "text-white" : "text-gray-400"
                        )} />
                        <span className={cn(
                          "truncate",
                          isCollapsed && "hidden"
                        )}>
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};
