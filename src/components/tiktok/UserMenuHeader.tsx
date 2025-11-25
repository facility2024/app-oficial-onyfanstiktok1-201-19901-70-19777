import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreatorRole } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { User, LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const UserMenuHeader = () => {
  const { user, profile, loading } = useCurrentUser();
  const { isCreator, loading: roleLoading } = useCreatorRole();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      // Flag para evitar reinicialização do usuário
      sessionStorage.setItem('logging_out', 'true');
      
      // Fazer signOut
      await supabase.auth.signOut();
      
      // Navegar para splash screen
      navigate('/', { replace: true });
      
      // Limpar flag após um tempo
      setTimeout(() => {
        sessionStorage.removeItem('logging_out');
      }, 500);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      sessionStorage.removeItem('logging_out');
      navigate('/', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="h-3 w-24 bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  // Se não tiver usuário, mostrar botão de login
  if (!user) {
    return (
      <div className="p-4 border-b border-white/10">
        <Button 
          onClick={() => navigate('/auth')}
          className="w-full"
          variant="default"
        >
          Fazer Login
        </Button>
      </div>
    );
  }

  // Se tiver usuário mas não perfil, usar dados básicos do auth
  const displayName = profile?.full_name || profile?.username || user.email?.split('@')[0] || 'Usuário';
  const displayUsername = profile?.username || user.email?.split('@')[0] || '';
  const displayEmail = profile?.email || user.email || '';

  return (
    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-600/10">
      {/* Avatar e Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <img 
            src={profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id} 
            alt={displayUsername || 'User'}
            className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base truncate">
            {displayName}
          </p>
          {displayUsername && (
            <p className="text-white/60 text-sm truncate">
              @{displayUsername}
            </p>
          )}
          {displayEmail && (
            <p className="text-white/40 text-xs truncate">
              {displayEmail}
            </p>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="space-y-2">
        <Button 
          onClick={() => navigate('/profile')}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <User className="w-4 h-4 mr-2" />
          Ver Perfil
        </Button>

        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (roleLoading) {
              toast.info('Verificando permissões...');
              return;
            }
            
            if (isCreator) {
              console.log('✅ Usuário é criador aprovado, indo para Creator Studio');
              navigate('/creator-studio');
            } else {
              console.log('ℹ️ Usuário não é criador, indo para formulário de aplicação');
              navigate('/creator-application');
            }
          }}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          disabled={roleLoading}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {roleLoading ? 'Verificando...' : (isCreator ? 'Creator Studio' : 'Espaço do Criador')}
        </Button>
        
        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogTrigger asChild>
            <Button 
              className="w-full bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-black border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-xl">
                Confirmar Saída
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/70 text-base">
                Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o aplicativo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white border-0"
              >
                Sair da Conta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
