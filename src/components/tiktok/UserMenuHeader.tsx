import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export const UserMenuHeader = () => {
  const { user, profile, loading } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
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

  if (!user || !profile) return null;

  return (
    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-600/10">
      {/* Avatar e Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <img 
            src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id} 
            alt={profile.username || 'User'}
            className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base truncate">
            {profile.full_name || profile.username || 'Usuário'}
          </p>
          {profile.username && (
            <p className="text-white/60 text-sm truncate">
              @{profile.username}
            </p>
          )}
          {profile.email && (
            <p className="text-white/40 text-xs truncate">
              {profile.email}
            </p>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-2">
        <Button 
          onClick={() => navigate('/profile')}
          variant="outline"
          size="sm"
          className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <User className="w-4 h-4 mr-2" />
          Ver Perfil
        </Button>
        
        <Button 
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
