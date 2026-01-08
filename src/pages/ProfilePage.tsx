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

      console.log('🔍 Resolvendo username:', username);

      // 1. Tentar encontrar em models (modelos estáticos)
      const { data: model } = await supabase
        .from('models')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (model) {
        console.log('✅ Encontrado modelo:', model.id);
        // Navegar passando profileId via state e manter URL amigável
        navigate('/app', { 
          replace: true, 
          state: { profileId: model.id, friendlyUrl: `/${username}` }
        });
        return;
      }

      // 2. Tentar buscar por nome formatado (fallback para criadores)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .limit(50);

      if (profiles) {
        const matchingProfile = profiles.find(p => 
          p.name && p.name.toLowerCase().replace(/\s+/g, '-') === username.toLowerCase()
        );

        if (matchingProfile) {
          console.log('✅ Encontrado criador por nome:', matchingProfile.id);
          // Navegar passando profileId via state e manter URL amigável
          navigate('/app', { 
            replace: true, 
            state: { profileId: matchingProfile.id, friendlyUrl: `/${username}` }
          });
          return;
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
