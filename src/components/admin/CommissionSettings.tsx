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
        <p className="text-xs text-gray-400">
          O restante (100% − comissão) vai direto ao vendedor via split na NeonPay.
        </p>
      </CardContent>
    </Card>
  );
}
