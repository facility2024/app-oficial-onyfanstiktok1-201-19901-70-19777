import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

const SUPABASE_URL = "https://tnzvhwapfhkhqjgyiomk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuenZod2FwZmhraHFqZ3lpb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjM5MzUsImV4cCI6MjA2OTQzOTkzNX0.mWv0UEbkeczgKUMRaDm94Azo3Olgu3-sOnkZ7kamWuM";

// Cliente simples sem tipos complexos
const supabaseSimple = createClient(SUPABASE_URL, SUPABASE_KEY);

interface UserProfile {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface ProfileUpdates {
  full_name?: string;
  username?: string;
  email?: string;
  bio?: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const updateProfile = async (updates: ProfileUpdates) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      setUpdating(true);
      
      const { error }: any = await supabaseSimple
        .from('profiles')
        .update({
          name: updates.full_name || updates.username,
          email: updates.email,
          bio: updates.bio,
          username: updates.username,
        })
        .eq('id', user.id);

      if (error) throw error;

      if (profile) {
        setProfile({
          id: profile.id,
          full_name: updates.full_name ?? profile.full_name,
          username: updates.username ?? profile.username,
          email: updates.email ?? profile.email,
          bio: updates.bio ?? profile.bio,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
        });
      }
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error.message || 'Erro ao atualizar perfil');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      setUpdating(true);

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Apenas imagens são permitidas.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error }: any = await supabaseSimple.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabaseSimple.storage
        .from('avatars')
        .getPublicUrl(fileName);

      localStorage.setItem(`avatar_${user.id}`, publicUrl);

      if (profile) {
        setProfile({
          id: profile.id,
          email: profile.email,
          username: profile.username,
          full_name: profile.full_name,
          bio: profile.bio,
          avatar_url: publicUrl,
          created_at: profile.created_at,
        });
      }
      
      toast.success('Avatar atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload do avatar:', error);
      toast.error(error.message || 'Erro ao fazer upload do avatar');
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const ensureProfileExists = async (authUser: any) => {
    try {
      // Buscar perfil usando id
      let { data: profileData } = await supabaseSimple
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      // Se ainda não existir, criar perfil
      if (!profileData) {
        const { data: newProfile, error: insertError } = await supabaseSimple
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: authUser.email?.split('@')[0] || 'Usuário',
            role: 'user'
          })
          .select()
          .maybeSingle();

        if (!insertError && newProfile) {
          profileData = newProfile;
        }
      }

      // Transformar profileData em formato consistente
      if (profileData) {
        // Se name é igual ao email, usar apenas a parte antes do @
        const displayName = profileData.name && profileData.name !== profileData.email
          ? profileData.name
          : (authUser.email?.split('@')[0] || 'Usuário');
        
        const displayUsername = profileData.username || authUser.email?.split('@')[0] || '';

        return {
          ...profileData,
          displayName,
          displayUsername
        };
      }

      return profileData;
    } catch (error) {
      console.error('Erro ao verificar/criar perfil:', error);
      return null;
    }
  };

  const refetch = async () => {
    try {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabaseSimple.auth.getUser();
      
      if (authUser) {
        setUser(authUser);
        
        const profileData = await ensureProfileExists(authUser);
        
        if (profileData) {
          setProfile({
            id: profileData.id,
            email: profileData.email || authUser.email,
            username: (profileData as any).displayUsername || null,
            full_name: (profileData as any).displayName || null,
            avatar_url: localStorage.getItem(`avatar_${authUser.id}`) || profileData.avatar_url || null,
            bio: profileData.bio || null,
            created_at: profileData.created_at
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initUser = async () => {
      try {
        setLoading(true);
        
        const { data: { user: authUser } } = await supabaseSimple.auth.getUser();
        
        if (authUser && mounted) {
          setUser(authUser);
          
          const profileData = await ensureProfileExists(authUser);
          
          if (profileData && mounted) {
            setProfile({
              id: profileData.id,
              email: profileData.email || authUser.email,
              username: (profileData as any).displayUsername || null,
              full_name: (profileData as any).displayName || null,
              avatar_url: localStorage.getItem(`avatar_${authUser.id}`) || profileData.avatar_url || null,
              bio: profileData.bio || null,
              created_at: profileData.created_at
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initUser();

    const { data: { subscription } } = supabaseSimple.auth.onAuthStateChange((event, session) => {
      // Não reagir a eventos durante logout
      if (sessionStorage.getItem('logging_out')) {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(() => {
          initUser();
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    loading,
    updating,
    updateProfile,
    uploadAvatar,
    refetch
  };
};
