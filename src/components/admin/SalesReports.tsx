import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type Purchase = {
  id: string;
  created_at: string;
  seller_id: string | null;
  amount: number;
  platform_amount: number | null;
  seller_amount: number | null;
  neonpay_fee: number | null;
  seller_net: number | null;
  status: string;
  payment_method: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const roundMoney = (value: number) => Number(value.toFixed(2));

const calculateSaleAmounts = (gross: number, commissionPct: number) => {
  const platform = roundMoney(gross * (commissionPct / 100));
  const sellerNet = roundMoney(gross - platform);
  return { platform, sellerNet };
};

export default function SalesReports() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [sellers, setSellers] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const fromTs = from;
    const toTs = to + "T23:59:59";

    const [purchasesRes, txRes, commRes] = await Promise.all([
      supabase
        .from("purchases")
        .select("id, created_at, seller_id, amount, platform_amount, seller_amount, neonpay_fee, seller_net, status, payment_method")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_transactions")
        .select("id, created_at, amount, platform_amount, creator_amount, creator_net_amount, neonpay_fee, status, plan_type, private_model_id")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("value").eq("key", "commission_percentage").maybeSingle(),
    ]);

    const pct = Number((commRes.data as any)?.value ?? 0);

    const fromPurchases = (purchasesRes.data ?? []).map((p: any) => {
      const gross = Number(p.amount || 0);
      const { platform, sellerNet } = calculateSaleAmounts(gross, pct);
      return { ...p, platform_amount: platform, seller_net: net };
    }) as Purchase[];

    const fromTx = (txRes.data ?? []).map((t: any) => {
      const gross = Number(t.amount || 0);
      const { platform, sellerNet } = calculateSaleAmounts(gross, pct);
      const st = String(t.status || "").toLowerCase();
      return {
        id: `tx_${t.id}`,
        created_at: t.created_at,
        seller_id: t.private_model_id ?? null,
        amount: gross,
        platform_amount: platform,
        seller_amount: sellerNet,
        neonpay_fee: Number(t.neonpay_fee ?? 0),
        seller_net: sellerNet,
        status: (st === "approved" || st === "confirmed" || st === "paid" || st === "received") ? "paid" : st,
        payment_method: `privado ${t.plan_type ?? ""}`.trim(),
      } as Purchase;
    });

    const list = [...fromPurchases, ...fromTx].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );
    setRows(list);

    const ids = Array.from(new Set(list.map(r => r.seller_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name, username").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.username || p.id.slice(0, 8); });
      setSellers(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const totals = useMemo(() => {
    const paid = rows.filter(r => r.status === "paid");
    const gross = paid.reduce((s, r) => s + Number(r.amount || 0), 0);
    const platform = paid.reduce((s, r) => s + Number(r.platform_amount || 0), 0);
    const fee = paid.reduce((s, r) => s + Number(r.neonpay_fee || 0), 0);
    const sellerNet = paid.reduce((s, r) => s + Number(r.seller_net ?? r.seller_amount ?? 0), 0);
    return { gross, platform, fee, sellerNet, count: paid.length };
  }, [rows]);

  const byDay = useMemo(() => {
    const map: Record<string, { day: string; bruto: number; plataforma: number; vendedor: number }> = {};
    rows.filter(r => r.status === "paid").forEach(r => {
      const day = r.created_at.slice(0, 10);
      if (!map[day]) map[day] = { day, bruto: 0, plataforma: 0, vendedor: 0 };
      map[day].bruto += Number(r.amount || 0);
      map[day].plataforma += Number(r.platform_amount || 0);
      map[day].vendedor += Number(r.seller_net ?? r.seller_amount ?? 0);
    });
    return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);

  const bySeller = useMemo(() => {
    const map: Record<string, { seller_id: string; count: number; gross: number; platform: number; fee: number; net: number }> = {};
    rows.filter(r => r.status === "paid").forEach(r => {
      const k = r.seller_id ?? "—";
      if (!map[k]) map[k] = { seller_id: k, count: 0, gross: 0, platform: 0, fee: 0, net: 0 };
      map[k].count += 1;
      map[k].gross += Number(r.amount || 0);
      map[k].platform += Number(r.platform_amount || 0);
      map[k].fee += Number(r.neonpay_fee || 0);
      map[k].net += Number(r.seller_net ?? r.seller_amount ?? 0);
    });
    return Object.values(map).sort((a, b) => b.gross - a.gross);
  }, [rows]);

  const pieData = [
    { name: "Plataforma", value: totals.platform },
    { name: "NeonPay", value: totals.fee },
    { name: "Vendedor", value: totals.sellerNet },
  ];
  const COLORS = ["#7CB342", "#f59e0b", "#3b82f6"];

  const exportCSV = () => {
    const head = "data,vendedor,status,metodo,bruto,plataforma,taxa_neonpay,liquido_vendedor\n";
    const body = rows.map(r => [
      r.created_at, sellers[r.seller_id ?? ""] ?? r.seller_id ?? "",
      r.status, r.payment_method ?? "",
      r.amount, r.platform_amount ?? 0, r.neonpay_fee ?? 0, r.seller_net ?? r.seller_amount ?? 0,
    ].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vendas_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label className="text-white">De</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-gray-800 text-white border-gray-700" /></div>
        <div><Label className="text-white">Até</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-gray-800 text-white border-gray-700" /></div>
        <Button onClick={load} disabled={loading} className="bg-green-600 hover:bg-green-700">{loading ? "Carregando..." : "Filtrar"}</Button>
        <Button onClick={exportCSV} variant="outline">Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat title="Vendas pagas" value={String(totals.count)} />
        <Stat title="Bruto" value={fmt(totals.gross)} />
        <Stat title="Comissão plataforma" value={fmt(totals.platform)} accent="text-green-400" />
        <Stat title="Taxa NeonPay" value={fmt(totals.fee)} accent="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white">Vendas por dia</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} formatter={(v: any) => fmt(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="bruto" stroke="#fff" />
                <Line type="monotone" dataKey="plataforma" stroke="#7CB342" />
                <Line type="monotone" dataKey="vendedor" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white">Distribuição</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader><CardTitle className="text-white">Por vendedor</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-white">
            <thead className="text-gray-400">
              <tr><th className="text-left p-2">Vendedor</th><th>Vendas</th><th>Bruto</th><th>Plataforma</th><th>NeonPay</th><th>Líquido</th></tr>
            </thead>
            <tbody>
              {bySeller.map(s => (
                <tr key={s.seller_id} className="border-t border-gray-800">
                  <td className="p-2">{sellers[s.seller_id] ?? s.seller_id.slice(0, 8)}</td>
                  <td className="text-center">{s.count}</td>
                  <td className="text-center">{fmt(s.gross)}</td>
                  <td className="text-center text-green-400">{fmt(s.platform)}</td>
                  <td className="text-center text-amber-400">{fmt(s.fee)}</td>
                  <td className="text-center text-blue-400">{fmt(s.net)}</td>
                </tr>
              ))}
              {bySeller.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 p-4">Sem vendas no período</td></tr>}
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
