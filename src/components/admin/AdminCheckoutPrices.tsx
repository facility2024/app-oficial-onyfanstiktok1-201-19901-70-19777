import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, DollarSign } from "lucide-react";
import { fetchCheckoutPrices, saveCheckoutPrices } from "@/hooks/useCheckoutPrice";

export default function AdminCheckoutPrices() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [garotas, setGarotas] = useState("14.97");
  const [latinas, setLatinas] = useState("14.97");
  const [novidades, setNovidades] = useState("14.97");

  useEffect(() => {
    (async () => {
      const p = await fetchCheckoutPrices();
      setGarotas(p.garotas_top.toFixed(2));
      setLatinas(p.latinas.toFixed(2));
      setNovidades(p.novidades.toFixed(2));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const g = Number(garotas.replace(",", "."));
    const l = Number(latinas.replace(",", "."));
    const n = Number(novidades.replace(",", "."));
    if (!(g > 0) || !(l > 0) || !(n > 0)) {
      toast.error("Informe valores maiores que zero");
      return;
    }
    setSaving(true);
    try {
      await saveCheckoutPrices({ garotas_top: g, latinas: l, novidades: n });
      toast.success("Preços atualizados!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-fuchsia-500/40 bg-gradient-to-br from-purple-950/60 to-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-fuchsia-200">
          <DollarSign className="w-5 h-5" /> Preço do Checkout PIX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Garotas Top 10 (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={garotas}
                  onChange={(e) => setGarotas(e.target.value)}
                  className="bg-black/40 border-fuchsia-500/40 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Latinas 🌶️ (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={latinas}
                  onChange={(e) => setLatinas(e.target.value)}
                  className="bg-black/40 border-fuchsia-500/40 text-white"
                />
              </div>
            </div>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar preços
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
