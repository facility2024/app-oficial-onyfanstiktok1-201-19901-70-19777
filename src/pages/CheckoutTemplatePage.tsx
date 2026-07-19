import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import PixCheckoutModal from "@/components/PixCheckoutModal";

const CheckoutTemplatePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data } = await (supabase as any)
        .from("checkout_templates")
        .select("id")
        .eq("slug", slug)
        .eq("ativo", true)
        .maybeSingle();
      setStatus(data ? "ok" : "missing");
    })();
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-white text-lg font-bold">Checkout indisponível</p>
        <p className="text-gray-400 text-sm">Este link não existe ou foi desativado.</p>
        <button onClick={() => navigate("/app")}
          className="mt-4 px-6 py-3 rounded-lg bg-emerald-600 text-white font-bold">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <PixCheckoutModal
        open={open}
        onClose={() => {
          setOpen(false);
          if (window.history.length > 1) navigate(-1);
          else navigate("/app");
        }}
        templateSlug={slug}
      />
    </div>
  );
};

export default CheckoutTemplatePage;
