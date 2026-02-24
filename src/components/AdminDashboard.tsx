import React, { useState, useEffect, lazy, Suspense } from 'react';
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
import { AdminSidebar } from './admin/AdminSidebar';
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
import { AdminLocalBusinesses } from './admin/AdminLocalBusinesses';
import AdminModelChatPanels from './admin/AdminModelChatPanels';
import { AdminGenres } from './admin/AdminGenres';
import { AdminVIPUsers } from './admin/AdminVIPUsers';
import { AdminWebhookLogs } from './admin/AdminWebhookLogs';
import { AdminEmailEvents } from './admin/AdminEmailEvents';
import { AdminActivateVIP } from './admin/AdminActivateVIP';
import { AdminModelSubscriptions } from './admin/AdminModelSubscriptions';
import { AdminAffiliates } from './admin/AdminAffiliates';
import { AdminVideoCall } from './admin/AdminVideoCall';
import { AdminAds } from './admin/AdminAds';
import { AdminLive } from './admin/AdminLive';
import { AdminPromoAds } from './admin/AdminPromoAds';
import { AdminCadastros } from './admin/AdminCadastros';
import { LoginScreen } from './admin/LoginScreen';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { TikTokApp } from '@/pages/TikTokApp';
import { AdminVideoScheduler } from './admin/AdminVideoScheduler';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

// Lazy load AdminIntelligentFeed to avoid build issues
const AdminIntelligentFeed = lazy(() => import('./admin/AdminIntelligentFeed').then(mod => ({ default: mod.AdminIntelligentFeed })));

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
    const valid = ['home','app','posts','users','roles','creators','cadastros','gamification','marketplace','local-businesses','chat-panels','videos','genres','intelligent-feed','money','vip','model-subscriptions','webhook-logs','email-events','settings','documentation','video-call','live','ads','promo-ads'];
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
      case 'cadastros':
        return <AdminCadastros />;
      case 'gamification':
        return <AdminGamification />;
      case 'marketplace':
        return <AdminMarketplace />;
      case 'local-businesses':
        return <AdminLocalBusinesses />;
      case 'chat-panels':
        return <AdminModelChatPanels />;
      case 'ads':
        return <AdminAds />;
      case 'promo-ads':
        return <AdminPromoAds />;
      case 'videos':
        return <AdminVideos />;
      case 'genres':
        return <AdminGenres />;
      case 'intelligent-feed':
        return (
          <Suspense fallback={<div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
            <AdminIntelligentFeed />
          </Suspense>
        );
      case 'money':
        return <AdminMoney />;
      case 'affiliates':
        return <AdminAffiliates />;
      case 'video-call':
        return <AdminVideoCall />;
      case 'live':
        return <AdminLive />;
      case 'vip':
        return <AdminVIPUsers />;
      case 'model-subscriptions':
        return <AdminModelSubscriptions />;
      case 'webhook-logs':
        return <AdminWebhookLogs />;
      case 'email-events':
        return <AdminEmailEvents />;
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-lg text-white">Carregando...</div>
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
      
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-black">
          <AdminSidebar 
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            userId={user?.id}
          />
          
          <div className="flex-1 flex flex-col min-w-0">
            <AdminHeader 
              notifications={notifications}
              setNotifications={setNotifications}
              user={user}
              onLogout={handleLogout}
            />
            
            <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-auto">
              <div className="max-w-[1400px] mx-auto">
                {renderContent()}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};
