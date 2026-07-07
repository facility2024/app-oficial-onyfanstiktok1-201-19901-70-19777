import { DEFAULT_AVATAR } from '@/constants/defaultAvatar';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Eye, Image, Video, ExternalLink, Calendar, Clock, Copy, Share2, Link, CheckCircle, Send, Search } from 'lucide-react';
import { toast } from 'sonner';

// Detecta se uma URL é vídeo — tolerante a Bunny.net, HLS, paths codificados e querystring
const detectIsVideo = (raw: string): boolean => {
  if (!raw) return false;
  let url = raw.trim();
  try { url = decodeURIComponent(url); } catch {}
  const path = url.split('?')[0].split('#')[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v|mkv|avi|m3u8|ts)$/i.test(path)) return true;
  // Bunny.net stream/pull zones: qualquer indício de vídeo no path
  if (/b-cdn\.net/i.test(url) && /(mp4|webm|mov|m3u8|\/video\/|\/videos\/|\/stream\/|\/play)/i.test(path)) return true;
  return false;
};

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
  schedule_date: string | null;
  schedule_status: string | null;
  model_id: string | null;
  shareable_link: string | null;
  daily_frequency: number;
  cta_mode: string;
  popup_media_url: string | null;
  popup_media_type: string | null;
  popup_cta_text: string | null;
  popup_cta_link: string | null;
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
  schedule_date: '',
  schedule_time: '',
  send_now: true,
  create_model: false,
  daily_frequency: 3,
  cta_mode: 'link',
  popup_media_url: '',
  popup_media_type: 'image',
  popup_cta_text: 'Comprar Agora',
  popup_cta_link: '',
};

export const AdminFeedPromotions = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingModelData, setPendingModelData] = useState<{ username: string; generatedId: string } | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ id: string; modelId?: string; shareableLink: string } | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 10;
  const modalInputClass = 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400';

  // Autocomplete state for display_name
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; avatar_url: string | null; type: 'model' | 'creator' }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchEntities = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const q = `%${query}%`;
    // Search models
    const { data: models } = await supabase.from('models').select('id, name, avatar_url').ilike('name', q).limit(5);
    // Search approved creators via user_roles + profiles
    const { data: creatorRoles } = await (supabase as any).from('user_roles').select('user_id').eq('role', 'creator');
    let creatorResults: Array<{ id: string; name: string; avatar_url: string | null; type: 'creator' }> = [];
    if (creatorRoles && creatorRoles.length > 0) {
      const ids = creatorRoles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', ids).ilike('name', q).limit(5);
      creatorResults = (profiles || []).map((p: any) => ({ id: p.id, name: p.name || 'Sem nome', avatar_url: p.avatar_url, type: 'creator' as const }));
    }
    const modelResults = (models || []).map((m: any) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url, type: 'model' as const }));
    const all = [...modelResults, ...creatorResults];
    setSuggestions(all);
    setShowSuggestions(all.length > 0);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) && inputRef.current !== e.target) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    mutationFn: async (formData: typeof emptyForm & { id?: string; model_id?: string }) => {
      // Build schedule_date from date + time
      let scheduleDateValue: string | null = null;
      if (!formData.send_now && formData.schedule_date && formData.schedule_time) {
        scheduleDateValue = `${formData.schedule_date}T${formData.schedule_time}:00`;
      }

      const payload: any = {
        title: formData.title,
        description: formData.description || null,
        avatar_url: formData.avatar_url || null,
        display_name: formData.display_name,
        media_url: formData.media_url,
        media_type: formData.media_type,
        banner_url: formData.banner_url || null,
        cta_text: formData.cta_text || null,
        cta_link: formData.cta_link || null,
        cta_mode: formData.cta_mode || 'link',
        popup_media_url: formData.popup_media_url || null,
        popup_media_type: formData.popup_media_type || 'image',
        popup_cta_text: formData.popup_cta_text || null,
        popup_cta_link: formData.popup_cta_link || null,
        position_interval: formData.position_interval,
        is_active: formData.send_now ? formData.is_active : false,
        priority: formData.priority,
        schedule_date: scheduleDateValue,
        schedule_status: formData.send_now ? 'active' : 'scheduled',
        model_id: formData.model_id || null,
        daily_frequency: formData.daily_frequency || 0,
      };

      if (formData.id) {
        const { data, error } = await (supabase as any)
          .from('feed_promotions')
          .update(payload)
          .eq('id', formData.id)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      } else {
        const shareableLink = `${window.location.origin}/app`;
        payload.shareable_link = shareableLink;
        const { data, error } = await (supabase as any)
          .from('feed_promotions')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feed-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-promotions'] });
      
      if (!editingId && data?.id) {
        const shareableLink = `${window.location.origin}/app`;
        setCreatedInfo({
          id: data.id,
          modelId: pendingModelData?.generatedId,
          shareableLink,
        });
      }
      
      toast.success(editingId ? 'Promoção atualizada!' : 'Promoção criada com sucesso!');
      if (editingId) handleCloseModal();
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from('feed_promotions')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Nada foi excluído. Verifique se você está logado como admin (RLS bloqueou o DELETE).');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feed-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['feed-promotions'] });
      toast.success('Promoção excluída do banco!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + (error?.message || 'desconhecido'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('feed_promotions')
        .update({ is_active, schedule_status: is_active ? 'active' : 'scheduled' })
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
    setCreatedInfo(null);
    setPendingModelData(null);
  };

  const handleEdit = (promo: FeedPromotion) => {
    setEditingId(promo.id);
    const scheduleDate = promo.schedule_date ? new Date(promo.schedule_date) : null;
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
      schedule_date: scheduleDate ? scheduleDate.toISOString().split('T')[0] : '',
      schedule_time: scheduleDate ? scheduleDate.toTimeString().slice(0, 5) : '',
      send_now: promo.schedule_status === 'active' || !promo.schedule_date,
      create_model: false,
      daily_frequency: promo.daily_frequency || 0,
      cta_mode: promo.cta_mode || 'link',
      popup_media_url: promo.popup_media_url || '',
      popup_media_type: promo.popup_media_type || 'image',
      popup_cta_text: promo.popup_cta_text || 'Comprar Agora',
      popup_cta_link: promo.popup_cta_link || '',
    });
    setShowModal(true);
  };

  const initiateCreateModel = async () => {
    const username = form.display_name.trim();
    if (!username) {
      toast.error('Digite o nome de exibição primeiro');
      return;
    }
    const generatedId = crypto.randomUUID();
    setPendingModelData({ username, generatedId });
    setShowConfirmDialog(true);
  };

  const confirmCreateModel = async () => {
    if (!pendingModelData) return;
    setShowConfirmDialog(false);

    const { data, error } = await (supabase as any)
      .from('models')
      .insert({
        id: pendingModelData.generatedId,
        username: pendingModelData.username.toLowerCase().replace(/\s+/g, '_'),
        name: pendingModelData.username,
        avatar_url: form.avatar_url || DEFAULT_AVATAR,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar modelo:', error);
      toast.error('Erro ao criar modelo');
      setPendingModelData(null);
      return;
    }

    toast.success(`✅ Modelo "${pendingModelData.username}" criada com ID: ${data.id}`);
    setForm(prev => ({ ...prev, create_model: true }));
  };

  // Helper: auto-assign 'creator' role if a matching profile exists
  const autoAssignCreatorRole = async (displayName: string) => {
    try {
      const nameLower = displayName.trim().toLowerCase();
      // Search profiles matching the name
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .ilike('name', `%${nameLower}%`);

      if (!profiles || profiles.length === 0) return;

      // Find exact or closest match
      const match = profiles.find(p => p.name?.toLowerCase() === nameLower) || profiles[0];
      if (!match) return;

      // Check if already has creator role
      const { data: existingRole } = await (supabase as any)
        .from('user_roles')
        .select('id')
        .eq('user_id', match.id)
        .eq('role', 'creator')
        .maybeSingle();

      if (existingRole) return; // Already a creator

      // Get admin user_id for granted_by
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert creator role
      const { error } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: match.id,
          role: 'creator',
          granted_by: user?.id || null,
          granted_at: new Date().toISOString(),
        });

      if (!error) {
        toast.success(`✅ "${match.name}" aprovada como criadora automaticamente!`);
        queryClient.invalidateQueries({ queryKey: ['creator-applications'] });
        queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      }
    } catch (err) {
      console.warn('Auto-assign creator role:', err);
    }
  };

  const handleSave = async () => {
    const trimmedName = (form.display_name || '').trim();
    const trimmedMedia = (form.media_url || '').trim();
    if (!trimmedName) {
      toast.error('Preencha o Nome de Exibição');
      return;
    }
    if (!trimmedMedia) {
      toast.error('Preencha a URL da Mídia (Imagem/Vídeo)');
      return;
    }
    if (trimmedMedia !== form.media_url || trimmedName !== form.display_name) {
      form.media_url = trimmedMedia;
      form.display_name = trimmedName;
    }
    if (!form.send_now && (!form.schedule_date || !form.schedule_time)) {
      toast.error('Selecione data e hora do agendamento');
      return;
    }

    let modelId = (form as any).model_id || pendingModelData?.generatedId;

    // Auto-criar modelo se não existir ainda (nova promoção)
    if (!editingId && !modelId && form.display_name.trim()) {
      const generatedId = crypto.randomUUID();
      const username = form.display_name.trim().toLowerCase().replace(/\s+/g, '_');

      const { data, error } = await (supabase as any)
        .from('models')
        .insert({
          id: generatedId,
          username,
          name: form.display_name.trim(),
          avatar_url: form.avatar_url || DEFAULT_AVATAR,
          is_active: true,
          is_promo_creator: true,
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Aviso: modelo não criada:', error.message);
      } else {
        modelId = data.id;
        setPendingModelData({ username, generatedId });
        toast.success(`✅ Modelo "${form.display_name}" criada e aprovada como criadora!`);
      }
    }

    // Ao EDITAR: atualizar modelo existente com is_promo_creator e novo nome
    if (editingId && modelId && form.display_name.trim()) {
      await (supabase as any)
        .from('models')
        .update({
          name: form.display_name.trim(),
          username: form.display_name.trim().toLowerCase().replace(/\s+/g, '_'),
          avatar_url: form.avatar_url || undefined,
          is_promo_creator: true,
        })
        .eq('id', modelId);
    }

    // Ao EDITAR sem model_id: criar modelo novo com is_promo_creator
    if (editingId && !modelId && form.display_name.trim()) {
      const generatedId = crypto.randomUUID();
      const username = form.display_name.trim().toLowerCase().replace(/\s+/g, '_');

      const { data, error } = await (supabase as any)
        .from('models')
        .insert({
          id: generatedId,
          username,
          name: form.display_name.trim(),
          avatar_url: form.avatar_url || DEFAULT_AVATAR,
          is_active: true,
          is_promo_creator: true,
        })
        .select('id')
        .single();

      if (!error && data) {
        modelId = data.id;
        toast.success(`✅ Modelo "${form.display_name}" criada e aprovada como criadora!`);
      }
    }

    // Auto-assign creator role if matching profile exists
    await autoAssignCreatorRole(form.display_name);

    saveMutation.mutate({
      ...form,
      id: editingId || undefined,
      model_id: modelId,
    } as any);
  };

  const handleBatchSave = async () => {
    const urls = batchUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0 && u.startsWith('http'));
    if (urls.length === 0) {
      toast.error('Cole pelo menos uma URL válida');
      return;
    }
    if (!form.display_name) {
      toast.error('Preencha o Nome de Exibição');
      return;
    }

    setBatchSaving(true);
    let successCount = 0;
    let modelId: string | undefined;

    // Criar modelo uma vez para todas
    const generatedId = crypto.randomUUID();
    const username = form.display_name.trim().toLowerCase().replace(/\s+/g, '_');
    const { data: modelData } = await (supabase as any)
      .from('models')
      .insert({
        id: generatedId,
        username,
        name: form.display_name.trim(),
        avatar_url: form.avatar_url || DEFAULT_AVATAR,
        is_active: true,
        is_promo_creator: true,
      })
      .select('id')
      .single();

    if (modelData) modelId = modelData.id;

    for (const url of urls) {
      const isVideo = detectIsVideo(url);
      let scheduleDateValue: string | null = null;
      if (!form.send_now && form.schedule_date && form.schedule_time) {
        scheduleDateValue = `${form.schedule_date}T${form.schedule_time}:00`;
      }

      const payload: any = {
        title: form.title || '',
        description: form.description || null,
        avatar_url: form.avatar_url || null,
        display_name: form.display_name,
        media_url: url,
        media_type: isVideo ? 'video' : 'image',
        banner_url: form.banner_url || null,
        cta_text: form.cta_text || null,
        cta_link: form.cta_link || null,
        cta_mode: form.cta_mode || 'link',
        popup_media_url: form.popup_media_url || null,
        popup_media_type: form.popup_media_type || 'image',
        popup_cta_text: form.popup_cta_text || null,
        popup_cta_link: form.popup_cta_link || null,
        position_interval: form.position_interval,
        is_active: form.send_now ? form.is_active : false,
        priority: form.priority,
        schedule_date: scheduleDateValue,
        schedule_status: form.send_now ? 'active' : 'scheduled',
        model_id: modelId || null,
        daily_frequency: form.daily_frequency || 0,
        shareable_link: `${window.location.origin}/app`,
      };

      const { error } = await (supabase as any).from('feed_promotions').insert(payload);
      if (!error) successCount++;
    }

    setBatchSaving(false);
    queryClient.invalidateQueries({ queryKey: ['admin-feed-promotions'] });
    queryClient.invalidateQueries({ queryKey: ['feed-promotions'] });
    toast.success(`✅ ${successCount}/${urls.length} promoções criadas em lote!`);
    if (successCount > 0) handleCloseModal();
    setBatchUrls('');
    setBatchMode(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const getStatusBadge = (promo: FeedPromotion) => {
    if (promo.schedule_status === 'scheduled') {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20"><Clock className="w-3 h-3 mr-1" />Agendado</Badge>;
    }
    if (promo.is_active) {
      return <Badge className="bg-green-600">Ativo</Badge>;
    }
    return <Badge variant="secondary">Inativo</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Promoções no Feed</h2>
          <p className="text-gray-400 text-sm">Cards promocionais intercalados no feed de vídeos</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditingId(null); setCreatedInfo(null); setPendingModelData(null); setShowModal(true); }} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Promoção
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, título ou descrição..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
        />
      </div>

      {(() => {
        const filtered = promotions.filter((p) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            (p.display_name || '').toLowerCase().includes(q) ||
            (p.title || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q)
          );
        });
        if (isLoading) return <div className="text-center text-gray-400 py-8">Carregando...</div>;
        if (promotions.length === 0) return (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="py-12 text-center">
              <Image className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma promoção criada ainda</p>
              <p className="text-gray-500 text-sm mt-1">Clique em "Nova Promoção" para criar um card promocional no feed</p>
            </CardContent>
          </Card>
        );
        if (filtered.length === 0) return (
          <div className="text-center text-gray-400 py-8">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-500" />
            <p>Nenhuma promoção encontrada para "<span className="text-white">{searchQuery}</span>"</p>
          </div>
        );
        return (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} promoções
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((promo) => (
            <Card key={promo.id} className="bg-gray-900 border-gray-700 overflow-hidden">
              <div className="aspect-video bg-gray-800 relative">
                {promo.media_type === 'video' ? (
                  <video src={promo.media_url} className="w-full h-full object-cover" autoPlay muted loop playsInline preload="auto" />
                ) : (
                  <img src={promo.media_url} alt={promo.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  {getStatusBadge(promo)}
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

                {promo.schedule_date && promo.schedule_status === 'scheduled' && (
                  <div className="flex items-center gap-2 text-xs text-blue-400">
                    <Calendar className="w-3 h-3" />
                    <span>Agendado: {new Date(promo.schedule_date).toLocaleString('pt-BR')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>👁 {promo.views_count} views</span>
                  <span>🖱 {promo.clicks_count} cliques</span>
                  <span>A cada {promo.position_interval} vídeos</span>
                </div>
                {promo.daily_frequency > 0 && (
                  <div className="text-xs text-yellow-400">
                    📊 {promo.daily_frequency}x por dia no feed
                  </div>
                )}

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

          {/* Pagination com scroll horizontal */}
          {Math.ceil(filtered.length / ITEMS_PER_PAGE) > 1 && (
            <div className="mt-6 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="shrink-0">← Anterior</Button>
              <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-primary/60 scrollbar-track-gray-800 py-1">
                <div className="flex items-center gap-2 min-w-min px-1">
                  {Array.from({ length: Math.ceil(filtered.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                    <Button key={page} variant={page === currentPage ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(page)} className={`shrink-0 min-w-[40px] ${page === currentPage ? 'bg-primary text-primary-foreground' : ''}`}>{page}</Button>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage === Math.ceil(filtered.length / ITEMS_PER_PAGE)} className="shrink-0">Próxima →</Button>
            </div>
          )}
        </div>
        );
      })()}

      {/* Modal de criação/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Promoção' : 'Nova Promoção no Feed'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Label>Nome de Exibição *</Label>
              <Input
                ref={inputRef}
                value={form.display_name}
                onChange={(e) => {
                  setForm({ ...form, display_name: e.target.value });
                  searchEntities(e.target.value);
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Digite para buscar modelo/criadora..."
                className={modalInputClass}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.type}-${s.id}`}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 text-left transition-colors"
                      onClick={() => {
                        setForm({
                          ...form,
                          display_name: s.name,
                          avatar_url: s.avatar_url || form.avatar_url,
                          model_id: s.id,
                        } as any);
                        setShowSuggestions(false);
                      }}
                    >
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">{s.name.charAt(0).toUpperCase()}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{s.name}</p>
                      </div>
                      <Badge variant="outline" className={s.type === 'creator' ? 'text-blue-400 border-blue-500/30 text-[10px]' : 'text-purple-400 border-purple-500/30 text-[10px]'}>
                        {s.type === 'creator' ? 'Criador' : 'Modelo'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título da promoção" className={modalInputClass} />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição que aparece no card" className={modalInputClass} rows={2} />
            </div>

            <div>
              <Label>URL do Avatar</Label>
              <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." className={modalInputClass} />
            </div>

            {/* Batch mode toggle - only on create */}
            {!editingId && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <Switch checked={batchMode} onCheckedChange={setBatchMode} />
                <div>
                  <Label className="text-sm font-medium">Envio em Lote</Label>
                  <p className="text-xs text-gray-500">Cole múltiplas URLs (uma por linha)</p>
                </div>
              </div>
            )}

            {batchMode && !editingId ? (
              <div>
                <Label>URLs da Mídia (uma por linha) *</Label>
                <Textarea
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  placeholder={"https://cdn.example.com/video1.mp4\nhttps://cdn.example.com/video2.mp4\nhttps://cdn.example.com/image3.jpg"}
                  className={modalInputClass}
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {batchUrls.split('\n').filter(u => u.trim().startsWith('http')).length} URLs detectadas • Tipo detectado automaticamente
                </p>
              </div>
            ) : (
              <div>
                <Label>URL da Mídia (Imagem/Vídeo) *</Label>
                <Input value={form.media_url} onChange={(e) => {
                  const url = e.target.value;
                  const isVideo = detectIsVideo(url);
                  setForm({ ...form, media_url: url, media_type: isVideo ? 'video' : 'image' });
                }} placeholder="https://cdn.example.com/media.mp4" className={modalInputClass} />
                <p className="text-xs text-gray-500 mt-1">Recomendado: 1080x1920px (9:16 vertical)</p>
              </div>
            )}

            <div>
              <Label>URL do Banner (rodapé do card)</Label>
              <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://... (780x390px)" className={modalInputClass} />
              <p className="text-xs text-gray-500 mt-1">Recomendado: 780x390px (proporção 2:1)</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Texto do CTA</Label>
                <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Ver Mais" className={modalInputClass} />
              </div>
              <div>
                <Label>Link do CTA</Label>
                <Input value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} placeholder="https://..." className={modalInputClass} />
              </div>
            </div>

            {/* Modo do Botão CTA */}
            <div className="p-4 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                🖱️ Ação do Botão CTA
              </Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={form.cta_mode === 'link'} onChange={() => setForm({ ...form, cta_mode: 'link' })} className="accent-cyan-500" />
                  <span className="text-sm">Redirecionar (Link)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={form.cta_mode === 'popup'} onChange={() => setForm({ ...form, cta_mode: 'popup' })} className="accent-pink-500" />
                  <span className="text-sm">Abrir Pop-up</span>
                </label>
              </div>

              {form.cta_mode === 'popup' && (
                <div className="space-y-3 pt-2 border-t border-cyan-500/20">
                  <p className="text-xs text-gray-400">Configure o conteúdo que aparecerá na tela pop-up ao clicar no botão</p>
                  <div>
                    <Label>URL da Mídia do Pop-up (Imagem/Vídeo)</Label>
                    <Input value={form.popup_media_url} onChange={(e) => {
                      const url = e.target.value;
                      const isVideo = detectIsVideo(url);
                      setForm({ ...form, popup_media_url: url, popup_media_type: isVideo ? 'video' : 'image' });
                    }} placeholder="https://..." className={modalInputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Texto do Botão (Pop-up)</Label>
                      <Input value={form.popup_cta_text} onChange={(e) => setForm({ ...form, popup_cta_text: e.target.value })} placeholder="Comprar Agora" className={modalInputClass} />
                    </div>
                    <div>
                      <Label>Link do Botão (Pop-up)</Label>
                      <Input value={form.popup_cta_link} onChange={(e) => setForm({ ...form, popup_cta_link: e.target.value })} placeholder="https://..." className={modalInputClass} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Intervalo (a cada X vídeos)</Label>
                <Input type="number" value={form.position_interval} onChange={(e) => setForm({ ...form, position_interval: parseInt(e.target.value) || 5 })} className={modalInputClass} />
              </div>
              <div>
                <Label>Vezes por dia no feed (máx 3)</Label>
                <Input type="number" min={1} max={3} value={form.daily_frequency || 3} onChange={(e) => setForm({ ...form, daily_frequency: Math.min(3, Math.max(1, parseInt(e.target.value) || 3)) })} className={modalInputClass} />
                <p className="text-xs text-gray-500 mt-1">1 = tarde • 2 = manhã e noite • 3 = manhã, tarde e noite</p>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} className={modalInputClass} />
              </div>
            </div>

            {/* Agendamento */}
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-950/20 space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Agendamento de Publicação
              </Label>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={form.send_now} onChange={() => setForm({ ...form, send_now: true })} className="accent-green-500" />
                  <span className="text-sm">Publicar Agora</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!form.send_now} onChange={() => setForm({ ...form, send_now: false })} className="accent-blue-500" />
                  <span className="text-sm">Agendar</span>
                </label>
              </div>

              {!form.send_now && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} className={modalInputClass} />
                  </div>
                  <div>
                    <Label className="text-xs">Hora</Label>
                    <Input type="time" value={form.schedule_time} onChange={(e) => setForm({ ...form, schedule_time: e.target.value })} className={modalInputClass} />
                  </div>
                </div>
              )}
            </div>

            {/* Info: Modelo será criada automaticamente */}
            {!editingId && (
              <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-950/20">
                <p className="text-xs text-purple-300 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Ao salvar, uma modelo será criada automaticamente com ID único usando o nome de exibição. Ela aparecerá no painel de modelos.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>

          {/* Created Info Panel */}
          {createdInfo && !editingId && (
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-950/20 space-y-3 mt-4">
              <h4 className="font-semibold text-green-400 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4" />
                Promoção Criada com Sucesso!
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-800 px-2 py-1 rounded">{createdInfo.id.slice(0, 12)}...</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(createdInfo.id, 'ID')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {createdInfo.modelId && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Modelo ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-800 px-2 py-1 rounded">{createdInfo.modelId.slice(0, 12)}...</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(createdInfo.modelId!, 'Modelo ID')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Link:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-800 px-2 py-1 rounded truncate max-w-[180px]">{createdInfo.shareableLink}</code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(createdInfo.shareableLink, 'Link')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  const msg = `Confira: ${createdInfo.shareableLink}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}>
                  <Share2 className="w-3 h-3 mr-1" />
                  WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => copyToClipboard(createdInfo.shareableLink, 'Link')}>
                  <Link className="w-3 h-3 mr-1" />
                  Copiar Link
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
            {batchMode && !editingId ? (
              <Button onClick={handleBatchSave} disabled={batchSaving} className="bg-green-600 hover:bg-green-700">
                {batchSaving ? 'Criando em lote...' : (
                  <><Send className="w-4 h-4 mr-1" />Criar {batchUrls.split('\n').filter(u => u.trim().startsWith('http')).length} Promoções</>
                )}
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {saveMutation.isPending ? 'Salvando...' : form.send_now ? (
                  <><Send className="w-4 h-4 mr-1" />{editingId ? 'Atualizar' : 'Publicar Agora'}</>
                ) : (
                  <><Calendar className="w-4 h-4 mr-1" />{editingId ? 'Atualizar' : 'Agendar'}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Model Creation */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Confirmar Criação de Modelo
            </DialogTitle>
          </DialogHeader>
          
          {pendingModelData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Nome:</span>
                  <span className="font-semibold">{pendingModelData.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Username:</span>
                  <span className="font-mono text-xs">@{pendingModelData.username.toLowerCase().replace(/\s+/g, '_')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">ID gerado:</span>
                  <code className="text-xs bg-gray-900 px-2 py-1 rounded border border-gray-700">{pendingModelData.generatedId.slice(0, 8)}...</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Link:</span>
                  <code className="text-xs bg-gray-900 px-2 py-1 rounded border border-gray-700 truncate max-w-[200px]">
                    /chat/{pendingModelData.generatedId.slice(0, 8)}...
                  </code>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                A modelo será criada e vinculada a esta promoção. O link compartilhável será gerado automaticamente.
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => { setShowConfirmDialog(false); setPendingModelData(null); }}>
              Cancelar
            </Button>
            <Button onClick={confirmCreateModel} className="bg-purple-600 hover:bg-purple-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar e Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
