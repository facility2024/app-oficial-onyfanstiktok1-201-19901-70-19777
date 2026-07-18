import { useState } from "react";
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
  const [step, setStep] = useState<"wa" | "code">("wa");
  const [wa, setWa] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const send = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-buyer-code", {
        body: { whatsapp: wa },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Código enviado. Confira e digite abaixo.");
      if ((data as any)?.code) toast.message(`Código (debug): ${(data as any).code}`);
      setStep("code");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível enviar o código.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-buyer-code", {
        body: { whatsapp: wa, code },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      sessionStorage.setItem("buyer_whatsapp", (data as any).whatsapp);
      toast.success("Acesso liberado!");
      nav("/meus-acessos");
    } catch (e: any) {
      toast.error(e.message || "Código inválido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Área do Comprador</h1>
            <p className="text-sm text-gray-400">Acesse com o WhatsApp usado na compra</p>
          </div>
        </div>

        {step === "wa" ? (
          <>
            <Input
              placeholder="(11) 99999-9999"
              value={maskWa(wa)}
              onChange={(e) => setWa(e.target.value)}
              inputMode="tel"
              className="text-white"
            />
            <Button className="w-full" onClick={send} disabled={loading || wa.replace(/\D/g, "").length < 10}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar código"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400">Enviamos um código de 6 dígitos para {maskWa(wa)}.</p>
            <Input
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              className="text-white text-center text-2xl tracking-widest"
            />
            <Button className="w-full" onClick={verify} disabled={loading || code.length !== 6}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
            </Button>
            <button className="text-xs text-gray-400 underline w-full" onClick={() => setStep("wa")}>
              Alterar número
            </button>
          </>
        )}
      </div>
    </div>
  );
}
