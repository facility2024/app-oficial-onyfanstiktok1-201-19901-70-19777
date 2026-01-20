import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Timeout de segurança - se demorar mais de 10s, mostrar erro
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        console.error('⏱️ ProtectedRoute: Timeout ao verificar sessão');
        setError(true);
        setLoading(false);
      }
    }, 10000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Durante logout, apenas atualizar sessão, não redirecionar
        if (sessionStorage.getItem('logging_out')) {
          setSession(session);
          return;
        }

        setSession(session);
        setLoading(false);
        setError(false);
        
        // Limpar timeout se sessão foi resolvida
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('❌ Erro ao obter sessão:', sessionError);
        setError(true);
      }
      
      setSession(session);
      setLoading(false);
      
      // Limpar timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (!session && !sessionError) {
        navigate('/', { replace: true }); // Redirecionar para splash screen
      }
    }).catch((err) => {
      console.error('❌ Erro crítico ao verificar sessão:', err);
      setError(true);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate]);

  // Mostrar erro com opção de retry
  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Erro de Conexão
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Não foi possível verificar sua sessão. Verifique sua conexão e tente novamente.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setError(false);
                setLoading(true);
                window.location.reload();
              }}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Ir para Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar loading enquanto verifica
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // Não renderizar nada se não autenticado
  if (!session) {
    return null;
  }

  // Renderizar app se autenticado
  return <>{children}</>;
};
