import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag } from "lucide-react";

interface Template {
  id: string;
  slug: string;
  amount: number;
  product_name: string;
  ordem: number;
}

interface Props {
  modelId?: string | null;
}

export const ModelCheckoutButtons = ({ modelId }: Props) => {
  const navigate = useNavigate();
  const [list, setList] = useState<Template[]>([]);

  useEffect(() => {
    if (!modelId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("checkout_templates")
        .select("id,slug,amount,product_name,ordem")
        .eq("model_id", modelId)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      setList((data as Template[]) || []);
    })();
  }, [modelId]);

  if (!modelId || list.length === 0) return null;

  return (
    <div className="px-4 pb-4 space-y-2">
      <h4 className="text-center text-white/60 text-xs uppercase font-semibold">
        🛒 Ofertas exclusivas
      </h4>
      {list.map((t) => (
        <button
          key={t.id}
          onClick={() => navigate(`/checkout/${t.slug}`)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-lg active:scale-95 transition-all animate-cta-attention"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingBag className="w-4 h-4 text-white shrink-0" />
            <span className="text-white font-bold text-sm truncate">
              {t.product_name || "Comprar agora"}
            </span>
          </div>
          <span className="text-white font-black text-base whitespace-nowrap">
            R$ {Number(t.amount).toFixed(2).replace(".", ",")}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ModelCheckoutButtons;
