import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const resolveProfile = async () => {
      if (!username) {
        navigate('/app');
        return;
      }

      const formattedUsername = username.toLowerCase();
      console.log('🔍 Resolvendo username:', formattedUsername);

      // 1. Tentar encontrar em models (modelos estáticos) - case insensitive
      const { data: model } = await supabase
        .from('models')
        .select('id')
        .ilike('username', formattedUsername)
        .maybeSingle();

      if (model) {
        console.log('✅ Encontrado modelo:', model.id);
        navigate('/app', { 
          replace: true, 
          state: { profileId: model.id, friendlyUrl: `/${username}` }
        });
        return;
      }

      // 2. Buscar criadores aprovados via user_roles primeiro
      // Usar cast para contornar tipos não gerados
      const { data: creatorRoles } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');

      if (creatorRoles && creatorRoles.length > 0) {
        const creatorIds = creatorRoles.map((r: { user_id: string }) => r.user_id);
        
        // Buscar perfis APENAS dos criadores
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', creatorIds);

        if (creatorProfiles) {
          // Buscar correspondência exata por nome formatado
          const matchingProfile = creatorProfiles.find(p => {
            if (!p.name) return false;
            const formattedName = p.name.toLowerCase().replace(/\s+/g, '-');
            return formattedName === formattedUsername;
          });

          if (matchingProfile) {
            console.log('✅ Encontrado criador:', matchingProfile.id, matchingProfile.name);
            navigate('/app', { 
              replace: true, 
              state: { profileId: matchingProfile.id, friendlyUrl: `/${username}` }
            });
            return;
          }
        }
      }

      // 3. Se não encontrou, redirecionar para 404
      console.log('❌ Username não encontrado:', username);
      navigate('/not-found', { replace: true });
    };

    resolveProfile();
  }, [username, navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
    </div>
  );
}
