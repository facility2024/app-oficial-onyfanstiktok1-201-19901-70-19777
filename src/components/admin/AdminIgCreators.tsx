import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Instagram, KeyRound, UserPlus, Copy, RefreshCw, Loader2, Trash2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  creator_user_id: string | null;
  created_at: string;
  video_count?: number;
};

const DEFAULT_PASSWORD = "123456";

export default function AdminIgCreators() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("models")
      .select("id, name, username, avatar_url, creator_user_id, created_at")
      .eq("category", "instagram")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else {
      const ids = (data ?? []).map((r) => r.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: vids } = await supabase.from("videos").select("model_id").in("model_id", ids);
        counts = (vids ?? []).reduce<Record<string, number>>((acc, v: any) => {
          acc[v.model_id] = (acc[v.model_id] || 0) + 1;
          return acc;
        }, {});
      }
      setRows((data ?? []).map((r) => ({ ...r, video_count: counts[r.id] || 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const emailFor = (r: Row) => `ig_${(r.username || r.name || r.id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9_.]+/g, "_")}@coconudi.app`;

  const call = async (payload: any) => {
    const { data, error } = await supabase.functions.invoke("ig-create-creator-account", { body: payload });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const createAccount = async (r: Row) => {
    setBusyId(r.id);
    try {
      const res = await call({ model_id: r.id });
      toast.success(`Conta criada: ${res.results?.[0]?.email}`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  };

  const resetPassword = async (r: Row) => {
    if (!confirm(`Resetar senha para ${DEFAULT_PASSWORD}?`)) return;
    setBusyId(r.id);
    try {
      await call({ model_id: r.id, reset_password: true });
      toast.success("Senha resetada para 123456");
    } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  };

  const deleteAccount = async (r: Row) => {
    const msg = `⚠️ EXCLUIR PERMANENTEMENTE "${r.name}"?\n\nIsso remove:\n• A modelo do app\n• ${r.video_count || 0} vídeo(s) e suas interações\n• A conta de login (se existir)\n\nEsta ação NÃO pode ser desfeita. Confirma?`;
    if (!confirm(msg)) return;
    if (!confirm(`Confirmação final: digite OK no próximo prompt.`)) return;
    const t = prompt(`Digite EXCLUIR para confirmar a remoção de "${r.name}":`);
    if ((t || "").trim().toUpperCase() !== "EXCLUIR") { toast.error("Cancelado"); return; }
    setBusyId(r.id);
    try {
      await call({ model_id: r.id, delete: true });
      toast.success("Excluído permanentemente");
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  };

  const backfillAll = async () => {
    if (!confirm("Criar conta de criadora para TODOS os perfis do Instagram sem conta?")) return;
    setBulk(true);
    try {
      const res = await call({ all_ig: true });
      toast.success(`${res.ok}/${res.total} contas criadas`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    setBulk(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.name || "").toLowerCase().includes(s) || (r.username || "").toLowerCase().includes(s);
  });

  const withoutAccount = rows.filter((r) => !r.creator_user_id).length;

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Modelos do Instagram (Criadoras)</h3>
            <p className="text-sm text-gray-400">
              Cada perfil vindo da ferramenta externa vira uma conta de criadora com email sintético e senha padrão <b>{DEFAULT_PASSWORD}</b>.
            </p>
          </div>
          <Button onClick={backfillAll} disabled={bulk || withoutAccount === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold">
            {bulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Criar contas ({withoutAccount})
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou @username"
            className="bg-gray-900 border-gray-700 text-white" />
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="flex gap-2 mb-3">
          <Badge className="bg-purple-600">Total: {rows.length}</Badge>
          <Badge className="bg-green-600">Com conta: {rows.length - withoutAccount}</Badge>
          <Badge className="bg-yellow-600">Sem conta: {withoutAccount}</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-left border-b border-gray-700">
              <tr>
                <th className="p-2">Perfil</th>
                <th className="p-2">Vídeos</th>
                <th className="p-2">Email de acesso</th>
                <th className="p-2">Senha</th>
                <th className="p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const email = emailFor(r);
                const has = !!r.creator_user_id;
                return (
                  <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-900/40">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <img src={r.avatar_url || "/default-avatar.svg"} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-700" />
                        <div>
                          <p className="text-white font-medium leading-tight">{r.name}</p>
                          <p className="text-gray-400 text-xs">@{r.username || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-gray-300">{r.video_count ?? 0}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <code className={`text-xs ${has ? "text-green-400" : "text-gray-500"}`}>{email}</code>
                        {has && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(email)}><Copy className="w-3 h-3" /></Button>}
                      </div>
                    </td>
                    <td className="p-2">
                      {has ? (
                        <div className="flex items-center gap-1">
                          <code className="text-xs text-green-400">{DEFAULT_PASSWORD}</code>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(DEFAULT_PASSWORD)}><Copy className="w-3 h-3" /></Button>
                        </div>
                      ) : <span className="text-gray-500 text-xs">—</span>}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        {!has ? (
                          <Button size="sm" onClick={() => createAccount(r)} disabled={busyId === r.id}
                            className="bg-green-600 hover:bg-green-700 text-white">
                            {busyId === r.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
                            Criar conta
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => resetPassword(r)} disabled={busyId === r.id}>
                            <KeyRound className="w-3 h-3 mr-1" /> Resetar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <p className="text-center text-gray-400 py-8">Nenhum perfil encontrado.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
