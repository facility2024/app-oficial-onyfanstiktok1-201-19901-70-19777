import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Eye, Image, Video, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface FeedPromotion {
  id: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  display_name: string;
  media_url: string;
  media_type: string;
  banner_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  position_interval: number;
  is_active: boolean;
  priority: number;
  views_count: number;
  clicks_count: number;
  created_at: string;
}

const emptyForm = {
  title: '',
  description: '',
  avatar_url: '',
  display_name: '',
  media_url: '',
  media_type: 'image',
  banner_url: '',
  cta_text: 'Ver Mais',
  cta_link: '',
  position_interval: 5,
  is_active: true,
  priority: 0,
};

export const AdminFeedPromotions = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['admin-feed-promotions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('feed_promotions')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as FeedPromotion[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof emptyForm & { id?: string }) => {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        avatar_url: formData.avatar_url || null,
        display_name: formData.display_name,
        media_url: formData.media_url,
        media_type: formData.media_type,
        banner_url: formData.banner_url || null,
        cta_text: formData.cta_text || null,
        cta_link: formData.cta_link || null,
        position_interval: formData.position_interval,
        is_active: formData.is_active,
        priority: formData.priority,
      };

      if (formData.id) {
        const { error } = await (supabase as any)
          .from('feed_promotions')
          .update(payload)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('feed_promotions')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feed-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-promotions'] });
      toast.success(editingId ? 'Promoção atualizada!' : 'Promoção criada!');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('feed_promotions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feed-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-promotions'] });
      toast.success('Promoção excluída!');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('feed_promotions')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feed-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-promotions'] });
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (promo: FeedPromotion) => {
    setEditingId(promo.id);
    setForm({
      title: promo.title,
      description: promo.description || '',
      avatar_url: promo.avatar_url || '',
      display_name: promo.display_name,
      media_url: promo.media_url,
      media_type: promo.media_type,
      banner_url: promo.banner_url || '',
      cta_text: promo.cta_text || 'Ver Mais',
      cta_link: promo.cta_link || '',
      position_interval: promo.position_interval,
      is_active: promo.is_active,
      priority: promo.priority,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.display_name || !form.media_url) {
      toast.error('Preencha nome e URL da mídia');
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Promoções no Feed</h2>
          <p className="text-gray-400 text-sm">Cards promocionais intercalados no feed de vídeos</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Promoção
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Carregando...</div>
      ) : promotions.length === 0 ? (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="py-12 text-center">
            <Image className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Nenhuma promoção criada ainda</p>
            <p className="text-gray-500 text-sm mt-1">Clique em "Nova Promoção" para criar um card promocional no feed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <Card key={promo.id} className="bg-gray-900 border-gray-700 overflow-hidden">
              {/* Preview da mídia */}
              <div className="aspect-video bg-gray-800 relative">
                {promo.media_type === 'video' ? (
                  <video src={promo.media_url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={promo.media_url} alt={promo.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge variant={promo.is_active ? 'default' : 'secondary'} className={promo.is_active ? 'bg-green-600' : ''}>
                    {promo.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Badge variant="outline" className="text-white border-white/30">
                    {promo.media_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <Image className="w-3 h-3 mr-1" />}
                    {promo.media_type}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {promo.avatar_url && (
                    <img src={promo.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{promo.display_name}</p>
                    <p className="text-gray-400 text-xs truncate">{promo.title}</p>
                  </div>
                </div>

                {promo.cta_text && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <ExternalLink className="w-3 h-3" />
                    <span>CTA: {promo.cta_text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>👁 {promo.views_count} views</span>
                  <span>🖱 {promo.clicks_count} cliques</span>
                  <span>A cada {promo.position_interval} vídeos</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                  <Switch
                    checked={promo.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: promo.id, is_active: checked })}
                  />
                  <span className="text-gray-400 text-xs flex-1">{promo.is_active ? 'Ativo' : 'Inativo'}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(promo)} className="text-blue-400 hover:text-blue-300">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm('Excluir esta promoção?')) deleteMutation.mutate(promo.id); }} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Promoção' : 'Nova Promoção no Feed'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome de Exibição *</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Ex: mia_saaoud" className="bg-gray-800 border-gray-600" />
            </div>

            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título da promoção" className="bg-gray-800 border-gray-600" />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição que aparece no card" className="bg-gray-800 border-gray-600" rows={2} />
            </div>

            <div>
              <Label>URL do Avatar</Label>
              <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." className="bg-gray-800 border-gray-600" />
            </div>

            <div>
              <Label>Tipo de Mídia</Label>
              <Select value={form.media_type} onValueChange={(v) => setForm({ ...form, media_type: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>URL da Mídia (Imagem/Vídeo) *</Label>
              <Input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder="https://cdn.example.com/media.mp4" className="bg-gray-800 border-gray-600" />
            </div>

            <div>
              <Label>URL do Banner (rodapé do card)</Label>
              <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." className="bg-gray-800 border-gray-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Texto do CTA</Label>
                <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Ver Mais" className="bg-gray-800 border-gray-600" />
              </div>
              <div>
                <Label>Link do CTA</Label>
                <Input value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} placeholder="https://..." className="bg-gray-800 border-gray-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Intervalo (a cada X vídeos)</Label>
                <Input type="number" value={form.position_interval} onChange={(e) => setForm({ ...form, position_interval: parseInt(e.target.value) || 5 })} className="bg-gray-800 border-gray-600" />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} className="bg-gray-800 border-gray-600" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {saveMutation.isPending ? 'Salvando...' : (editingId ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
