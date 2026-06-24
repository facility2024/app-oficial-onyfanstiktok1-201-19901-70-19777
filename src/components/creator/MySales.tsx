import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export default function MySales() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionPct, setCommissionPct] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [purchasesRes, txRes, commRes] = await Promise.all([
        supabase
          .from("purchases")
          .select("id, created_at, amount, platform_amount, seller_amount, neonpay_fee, seller_net, status, payment_method")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_transactions")
          .select("id, created_at, amount, platform_amount, creator_amount, creator_net_amount, neonpay_fee, status, plan_type")
          .eq("private_model_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("platform_settings").select("value").eq("key", "commission_percentage").maybeSingle(),
      ]);

      const pct = Number((commRes.data as any)?.value ?? 0);
      setCommissionPct(pct);

      const applyPct = (gross: number) => {
        const platform = Number((gross * (pct / 100)).toFixed(2));
        const net = Number((gross - platform).toFixed(2));
        return { platform, net };
      };

      const fromPurchases = (purchasesRes.data ?? []).map((p: any) => {
        const { platform, net } = applyPct(Number(p.amount || 0));
        return { ...p, platform_amount: platform, seller_net: net };
      });

      const fromTx = (txRes.data ?? []).map((t: any) => {
        const { platform, net } = applyPct(Number(t.amount || 0));
        return {
          id: `tx_${t.id}`,
          created_at: t.created_at,
          amount: t.amount,
          platform_amount: platform,
          seller_amount: net,
          seller_net: net,
          status: String(t.status || "").toLowerCase() === "approved" ? "paid" : "pending",
          payment_method: `privado ${t.plan_type ?? ""}`.trim(),
        };
      });

      const merged = [...fromPurchases, ...fromTx]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    const paid = rows.filter(r => r.status === "paid");
    return {
      count: paid.length,
      gross: paid.reduce((s, r) => s + Number(r.amount || 0), 0),
      net: paid.reduce((s, r) => s + Number(r.seller_net ?? r.seller_amount ?? 0), 0),
      platform: paid.reduce((s, r) => s + Number(r.platform_amount || 0), 0),
    };
  }, [rows]);

  const byDay = useMemo(() => {
    const map: Record<string, { day: string; bruto: number; liquido: number }> = {};
    rows.filter(r => r.status === "paid").forEach(r => {
      const day = r.created_at.slice(0, 10);
      if (!map[day]) map[day] = { day, bruto: 0, liquido: 0 };
      map[day].bruto += Number(r.amount || 0);
      map[day].liquido += Number(r.seller_net ?? r.seller_amount ?? 0);
    });
    return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);


  if (loading) return <div className="p-4 text-white">Carregando...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat title="Vendas pagas" value={String(totals.count)} />
        <Stat title="Bruto" value={fmt(totals.gross)} />
        <Stat title="Comissão app" value={fmt(totals.platform)} accent="text-amber-400" />
        <Stat title="Meu líquido" value={fmt(totals.net)} accent="text-green-400" />

      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader><CardTitle className="text-white">Histórico diário</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="day" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} formatter={(v: any) => fmt(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="bruto" stroke="#fff" />
              <Line type="monotone" dataKey="liquido" stroke="#7CB342" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader><CardTitle className="text-white">Transações</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-white">
            <thead className="text-gray-400">
              <tr><th className="text-left p-2">Data</th><th>Status</th><th>Método</th><th>Bruto</th><th>Comissão app</th><th>Líquido</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-gray-800">
                  <td className="p-2">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td className="text-center">{r.status}</td>
                  <td className="text-center">{r.payment_method ?? "—"}</td>
                  <td className="text-center">{fmt(Number(r.amount))}</td>
                  <td className="text-center text-amber-400">{fmt(Number(r.platform_amount ?? 0))}</td>
                  <td className="text-center text-green-400">{fmt(Number(r.seller_net ?? r.seller_amount ?? 0))}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 p-4">Sem vendas ainda</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value, accent = "text-white" }: { title: string; value: string; accent?: string }) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
        <div className="text-xs text-gray-400">{title}</div>
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
