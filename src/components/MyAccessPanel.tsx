import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserEntitlements } from "@/hooks/useUserEntitlements";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  slug: string;
  name: string;
  type: string;
  image_url: string | null;
  description: string | null;
  default_price: number;
  access_key: string;
}

/**
 * Painel "Meus Acessos": lista TODOS os produtos ativos.
 * Se o usuário tem entitlement, mostra "Acessar"; caso contrário, cadeado + "Comprar".
 */
export default function MyAccessPanel() {
  const nav = useNavigate();
  const { hasProduct, loading: entLoading, userId } = useUserEntitlements();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const buyerWa = typeof window !== "undefined" ? sessionStorage.getItem("buyer_whatsapp") : null;

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, slug, name, type, image_url, description, default_price, access_key")
        .eq("is_active", true)
        .order("type", { ascending: true })
        .order("name", { ascending: true });
      setProducts(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || entLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-white/70">
        <Loader2 className="animate-spin mr-2" /> Carregando seus acessos...
      </div>
    );
  }

  if (!userId && !buyerWa) {
    return (
      <div className="p-6 text-center text-white/80">
        <p className="mb-3">Faça login ou informe seu WhatsApp para ver seus produtos liberados.</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => nav("/auth")}>Entrar</Button>
          <Button variant="outline" onClick={() => nav("/acesso-comprador")}>Acessar por WhatsApp</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-4">
      <h2 className="text-white text-xl font-bold mb-2">Meus Acessos</h2>
      {products.length === 0 && (
        <p className="text-white/60 text-sm">Nenhum produto cadastrado.</p>
      )}
      {products.map((p) => {
        const unlocked = hasProduct(p.id);
        if (!unlocked) {
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 opacity-70"
            >
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-white/40" />
              </div>
              <p className="font-semibold text-white/70 truncate flex-1">{p.name}</p>
              <span className="text-xs text-white/40 uppercase tracking-wide">Bloqueado</span>
            </div>
          );
        }
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-green-500/40 bg-green-500/5 p-3"
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  <CheckCircle2 />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <p className="font-semibold text-white truncate">{p.name}</p>
              </div>
              {p.description && (
                <p className="text-xs text-white/60 line-clamp-1">{p.description}</p>
              )}
            </div>
            <Button size="sm" onClick={() => nav(`/acesso-produto/${p.id}`)}>Acessar</Button>

          </div>
        );
      })}
    </div>
  );
}
