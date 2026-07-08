import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggingOut = useRef(false);
  const sessionChecked = useRef(false);

  const redirectUnauthenticated = () => {
    if (location.pathname === '/checkout') {
      localStorage.setItem('returnTo', location.pathname + location.search);
      localStorage.setItem('requiresLogin', 'true');
      navigate('/auth', { replace: true });
      return;
    }
    navigate('/', { replace: true });
  };

  useEffect(() => {
    // Listener de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[ProtectedRoute] Auth event:', event);

        // Se estiver fazendo logout explícito, deixar acontecer
        if (isLoggingOut.current || sessionStorage.getItem('logging_out')) {
          if (event === 'SIGNED_OUT') {
            setSession(null);
            isLoggingOut.current = false;
            sessionStorage.removeItem('logging_out');
            redirectUnauthenticated();
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          // Verificar se foi um logout real ou uma falha de refresh
          // Em mobile (iOS), o token pode falhar ao renovar quando volta do background
          // Tentar recuperar sessão antes de deslogar
          supabase.auth.getSession().then(({ data: { session: recoveredSession } }) => {
            if (recoveredSession) {
              console.log('[ProtectedRoute] Sessão recuperada após SIGNED_OUT falso');
              setSession(recoveredSession);
            } else {
              // Logout real - verificar se tem token no storage
              const storedSession = localStorage.getItem('sb-tnzvhwapfhkhqjgyiomk-auth-token');
              if (storedSession) {
                try {
                  const parsed = JSON.parse(storedSession);
                  if (parsed?.refresh_token) {
                    console.log('[ProtectedRoute] Tentando refresh com token armazenado...');
                    supabase.auth.refreshSession({ refresh_token: parsed.refresh_token }).then(({ data }) => {
                      if (data.session) {
                        console.log('[ProtectedRoute] Sessão restaurada via refresh!');
                        setSession(data.session);
                      } else {
                        console.log('[ProtectedRoute] Refresh falhou, redirecionando...');
                        setSession(null);
                        redirectUnauthenticated();
                      }
                    });
                    return;
                  }
                } catch (e) {
                  // ignore parse error
                }
              }
              setSession(null);
              redirectUnauthenticated();
            }
          });
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setSession(newSession);
        }

        // Para qualquer outro evento, atualizar sessão se existir
        if (newSession) {
          setSession(newSession);
        }
      }
    );

    // Verificar sessão existente
    if (!sessionChecked.current) {
      sessionChecked.current = true;
      supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
        if (existingSession) {
          setSession(existingSession);
        } else {
          redirectUnauthenticated();
        }
        setLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, [location.pathname, location.search, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};
