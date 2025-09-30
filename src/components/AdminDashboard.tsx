import React, { useState, useEffect } from 'react';
import { SaleNotification } from './admin/SaleNotification';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Play, 
  DollarSign, 
  Settings, 
  Home, 
  Gamepad2,
  Bell,
  Eye,
  EyeOff,
  Crown,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminHeader } from './admin/AdminHeader';
import { AdminNavigation } from './admin/AdminNavigation';
import { AdminStats } from './admin/AdminStats';
import { AdminCharts } from './admin/AdminCharts';
import { AdminContentTable } from './admin/AdminContentTable';
import { AdminUsers } from './admin/AdminUsers';
import { AdminGamification } from './admin/AdminGamification';
import { AdminVideos } from './admin/AdminVideos';
import { AdminMoney } from './admin/AdminMoney';
import { AdminSettings } from './admin/AdminSettings';
import { AdminDocumentation } from './admin/AdminDocumentation';
import { LoginScreen } from './admin/LoginScreen';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { TikTokApp } from '@/pages/TikTokApp';
import { AdminPosts } from './admin/AdminPosts';

export const AdminDashboard = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [notifications, setNotifications] = useState(0);
  const [webhookStatus, setWebhookStatus] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [showSaleNotification, setShowSaleNotification] = useState(false);

  // Gerenciar autenticação
  useEffect(() => {
    // Configurar listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Simular notificações em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => prev + 1);
      setShowSaleNotification(true);
    }, 300000); // 5 minutos = 300000ms

    return () => clearInterval(interval);
  }, []);

  // Atualizar último sync
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = (loggedInUser: SupabaseUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className="space-y-6">
            <AdminStats />
            <AdminCharts webhookStatus={webhookStatus} lastSync={lastSync} />
            <AdminContentTable />
          </div>
        );
      case 'users':
        return <AdminUsers />;
      case 'gamification':
        return <AdminGamification />;
      case 'videos':
        return <AdminVideos />;
      case 'money':
        return <AdminMoney />;
      case 'documentation':
        return <AdminDocumentation />;
      case 'settings':
        return <AdminSettings />;
      case 'app':
        return <TikTokApp />;
      case 'posts':
        return <AdminPosts />;
      default:
        return <div>Seção não encontrada</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user || !session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <>
      <SaleNotification 
        show={showSaleNotification} 
        onClose={() => setShowSaleNotification(false)} 
      />
      
      {/* Test App Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => window.open('/app', '_blank')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg"
        >
          🎵 Testar App TikTok
        </Button>
      </div>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <AdminHeader 
          notifications={notifications}
          setNotifications={setNotifications}
          user={user}
          onLogout={handleLogout}
        />
        
        <AdminNavigation 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          userId={user?.id}
        />
        
        <main className="max-w-full mx-auto py-2 sm:py-4 lg:py-6 px-2 sm:px-4 lg:px-6 pt-20">
          {renderContent()}
        </main>
      </div>
    </>
  );
};