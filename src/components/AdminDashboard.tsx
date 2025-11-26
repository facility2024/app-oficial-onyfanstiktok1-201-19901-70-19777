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
import { AdminRoles } from './admin/AdminRoles';
import { AdminCreatorApplications } from './admin/AdminCreatorApplications';
import { AdminMarketplace } from './admin/AdminMarketplace';
import { LoginScreen } from './admin/LoginScreen';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { TikTokApp } from '@/pages/TikTokApp';
import { AdminVideoScheduler } from './admin/AdminVideoScheduler';

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

  // 🔒 VALIDAÇÃO DUPLA DE SEGURANÇA: Verificar se usuário é admin
  useEffect(() => {
    const validateAdminRole = async () => {
      if (!user) return;

      try {
        const { data: roleData, error } = await (supabase as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error || !roleData) {
          console.warn('⚠️ Tentativa de acesso não autorizado ao painel admin');
          
          // Registrar tentativa não autorizada
          await (supabase as any).from('analytics_events').insert({
            event_name: 'unauthorized_admin_dashboard_access',
            event_category: 'security',
            user_id: user.id,
            event_data: {
              timestamp: new Date().toISOString(),
              component: 'AdminDashboard',
              user_email: user.email
            }
          });

          // Fazer logout e redirecionar
          toast.error('Acesso não autorizado. Você será desconectado.');
          await supabase.auth.signOut();
          window.location.href = '/auth';
        }
      } catch (error) {
        console.error('Erro na validação de admin:', error);
      }
    };

    validateAdminRole();
  }, [user]);

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

  // Deep link: inicializa a aba a partir de ?tab=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const valid = ['home','app','posts','users','roles','creators','gamification','marketplace','videos','money','settings','documentation'];
    if (tab && valid.includes(tab)) {
      setActiveSection(tab);
    }
  }, []);

  // Mantém a URL em sincronia com a aba atual
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeSection);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeSection]);

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
      case 'roles':
        return <AdminRoles currentUserId={user?.id} />;
      case 'creators':
        return <AdminCreatorApplications currentUserId={user?.id} />;
      case 'gamification':
        return <AdminGamification />;
      case 'marketplace':
        return <AdminMarketplace />;
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
        return <AdminVideoScheduler />;
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