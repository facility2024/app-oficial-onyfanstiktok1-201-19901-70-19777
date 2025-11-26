import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useBusinessFavorites = (businessId?: string) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (businessId) {
      checkIfFavorite();
    }
  }, [businessId]);

  const checkIfFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !businessId) return;

      const { data, error } = await (supabase as any)
        .from("business_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error("Error checking favorite:", error);
    }
  };

  const toggleFavorite = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Faça login para salvar favoritos");
        return;
      }

      if (!businessId) return;

      if (isFavorite) {
        // Remove do favoritos
        const { error } = await (supabase as any)
          .from("business_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("business_id", businessId);

        if (error) throw error;
        setIsFavorite(false);
        toast.success("Removido dos favoritos");
      } else {
        // Adiciona aos favoritos
        const { error } = await (supabase as any)
          .from("business_favorites")
          .insert({
            user_id: user.id,
            business_id: businessId,
          });

        if (error) {
          if (error.code === "23505") {
            toast.info("Já está nos favoritos");
            return;
          }
          throw error;
        }
        
        setIsFavorite(true);
        toast.success("Adicionado aos favoritos");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favoritos");
    } finally {
      setLoading(false);
    }
  };

  return {
    isFavorite,
    loading,
    toggleFavorite,
    checkIfFavorite,
  };
};

export const useGetBusinessFavorites = () => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("business_favorites")
        .select(`
          id,
          created_at,
          business_id,
          local_businesses (
            id,
            name,
            description,
            category,
            address,
            phone,
            website,
            latitude,
            longitude,
            rating,
            image_url,
            is_active,
            is_sponsored
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Erro ao carregar favoritos");
    } finally {
      setLoading(false);
    }
  };

  return {
    favorites,
    loading,
    refetch: fetchFavorites,
  };
};
