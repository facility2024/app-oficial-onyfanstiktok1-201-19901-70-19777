import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar usuário autenticado
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (authUser) {
        setUser(authUser);
        
        // Buscar perfil do usuário
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Erro ao buscar perfil:', profileError);
        }
        
        if (profileData) {
          setProfile({
            id: profileData.id,
            user_id: authUser.id,
            email: profileData.email || authUser.email,
            username: profileData.name || null,
            full_name: profileData.name || null,
            avatar_url: null,
            bio: null,
            created_at: profileData.created_at
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = async (updates: any) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updates.full_name || updates.username,
          email: updates.email,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualizar estado local
      if (profile) {
        setProfile({
          ...profile,
          full_name: updates.full_name,
          username: updates.username,
          email: updates.email,
          bio: updates.bio,
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

      // Validar tamanho do arquivo (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas imagens são permitidas.');
        return;
      }

      // Nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload para storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública do avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Armazenar URL no localStorage como fallback
      localStorage.setItem(`avatar_${user.id}`, publicUrl);

      // Atualizar estado local
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: publicUrl,
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

  useEffect(() => {
    let mounted = true;

    const initUser = async () => {
      try {
        setLoading(true);
        
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        
        if (authUser && mounted) {
          setUser(authUser);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();
          
          if (profileData && mounted) {
            setProfile({
              id: profileData.id,
              user_id: authUser.id,
              email: profileData.email || authUser.email,
              username: profileData.name || null,
              full_name: profileData.name || null,
              avatar_url: localStorage.getItem(`avatar_${authUser.id}`) || null,
              bio: null,
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
    refetch: fetchCurrentUser
  };
};
