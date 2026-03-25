import React, { useState, useEffect } from 'react';
import { Store, Check, X, Eye, Loader2, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AdminStores = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStores(); }, []);

  const fetchStores = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('marketplace_stores')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setStores(data);
    setLoading(false);
  };

  const toggleActive = async (store: any) => {
    await (supabase as any)
      .from('marketplace_stores')
      .update({ is_active: !store.is_active })
      .eq('id', store.id);
    toast.success(store.is_active ? 'Loja desativada' : 'Loja aprovada!');
    fetchStores();
  };

  const toggleVerified = async (store: any) => {
    await (supabase as any)
      .from('marketplace_stores')
      .update({ is_verified: !store.is_verified })
      .eq('id', store.id);
    toast.success(store.is_verified ? 'Verificação removida' : 'Loja verificada!');
    fetchStores();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const pending = stores.filter(s => !s.is_active);
  const active = stores.filter(s => s.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Gestão de Lojas</h2>
        <span className="text-sm text-muted-foreground">({stores.length} total)</span>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-400">⏳ Aguardando Aprovação ({pending.length})</h3>
          {pending.map(store => (
            <StoreCard key={store.id} store={store} onToggleActive={toggleActive} onToggleVerified={toggleVerified} />
          ))}
        </div>
      )}

      {/* Active */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-green-400">✅ Lojas Ativas ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma loja ativa.</p>
        ) : (
          active.map(store => (
            <StoreCard key={store.id} store={store} onToggleActive={toggleActive} onToggleVerified={toggleVerified} />
          ))
        )}
      </div>
    </div>
  );
};

const StoreCard = ({ store, onToggleActive, onToggleVerified }: { store: any; onToggleActive: (s: any) => void; onToggleVerified: (s: any) => void }) => (
  <div className="p-4 rounded-xl bg-muted border border-border flex items-center gap-4">
    {store.logo_url ? (
      <img src={store.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
    ) : (
      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
        <Store className="w-6 h-6 text-primary" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="font-semibold truncate flex items-center gap-1">
        {store.name}
        {store.is_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
      </p>
      <p className="text-xs text-muted-foreground">/marketplace/loja/{store.slug}</p>
      <p className="text-xs text-muted-foreground">Comissão: {(store.commission_rate * 100).toFixed(0)}% · Vendas: {store.total_sales} · R$ {store.total_revenue?.toFixed(2)}</p>
    </div>
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={store.is_active ? 'destructive' : 'default'}
        onClick={() => onToggleActive(store)}
        className="text-xs"
      >
        {store.is_active ? <><X className="w-3 h-3 mr-1" /> Desativar</> : <><Check className="w-3 h-3 mr-1" /> Aprovar</>}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onToggleVerified(store)}
        className="text-xs"
      >
        <BadgeCheck className="w-3 h-3 mr-1" /> {store.is_verified ? 'Remover ✓' : 'Verificar'}
      </Button>
    </div>
  </div>
);
