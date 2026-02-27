import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Store, Image, Video, ExternalLink } from 'lucide-react';

interface PhysicalProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_urls: string[];
  video_url: string | null;
  purchase_url: string | null;
  price: number | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

const emptyForm = {
  name: '',
  description: '',
  category: 'geral',
  image_urls: '' as string, // comma-separated
  video_url: '',
  purchase_url: '',
  price: '',
  is_active: true,
  order_index: 0,
};

export const AdminPhysicalProducts = () => {
  const [products, setProducts] = useState<PhysicalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('physical_products')
      .select('*')
      .order('order_index', { ascending: true });
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: PhysicalProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      category: p.category || 'geral',
      image_urls: (p.image_urls || []).join(', '),
      video_url: p.video_url || '',
      purchase_url: p.purchase_url || '',
      price: p.price?.toString() || '',
      is_active: p.is_active,
      order_index: p.order_index,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    const imageUrls = form.image_urls.split(',').map(u => u.trim()).filter(Boolean);
    if (imageUrls.length === 0) { toast.error('Adicione pelo menos uma imagem (URL)'); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || 'geral',
      image_urls: imageUrls,
      video_url: form.video_url.trim() || null,
      purchase_url: form.purchase_url.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
      is_active: form.is_active,
      order_index: form.order_index,
    };

    if (editingId) {
      const { error } = await (supabase as any).from('physical_products').update(payload).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Produto atualizado!');
    } else {
      const { error } = await (supabase as any).from('physical_products').insert(payload);
      if (error) { toast.error('Erro ao criar'); return; }
      toast.success('Produto criado!');
    }
    setModalOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    await (supabase as any).from('physical_products').delete().eq('id', id);
    toast.success('Produto excluído');
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Store className="w-6 h-6 text-amber-400" />
          Produtos Físicos
        </h2>
        <Button onClick={openNew} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Produto
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-400">Nenhum produto cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className="bg-gray-900 border-white/10">
              <CardContent className="p-4 space-y-3">
                {p.image_urls?.[0] && (
                  <img src={p.image_urls[0]} alt={p.name} className="w-full h-40 object-cover rounded-lg" onError={e => { e.currentTarget.src = '/placeholder.svg'; }} />
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-bold">{p.name}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{p.description}</p>
                    {p.price && <span className="text-green-400 font-bold text-lg">R$ {p.price.toFixed(2)}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                  <Image className="w-3 h-3" /> {p.image_urls?.length || 0} imagens
                  {p.video_url && <><Video className="w-3 h-3 ml-2" /> Vídeo</>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="flex-1 text-white border-white/20">
                    <Edit className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-gray-900 text-white border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto Físico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Produto *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-gray-800 border-white/10" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="bg-gray-800 border-white/10" rows={3} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="bg-gray-800 border-white/10" placeholder="Ex: sex shop, masculino, feminino" />
            </div>
            <div>
              <Label>URLs das Imagens * (separadas por vírgula)</Label>
              <Textarea value={form.image_urls} onChange={e => setForm({...form, image_urls: e.target.value})} className="bg-gray-800 border-white/10" rows={2} placeholder="https://img1.jpg, https://img2.jpg" />
            </div>
            <div>
              <Label>URL do Vídeo (YouTube ou MP4)</Label>
              <Input value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})} className="bg-gray-800 border-white/10" placeholder="https://youtube.com/... ou https://cdn.../video.mp4" />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="bg-gray-800 border-white/10" placeholder="29.90" />
            </div>
            <div>
              <Label>Link de Compra (CTA)</Label>
              <Input value={form.purchase_url} onChange={e => setForm({...form, purchase_url: e.target.value})} className="bg-gray-800 border-white/10" placeholder="https://pagamento.com/produto" />
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input type="number" value={form.order_index} onChange={e => setForm({...form, order_index: parseInt(e.target.value) || 0})} className="bg-gray-800 border-white/10" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label>Produto ativo</Label>
            </div>
            <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700">
              {editingId ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
