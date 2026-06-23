import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: { id: string; type?: string; amount: number; seller_id: string; title?: string };
};

type Step = "method" | "customer" | "pix" | "card" | "done";

export default function CheckoutDialog({ open, onOpenChange, item }: Props) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);

  const [customer, setCustomer] = useState({ name: "", email: "", document: "" });
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "" });
  const [pix, setPix] = useState<{ code?: string; image?: string; txid?: string } | null>(null);

  const reset = () => {
    setStep("method"); setMethod("pix"); setPix(null);
    setCustomer({ name: "", email: "", document: "" });
    setCard({ number: "", holder: "", expiry: "", cvv: "" });
  };

  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const submit = async () => {
    setLoading(true);
    const base = {
      item_id: item.id, item_type: item.type ?? "video",
      amount: item.amount, seller_id: item.seller_id, customer,
    };
    try {
      if (method === "pix") {
        const { data, error } = await supabase.functions.invoke("neonpay-pix", { body: base });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        const d = data as any;
        setPix({ code: d.pix_code, image: d.pix_qr_image, txid: d.transaction_id });
        await record(d, "pix", "pending");
        setStep("pix");
      } else {
        const [mm, yy] = card.expiry.split("/").map(s => s.trim());
        const body = {
          ...base,
          card: { number: card.number.replace(/\s/g, ""), holder_name: card.holder, exp_month: mm, exp_year: yy, cvv: card.cvv },
          installments: 1,
        };
        const { data, error } = await supabase.functions.invoke("neonpay-card", { body });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        const d = data as any;
        await record(d, "credit_card", d.status ?? "pending");
        setStep("done");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro no pagamento");
    } finally {
      setLoading(false);
    }
  };

  const record = async (d: any, pm: string, status = "pending") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("purchases").upsert({
      user_id: user.id,
      item_id: item.id,
      item_type: item.type ?? "video",
      seller_id: item.seller_id,
      amount: item.amount,
      commission_percentage: d.commission_percentage ?? null,
      platform_amount: d.platform_amount ?? null,
      seller_amount: d.seller_amount ?? null,
      payment_method: pm,
      transaction_id: d.transaction_id,
      status,
    }, { onConflict: "user_id,item_id" });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout {item.title ? `– ${item.title}` : ""}</DialogTitle>
        </DialogHeader>

        {step === "method" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Valor: R$ {item.amount.toFixed(2)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={method === "pix" ? "default" : "outline"} onClick={() => setMethod("pix")}>PIX</Button>
              <Button variant={method === "card" ? "default" : "outline"} onClick={() => setMethod("card")}>Cartão</Button>
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setStep("customer")}>Continuar</Button>
          </div>
        )}

        {step === "customer" && (
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="bg-gray-800 border-gray-700" /></div>
            <div><Label>Email</Label><Input type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="bg-gray-800 border-gray-700" /></div>
            <div><Label>CPF</Label><Input value={customer.document} onChange={e => setCustomer({ ...customer, document: e.target.value })} className="bg-gray-800 border-gray-700" /></div>
            <Button className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => method === "pix" ? submit() : setStep("card")}
              disabled={loading || !customer.name || !customer.email || !customer.document}>
              {loading ? "Processando..." : (method === "pix" ? "Gerar PIX" : "Continuar")}
            </Button>
          </div>
        )}

        {step === "card" && (
          <div className="space-y-3">
            <div><Label>Número do cartão</Label><Input value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} className="bg-gray-800 border-gray-700" /></div>
            <div><Label>Nome no cartão</Label><Input value={card.holder} onChange={e => setCard({ ...card, holder: e.target.value })} className="bg-gray-800 border-gray-700" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Validade (MM/AAAA)</Label><Input value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} className="bg-gray-800 border-gray-700" /></div>
              <div><Label>CVV</Label><Input value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} className="bg-gray-800 border-gray-700" /></div>
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={submit} disabled={loading}>
              {loading ? "Processando..." : `Pagar R$ ${item.amount.toFixed(2)}`}
            </Button>
          </div>
        )}

        {step === "pix" && pix && (
          <div className="space-y-3 text-center">
            {pix.image && <img src={pix.image} alt="QR PIX" className="mx-auto w-56 h-56 bg-white p-2 rounded" />}
            <Label>Código copia e cola</Label>
            <textarea readOnly value={pix.code} className="w-full h-24 p-2 bg-gray-800 border border-gray-700 rounded text-xs" />
            <Button onClick={() => { navigator.clipboard.writeText(pix.code ?? ""); toast.success("Copiado"); }} className="w-full">Copiar código</Button>
            <p className="text-xs text-gray-400">Após o pagamento, o acesso é liberado automaticamente.</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3 text-center">
            <p className="text-green-400 text-lg">Pagamento enviado!</p>
            <Button onClick={() => close(false)} className="w-full bg-green-600 hover:bg-green-700">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
