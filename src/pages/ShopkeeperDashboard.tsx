import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Store, Package, DollarSign, Settings, Plus, Trash2, Edit, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  commission_rate: number;
  total_sales: number;
  total_revenue: number;
}

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  video_url: string | null;
  category: string;
  stock: number;
  is_active: boolean;
}

const ShopkeeperDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adminStoreId = searchParams.get('store_id');
  const { user } = useCurrentUser();
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', image_url: '', video_url: '', category: '', stock: '10',
  });
  const [saving, setSaving] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '', logo_url: '', banner_url: '' });

  useEffect(() => {
    if (adminStoreId) {
      fetchStoreById(adminStoreId);
    } else if (user?.id) {
      fetchStore();
    }
  }, [user?.id, adminStoreId]);

  const fetchStoreById = async (storeId: string) => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('marketplace_stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();
    if (data) {
      setStore(data);
      fetchProducts(data.id);
      fetchPayouts(data.id);
    }
    setLoading(false);
  };

  const fetchStore = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('marketplace_stores')
      .select('*')
      .eq('owner_id', user!.id)
      .maybeSingle();

    if (data) {
      setStore(data);
      fetchProducts(data.id);
      fetchPayouts(data.id);
    }
    setLoading(false);
  };

  const fetchProducts = async (storeId: string) => {
    const { data } = await (supabase as any)
      .from('marketplace_products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const fetchPayouts = async (storeId: string) => {
    const { data } = await (supabase as any)
      .from('store_payouts')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (data) setPayouts(data);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', image_url: '', video_url: '', category: '', stock: '10' });
    setShowProductModal(true);
  };

  const openEditProduct = (p: StoreProduct) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name, description: p.description || '', price: String(p.price),
      image_url: p.image_url || '', video_url: p.video_url || '', category: p.category || '', stock: String(p.stock),
    });
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!store) return;
    if (!productForm.name || !productForm.price) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }
    setSaving(true);
    const payload = {
      store_id: store.id,
      name: productForm.name,
      description: productForm.description,
      price: parseFloat(productForm.price),
      image_url: productForm.image_url || '/placeholder.svg',
      video_url: productForm.video_url || null,
      category: productForm.category || 'Geral',
      stock: parseInt(productForm.stock) || 0,
      is_active: true,
    };

    if (editingProduct) {
      const { error } = await (supabase as any)
        .from('marketplace_products')
        .update(payload)
        .eq('id', editingProduct.id);
      if (error) toast.error('Erro ao atualizar');
      else toast.success('Produto atualizado!');
    } else {
      const { error } = await (supabase as any)
        .from('marketplace_products')
        .insert(payload);
      if (error) toast.error('Erro ao criar produto');
      else toast.success('Produto criado!');
    }
    setSaving(false);
    setShowProductModal(false);
    fetchProducts(store.id);
  };

  const toggleProductActive = async (p: StoreProduct) => {
    await (supabase as any)
      .from('marketplace_products')
      .update({ is_active: !p.is_active })
      .eq('id', p.id);
    if (store) fetchProducts(store.id);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    await (supabase as any).from('marketplace_products').delete().eq('id', id);
    if (store) fetchProducts(store.id);
    toast.success('Produto removido');
  };

  const saveSettings = async () => {
    if (!store) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from('marketplace_stores')
      .update({
        name: settingsForm.name || store.name,
        description: settingsForm.description || null,
        logo_url: settingsForm.logo_url || null,
        banner_url: settingsForm.banner_url || null,
      })
      .eq('id', store.id);
    if (error) toast.error('Erro ao salvar');
    else { toast.success('Configurações salvas!'); fetchStore(); }
    setSaving(false);
    setShowSettingsModal(false);
  };

  // Fix mobile scroll
  React.useEffect(() => {
    document.documentElement.classList.add('allow-scroll');
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    return () => {
      document.documentElement.classList.remove('allow-scroll');
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-4">
        <Store className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Você ainda não tem uma loja</h2>
        <p className="text-muted-foreground text-center">Crie sua loja e comece a vender no marketplace do Coconudi!</p>
        <Button onClick={() => navigate('/marketplace/criar-loja')} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Criar Minha Loja
        </Button>
      </div>
    );
  }

  const totalLiquido = store.total_revenue * (1 - store.commission_rate);
  const totalComissao = store.total_revenue * store.commission_rate;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header com gradiente Coconudi */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/10 backdrop-blur-md shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app')} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Store className="w-5 h-5 text-white drop-shadow-md" />
          <h1 className="text-lg font-bold truncate text-white drop-shadow-sm">{store.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!store.is_active && (
            <span className="text-[10px] px-2 py-1 bg-black/30 text-yellow-200 rounded-full font-semibold backdrop-blur-sm">⏳ Aguardando aprovação</span>
          )}
          {store.is_active && (
            <span className="text-[10px] px-2 py-1 bg-black/30 text-green-200 rounded-full font-semibold backdrop-blur-sm">✅ Ativa</span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#7CB342]/20 to-[#558B2F]/10 border border-[#7CB342]/30 text-center">
            <p className="text-2xl font-bold text-[#7CB342]">{products.length}</p>
            <p className="text-xs text-gray-400">Produtos</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#7CB342]/20 to-[#558B2F]/10 border border-[#7CB342]/30 text-center">
            <p className="text-2xl font-bold text-[#7CB342]">R$ {totalLiquido.toFixed(2)}</p>
            <p className="text-xs text-gray-400">Receita (70%)</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#C4842E]/20 to-[#8B4513]/10 border border-[#C4842E]/30 text-center">
            <p className="text-2xl font-bold text-[#C4842E]">{store.total_sales}</p>
            <p className="text-xs text-gray-400">Vendas</p>
          </div>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="w-full bg-gray-900 border border-white/10">
            <TabsTrigger value="products" className="flex-1 data-[state=active]:bg-[#7CB342] data-[state=active]:text-white"><Package className="w-4 h-4 mr-1" /> Produtos</TabsTrigger>
            <TabsTrigger value="financial" className="flex-1 data-[state=active]:bg-[#C4842E] data-[state=active]:text-white"><DollarSign className="w-4 h-4 mr-1" /> Financeiro</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 data-[state=active]:bg-[#8B4513] data-[state=active]:text-white"><Settings className="w-4 h-4 mr-1" /> Config</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-4 space-y-4">
            <Button onClick={openNewProduct} className="w-full text-white font-bold" style={{ background: 'linear-gradient(to right, #7CB342, #558B2F)' }}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
            </Button>

            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-white/10 hover:border-[#7CB342]/40 transition-colors">
                    <img src={p.image_url || '/placeholder.svg'} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">R$ {p.price?.toFixed(2)} · Estoque: {p.stock}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleProductActive(p)} title={p.is_active ? 'Desativar' : 'Ativar'}>
                        {p.is_active ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditProduct(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gray-900 border border-white/10">
                <p className="text-xs text-gray-400">Receita Total</p>
                <p className="text-xl font-bold text-white">R$ {store.total_revenue.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900 border border-white/10">
                <p className="text-xs text-gray-400">Comissão ({(store.commission_rate * 100).toFixed(0)}%)</p>
                <p className="text-xl font-bold text-red-400">-R$ {totalComissao.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#7CB342]/20 to-[#558B2F]/10 border border-[#7CB342]/30 col-span-2">
                <p className="text-xs text-gray-400">Valor Líquido (seu)</p>
                <p className="text-2xl font-bold text-[#7CB342]">R$ {totalLiquido.toFixed(2)}</p>
              </div>
            </div>

            <h3 className="font-semibold mt-4">Histórico de Pagamentos</h3>
            {payouts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-white/10">
                    <div>
                      <p className="text-sm font-medium">R$ {p.store_amount?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {p.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="financial" className="hidden" />
          <TabsContent value="settings" className="mt-4 space-y-4">
            <Button
              onClick={() => {
                setSettingsForm({
                  name: store.name,
                  description: store.description || '',
                  logo_url: store.logo_url || '',
                  banner_url: store.banner_url || '',
                });
                setShowSettingsModal(true);
              }}
              variant="outline"
              className="w-full border-[#C4842E]/50 text-[#C4842E] hover:bg-[#C4842E]/10"
            >
              <Settings className="w-4 h-4 mr-2" /> Editar Configurações da Loja
            </Button>
            <div className="p-4 rounded-xl bg-gray-900 border border-white/10 space-y-2">
              <p className="text-sm"><strong>Nome:</strong> {store.name}</p>
              <p className="text-sm"><strong>Slug:</strong> /marketplace/loja/{store.slug}</p>
              <p className="text-sm"><strong>Comissão:</strong> {(store.commission_rate * 100).toFixed(0)}%</p>
              <p className="text-sm"><strong>Status:</strong> {store.is_active ? '✅ Ativa' : '⏳ Aguardando aprovação'}</p>
              {store.is_verified && <p className="text-sm"><strong>Verificada:</strong> ✅</p>}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} className="bg-muted" /></div>
            <div><Label>Descrição</Label><Textarea value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} className="bg-muted" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} className="bg-muted" /></div>
              <div><Label>Estoque</Label><Input type="number" value={productForm.stock} onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))} className="bg-muted" /></div>
            </div>
            <div><Label>Categoria</Label><Input value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))} className="bg-muted" placeholder="Ex: Roupas" /></div>
            <div><Label>URL da Imagem</Label><Input value={productForm.image_url} onChange={e => setProductForm(p => ({ ...p, image_url: e.target.value }))} className="bg-muted" /></div>
            <div><Label>URL do Vídeo</Label><Input value={productForm.video_url} onChange={e => setProductForm(p => ({ ...p, video_url: e.target.value }))} className="bg-muted" /></div>
            <Button onClick={saveProduct} disabled={saving} className="w-full bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader><DialogTitle>Configurações da Loja</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={settingsForm.name} onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))} className="bg-muted" /></div>
            <div><Label>Descrição</Label><Textarea value={settingsForm.description} onChange={e => setSettingsForm(p => ({ ...p, description: e.target.value }))} className="bg-muted" rows={3} /></div>
            <div><Label>URL do Logo</Label><Input value={settingsForm.logo_url} onChange={e => setSettingsForm(p => ({ ...p, logo_url: e.target.value }))} className="bg-muted" /></div>
            <div><Label>URL do Banner</Label><Input value={settingsForm.banner_url} onChange={e => setSettingsForm(p => ({ ...p, banner_url: e.target.value }))} className="bg-muted" /></div>
            <Button onClick={saveSettings} disabled={saving} className="w-full bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopkeeperDashboard;
