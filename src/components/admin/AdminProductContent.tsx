import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageEditor } from "./AdminAccessPages";

interface Product { id: string; name: string; slug: string; }
interface AccessPage {
  id: string; product_id: string; slug: string | null;
  title: string; description: string | null; cover_url: string | null;
  is_published: boolean;
}

/**
 * Editor de Conteúdo do Produto (estilo Netflix).
 * Abre direto na tela de cards/módulos de UM produto,
 * criando a página de acesso automaticamente se não existir.
 * URL: /admin?tab=product-content&product=<id>
 */
export default function AdminProductContent() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const productId = params.get("product");

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState<AccessPage | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: pr } = await (supabase as any)
        .from("products").select("id, name, slug").eq("is_active", true).order("name");
      setProducts(pr ?? []);

      if (!productId) { setLoading(false); return; }

      // Busca a página do produto ou cria automaticamente
      const { data: existing } = await (supabase as any)
        .from("access_pages").select("*")
        .eq("product_id", productId).maybeSingle();

      if (existing) {
        setPage(existing);
        setLoading(false);
        return;
      }

      const prod = (pr ?? []).find((p: Product) => p.id === productId);
      if (!prod) {
        toast({ title: "Produto não encontrado", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: created, error } = await (supabase as any)
        .from("access_pages").upsert({
          product_id: prod.id, slug: prod.slug, title: prod.name, is_published: true,
        }, { onConflict: "product_id" }).select().single();

      if (error) {
        toast({ title: "Erro ao criar página", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      setPage(created);
      setLoading(false);
    })();
  }, [productId]);

  if (!productId) {
    return (
      <div className="p-6 text-center space-y-4">
        <Package className="w-10 h-10 mx-auto text-gray-500" />
        <p className="text-white font-bold">Selecione um produto</p>
        <p className="text-gray-400 text-sm">
          Vá em <b>Produtos & Liberações</b> e clique em <b>Conteúdo</b> no produto desejado.
        </p>
        <Button onClick={() => navigate("/admin?tab=products")}>
          Ir para Produtos
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-white">Não foi possível carregar a área do produto.</p>
        <Button variant="secondary" onClick={() => navigate("/admin?tab=products")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <PageEditor
      page={page}
      products={products}
      onBack={() => navigate("/admin?tab=products")}
    />
  );
}
