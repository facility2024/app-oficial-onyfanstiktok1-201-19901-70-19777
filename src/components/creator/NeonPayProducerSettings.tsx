import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NeonPayProducerSettings() {
  const [producerId, setProducerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles").select("neonpay_producer_id").eq("id", user.id).maybeSingle();
      if (data?.neonpay_producer_id) setProducerId(data.neonpay_producer_id);
    })();
  }, []);

  const save = async () => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ neonpay_producer_id: producerId || null })
      .eq("id", userId);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Chave Neon salva");
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Ativação Neon</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label className="text-white">Producer ID (Neon)</Label>
        <Input
          placeholder="ex: prod_abc123"
          value={producerId} onChange={(e) => setProducerId(e.target.value)}
          className="bg-gray-800 text-white border-gray-700"
        />
        <Button onClick={save} disabled={loading} className="bg-green-600 hover:bg-green-700">
          {loading ? "Salvando..." : "Ativar"}
        </Button>
        <p className="text-xs text-gray-400">
          Pegue seu Producer ID em app.neonpay.com.br → Conta → Integração.
          Sem isso você não recebe os pagamentos.
        </p>
      </CardContent>
    </Card>
  );
}
