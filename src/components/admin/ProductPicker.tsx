import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

interface Product { id: string; name: string; image_url: string | null; }

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
}

export default function ProductPicker({ value, onChange }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, name, image_url")
        .eq("is_active", true)
        .order("name");
      setProducts(data || []);
    })();
  }, []);

  const selected = products.find((p) => p.id === value);

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${value ? "border-emerald-500/40 bg-emerald-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
      <Label className="text-white flex items-center gap-2 font-bold">
        {value ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
        Produto liberado após pagamento *
      </Label>
      <p className="text-xs text-gray-300">
        Sem produto vinculado, o comprador <b>não recebe acesso</b> após pagar. Escolha qual produto do catálogo será liberado.
      </p>

      {selected ? (
        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            {selected.image_url && <img src={selected.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
            <span className="text-emerald-200 text-sm font-semibold truncate">{selected.name}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => onChange(null)}
            className="border-red-500/40 text-red-300 hover:bg-red-500/10">
            <X className="w-3 h-3 mr-1" /> Remover
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen((o) => !o)}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
          {open ? "Fechar" : "Escolher produto"}
        </Button>
      )}

      {open && !selected && (
        <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/10">
          {products.length === 0 && (
            <div className="p-3 text-xs text-gray-400">Nenhum produto ativo no catálogo. Cadastre em "Produtos".</div>
          )}
          {products.map((p) => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-left">
              {p.image_url ? <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-white/10" />}
              <span className="text-white text-sm">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
