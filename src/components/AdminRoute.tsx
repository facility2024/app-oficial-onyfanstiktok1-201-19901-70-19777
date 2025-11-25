import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }

        // Buscar role na tabela user_roles
        const { data: roleData, error } = await (supabase as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!roleData);
        }

        // Se não for admin, registrar tentativa não autorizada
        if (!roleData) {
          try {
            await (supabase as any).from('analytics_events').insert({
              event_name: 'unauthorized_admin_access_attempt',
              event_category: 'security',
              user_id: user.id,
              event_data: {
                timestamp: new Date().toISOString(),
                path: '/admin',
                user_email: user.email
              }
            });
          } catch (logError) {
            console.error('Erro ao registrar tentativa não autorizada:', logError);
          }

          toast.error('Acesso negado. Você não tem permissão para acessar o painel administrativo.');
          setTimeout(() => navigate('/app'), 1000);
        }
      } catch (error) {
        console.error('Erro na verificação de admin:', error);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminRole();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white mt-4">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
