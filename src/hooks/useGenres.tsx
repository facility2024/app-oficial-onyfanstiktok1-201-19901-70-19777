import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Genre {
  id: string;
  name: string;
  icon: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

const SELECTED_GENRE_KEY = 'selected_genre';

export const useGenres = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenreState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_GENRE_KEY);
      if (saved && saved !== 'Todos') return saved;
      return 'Hétero'; // Novo padrão
    } catch {
      return 'Hétero';
    }
  });

  // Carregar gêneros do banco de dados
  const fetchGenres = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('video_genres')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Erro ao carregar gêneros:', error);
        // Fallback para gêneros padrão se tabela não existir
        setGenres([
          { id: '1', name: 'Todos', icon: '🎬', display_order: 0, is_active: true },
          { id: '2', name: 'Fitness', icon: '💪', display_order: 1, is_active: true },
          { id: '3', name: 'Lifestyle', icon: '✨', display_order: 2, is_active: true },
          { id: '4', name: 'Sensual', icon: '🔥', display_order: 3, is_active: true },
          { id: '5', name: 'Dança', icon: '💃', display_order: 4, is_active: true },
          { id: '6', name: 'Moda', icon: '👗', display_order: 5, is_active: true },
          { id: '7', name: 'Beleza', icon: '💄', display_order: 6, is_active: true },
          { id: '8', name: 'Comédia', icon: '😂', display_order: 7, is_active: true },
        ]);
        return;
      }

      setGenres(data || []);
    } catch (error) {
      console.error('Erro ao carregar gêneros:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Selecionar gênero e salvar no localStorage
  const setSelectedGenre = useCallback((genreName: string) => {
    setSelectedGenreState(genreName);
    try {
      localStorage.setItem(SELECTED_GENRE_KEY, genreName);
      // Disparar evento para outros componentes
      window.dispatchEvent(new CustomEvent('genreChanged', { detail: { genre: genreName } }));
    } catch (error) {
      console.error('Erro ao salvar gênero:', error);
    }
  }, []);

  // Carregar gêneros na montagem
  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  // Escutar mudanças de gênero de outras abas/componentes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SELECTED_GENRE_KEY && e.newValue) {
        setSelectedGenreState(e.newValue);
      }
    };

    const handleGenreChange = (e: CustomEvent) => {
      if (e.detail?.genre) {
        setSelectedGenreState(e.detail.genre);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('genreChanged', handleGenreChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('genreChanged', handleGenreChange as EventListener);
    };
  }, []);

  return {
    genres,
    loading,
    selectedGenre,
    setSelectedGenre,
    refreshGenres: fetchGenres,
  };
};
