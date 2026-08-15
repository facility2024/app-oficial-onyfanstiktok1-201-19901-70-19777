import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BlocoHorario = 'manha_09h' | 'meio_dia_12h' | 'noite_19h';

export const useVideoRotation = () => {
  const [currentBloco, setCurrentBloco] = useState<BlocoHorario | null>(null);

  const fetchCurrentBloco = useCallback(async () => {
    try {
      // Usando cast para any para contornar erro de tipagem temporário do Supabase Client
      const { data, error } = await (supabase as any).rpc('get_current_bloco');
      if (!error && data) {
        setCurrentBloco(data as BlocoHorario);
      }
    } catch (e) {
      console.error('Erro ao buscar bloco atual:', e);
    }
  }, []);

  const getVideoForCreator = useCallback(async (creatorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Usando cast para any para contornar erro de tipagem temporário do Supabase Client
      const { data, error } = await (supabase as any).rpc('get_video_for_block', {
        p_usuario_id: user.id,
        p_criadora_id: creatorId
      });

      if (error) {
        console.error('Erro ao buscar vídeo rotacionado:', error);
        return null;
      }

      return data as string; // UUID do vídeo
    } catch (e) {
      console.error('Erro na rotação de vídeo:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchCurrentBloco();
    
    // Atualizar a cada 15 minutos para checar mudança de bloco
    const interval = setInterval(fetchCurrentBloco, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCurrentBloco]);

  return {
    currentBloco,
    getVideoForCreator
  };
};
