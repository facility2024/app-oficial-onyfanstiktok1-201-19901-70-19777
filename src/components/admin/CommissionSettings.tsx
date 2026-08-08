import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function CommissionSettings() {
  const [pct, setPct] = useState<string>("20");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "commission_percentage")
        .maybeSingle();
      if (data?.value !== undefined && data?.value !== null) setPct(String(data.value));
    })();
  }, []);

  const save = async () => {
    const n = Number(pct);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      toast.error("Informe um número entre 0 e 100");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "commission_percentage", value: n as any, updated_at: new Date().toISOString() });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Comissão atualizada");
  };

  const pctNum = Number(pct) || 0;
  // Preço mínimo para o split na NeonPay (5% + R$1) caber na comissão do app:
  // pctNum% * preço >= preço * 5% + R$1  →  preço >= 1 / (pctNum/100 - 0.05)
  const minPrice = pctNum > 5
    ? Math.max(1, Math.ceil((1 / (pctNum / 100 - 0.05)) * 100) / 100)
    : null;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Comissão da Plataforma (NeonPay)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label className="text-white">Porcentagem (%)</Label>
        <Input
          type="number" min={0} max={100} step="0.01"
          value={pct} onChange={(e) => setPct(e.target.value)}
          className="bg-gray-800 text-white border-gray-700"
        />
        <Button onClick={save} disabled={loading} className="bg-green-600 hover:bg-green-700">
          {loading ? "Salvando..." : "Salvar"}
        </Button>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
          <p className="font-semibold">Regra do split NeonPay</p>
          <p>Taxa da NeonPay: ~5% + R$ 1,00 por venda (absorvida do líquido do criador).</p>
          {minPrice ? (
            <p>
              Com <b>{pctNum}%</b> de comissão, preço mínimo recomendado do produto: <b>R$ {minPrice.toFixed(2)}</b>.
              Abaixo disso, a venda cai 100% no admin (fallback) e o repasse fica para conciliação manual.
            </p>
          ) : (
            <p>Comissão muito baixa — não cobre a taxa fixa da NeonPay. Use pelo menos <b>10%</b>.</p>
          )}
        </div>
        <p className="text-xs text-gray-400">
          O restante (100% − comissão) vai direto ao vendedor via split na NeonPay.
        </p>
      </CardContent>
    </Card>
  );
}
