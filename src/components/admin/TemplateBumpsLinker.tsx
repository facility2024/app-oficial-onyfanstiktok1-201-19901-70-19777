import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Bump {
  id: string;
  titulo: string;
  valor: number;
  ativo: boolean;
  template_ids: string[] | null;
}

interface Props {
  templateId: string | null; // null => template ainda não salvo
}

const formatBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const TemplateBumpsLinker = ({ templateId }: Props) => {
  const [bumps, setBumps] = useState<Bump[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("checkout_order_bumps")
      .select("id,titulo,valor,ativo,template_ids")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });
    setBumps((data as Bump[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = (supabase as any)
      .channel(`template-bumps-${templateId || "new"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkout_order_bumps" },
        () => load()
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const toggleLink = async (b: Bump, linked: boolean) => {
    if (!templateId) {
      toast.error("Salve a página PIX primeiro para vincular Order Bumps");
      return;
    }
    setSaving(b.id);
    const current = Array.isArray(b.template_ids) ? b.template_ids : [];
    const next = linked
      ? Array.from(new Set([...current, templateId]))
      : current.filter((id) => id !== templateId);
    const { error } = await (supabase as any)
      .from("checkout_order_bumps")
      .update({ template_ids: next })
      .eq("id", b.id);
    setSaving(null);
    if (error) return toast.error("Erro ao atualizar vínculo", { description: error.message });
    setBumps((prev) => prev.map((x) => (x.id === b.id ? { ...x, template_ids: next } : x)));
  };

  const parseAmount = (s: string) => {
    let n = s.trim().replace(/\s/g, "");
    if (n.includes(",") && n.includes(".")) n = n.replace(/\./g, "").replace(",", ".");
    else n = n.replace(",", ".");
    return Number(n);
  };

  const createInline = async () => {
    if (!templateId) return toast.error("Salve a página PIX primeiro");
    if (!newTitle.trim()) return toast.error("Título obrigatório");
    const valor = parseAmount(newValue);
    if (!Number.isFinite(valor) || valor < 0) return toast.error("Valor inválido");
    setCreating(true);
    const { error } = await (supabase as any).from("checkout_order_bumps").insert({
      titulo: newTitle.trim(),
      valor,
      ativo: true,
      ordem: 0,
      template_ids: [templateId],
    });
    setCreating(false);
    if (error) return toast.error("Erro ao criar", { description: error.message });
    toast.success("Order Bump criado e vinculado!");
    setNewTitle("");
    setNewValue("");
    load();
  };

  const linkedCount = templateId
    ? bumps.filter((b) => (b.template_ids || []).includes(templateId)).length
    : 0;

  return (
    <div className="border border-purple-500/40 rounded-lg p-3 bg-purple-500/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-bold">🎯 Order Bumps desta página</div>
          <div className="text-xs text-gray-400">
            Marque os bumps que devem aparecer neste checkout. As mudanças salvam automaticamente.
          </div>
        </div>
        {templateId && (
          <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">
            {linkedCount} vinculado(s)
          </span>
        )}
      </div>

      {!templateId && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2">
          Salve a página PIX primeiro para poder vincular os Order Bumps.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto space-y-1 border border-white/10 rounded bg-gray-900 p-2">
          {bumps.length === 0 && (
            <div className="text-xs text-gray-400 p-2">
              Nenhum Order Bump criado ainda. Use o formulário abaixo ou o painel "Order Bumps".
            </div>
          )}
          {bumps.map((b) => {
            const linked = templateId ? (b.template_ids || []).includes(templateId) : false;
            return (
              <label
                key={b.id}
                className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded"
              >
                <input
                  type="checkbox"
                  disabled={!templateId || saving === b.id}
                  checked={linked}
                  onChange={(e) => toggleLink(b, e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="font-semibold truncate flex-1">{b.titulo}</span>
                <span className="text-xs font-black text-emerald-300 whitespace-nowrap">
                  {formatBRL(b.valor)}
                </span>
                {!b.ativo && (
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                    OFF
                  </span>
                )}
                {saving === b.id && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                {linked && saving !== b.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </label>
            );
          })}
        </div>
      )}

      {/* Criação inline */}
      <div className="border-t border-white/10 pt-3 space-y-2">
        <div className="text-xs text-gray-300 font-semibold">➕ Criar novo Order Bump já vinculado</div>
        <div className="grid grid-cols-[1fr,110px,auto] gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título (ex: Pacote extra)"
            className="bg-gray-800 border-white/10 text-white text-sm h-9"
            disabled={!templateId}
          />
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="9,90"
            inputMode="decimal"
            className="bg-gray-800 border-white/10 text-white text-sm h-9"
            disabled={!templateId}
          />
          <Button
            onClick={createInline}
            disabled={creating || !templateId}
            className="bg-purple-600 hover:bg-purple-700 text-white h-9"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateBumpsLinker;
