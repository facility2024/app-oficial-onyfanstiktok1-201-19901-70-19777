import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

const maskWa = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export default function BuyerAccess() {
  const [wa, setWa] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const pre = sessionStorage.getItem("buyer_whatsapp_prefill");
    if (pre) setWa(pre);
  }, []);

  const unlock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("buyer-access", {
        body: { whatsapp: wa },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Número não encontrado.");
      }
      sessionStorage.setItem("buyer_whatsapp", (data as any).whatsapp);
      toast.success("Acesso liberado!");
      nav("/meus-acessos");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível liberar o acesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 bg-gray-950 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('https://COCONUDIMUDIAL.b-cdn.net/ANUNCIANTES%20COCONUDI/%26.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-gray-900/90 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Área do Comprador</h1>
            <p className="text-sm text-gray-300">Digite o WhatsApp usado na compra para liberar o acesso</p>
          </div>
        </div>

        <Input
          placeholder="(11) 99999-9999"
          value={maskWa(wa)}
          onChange={(e) => setWa(e.target.value)}
          inputMode="tel"
          className="text-white placeholder:text-gray-500 bg-gray-950/80 border-gray-700 caret-white"
        />
        <Button
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
          onClick={unlock}
          disabled={loading || wa.replace(/\D/g, "").length < 10}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Liberar meus acessos"}
        </Button>
      </div>
    </div>
  );
}
