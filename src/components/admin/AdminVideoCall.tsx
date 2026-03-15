import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Save, X, Video, Phone, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface VideoCallModel {
  id: string;
  model_name: string;
  model_avatar: string;
  preview_video_url: string;
  redirect_url: string;
  buy_link: string;
  price: string;
  description: string;
  is_active: boolean;
  show_in_menu: boolean;
  selected_model_id: string | null;
}

interface ModelOption {
  id: string;
  name: string;
  avatar_url: string;
}

export const AdminVideoCall = () => {
  const [models, setModels] = useState<VideoCallModel[]>([]);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [showModelResults, setShowModelResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    model_name: '',
    model_avatar: '',
    preview_video_url: '',
    redirect_url: '',
    price: '',
    description: '',
    is_active: true,
    show_in_menu: false,
    selected_model_id: '' as string,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowModelResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vcRes, modelsRes] = await Promise.all([
        (supabase as any).from('video_call_models').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('models').select('id, name, avatar_url').eq('is_active', true).order('name'),
      ]);

      if (vcRes.error) throw vcRes.error;
      setModels((vcRes.data as any[]) || []);
      setModelOptions((modelsRes.data as ModelOption[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      model_name: '', model_avatar: '', preview_video_url: '',
      redirect_url: '', price: '', description: '',
      is_active: true, show_in_menu: false, selected_model_id: '',
    });
    setEditingId(null);
    setShowForm(false);
    setModelSearch('');
  };

  const handleSave = async () => {
    if (!form.model_name || !form.redirect_url) {
      toast.error('Nome e link de redirecionamento são obrigatórios');
      return;
    }

    try {
      const payload = {
        ...form,
        selected_model_id: form.selected_model_id || null,
      };

      if (editingId) {
        const { error } = await (supabase as any).from('video_call_models').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Modelo atualizado!');
      } else {
        const { error } = await (supabase as any).from('video_call_models').insert(payload);
        if (error) throw error;
        toast.success('Modelo criado!');
      }

      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  const handleEdit = (model: VideoCallModel) => {
    setForm({
      model_name: model.model_name,
      model_avatar: model.model_avatar || '',
      preview_video_url: model.preview_video_url || '',
      redirect_url: model.redirect_url || '',
      price: model.price || '',
      description: model.description || '',
      is_active: model.is_active,
      show_in_menu: model.show_in_menu,
      selected_model_id: model.selected_model_id || '',
    });
    setEditingId(model.id);
    setShowForm(true);
    // Set search to the selected model name
    const selected = modelOptions.find(m => m.id === model.selected_model_id);
    setModelSearch(selected?.name || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const { error } = await (supabase as any).from('video_call_models').delete().eq('id', id);
      if (error) throw error;
      toast.success('Modelo excluído!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  const handleSelectModel = (modelId: string) => {
    const selected = modelOptions.find(m => m.id === modelId);
    if (selected) {
      setForm(prev => ({
        ...prev,
        selected_model_id: modelId,
        model_name: prev.model_name || selected.name,
        model_avatar: prev.model_avatar || selected.avatar_url,
      }));
      setModelSearch(selected.name);
      setShowModelResults(false);
    }
  };

  const filteredModelOptions = modelOptions.filter(m =>
    !modelSearch.trim() || m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Phone className="w-6 h-6 text-pink-400" />
          Gerenciar Vídeo Chamada
        </h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Modelo
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-gray-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              {editingId ? 'Editar Modelo' : 'Nova Modelo de Vídeo Chamada'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search model with autocomplete */}
            <div ref={searchRef} className="relative">
              <Label className="text-white/70">Vincular a Modelo Existente</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  value={modelSearch}
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                    setShowModelResults(true);
                  }}
                  onFocus={() => setShowModelResults(true)}
                  placeholder="🔍 Pesquisar modelo pelo nome..."
                  className="pl-10 bg-gray-800 border-white/10 text-white"
                />
              </div>
              {showModelResults && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-white/10 rounded-lg max-h-60 overflow-y-auto shadow-xl">
                  {filteredModelOptions.length === 0 ? (
                    <div className="p-3 text-white/50 text-sm text-center">Nenhuma modelo encontrada</div>
                  ) : (
                    filteredModelOptions.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectModel(m.id)}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white/10 transition-colors ${form.selected_model_id === m.id ? 'bg-pink-500/20 border-l-2 border-pink-500' : ''}`}
                      >
                        <img
                          src={m.avatar_url || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                          alt={m.name}
                          className="w-10 h-10 rounded-full object-cover border border-pink-500/50"
                        />
                        <span className="text-white font-medium">{m.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Nome da Modelo *</Label>
                <Input value={form.model_name} onChange={e => setForm(p => ({ ...p, model_name: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Preço</Label>
                <Input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="R$ 50,00" className="bg-gray-800 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">URL Avatar</Label>
                <Input value={form.model_avatar} onChange={e => setForm(p => ({ ...p, model_avatar: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">URL Vídeo Preview</Label>
                <Input value={form.preview_video_url} onChange={e => setForm(p => ({ ...p, preview_video_url: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70">Link de Redirecionamento (Comprar) *</Label>
                <Input value={form.redirect_url} onChange={e => setForm(p => ({ ...p, redirect_url: e.target.value }))} className="bg-gray-800 border-white/10 text-white" />
              </div>
            </div>

            <div>
              <Label className="text-white/70">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-gray-800 border-white/10 text-white" rows={3} />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label className="text-white/70">Ativo na página</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.show_in_menu} onCheckedChange={v => setForm(p => ({ ...p, show_in_menu: v }))} />
                <Label className="text-white/70">Mostrar no menu (popup)</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
              <Button variant="outline" onClick={resetForm} className="border-white/20 text-white hover:bg-white/10">
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Card key={model.id} className="bg-gray-900 border-white/10">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={model.model_avatar || '/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png'}
                  alt={model.model_name}
                  className="w-12 h-12 rounded-full object-cover border border-pink-500"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{model.model_name}</h3>
                  <p className="text-green-400 text-sm font-bold">{model.price || 'Sem preço'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-white/50">
                <span className={model.is_active ? 'text-green-400' : 'text-red-400'}>
                  {model.is_active ? '● Ativo' : '○ Inativo'}
                </span>
                <span className={model.show_in_menu ? 'text-pink-400' : ''}>
                  {model.show_in_menu ? '📌 No menu' : ''}
                </span>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(model)} className="flex-1 border-white/20 text-white hover:bg-white/10">
                  <Edit className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(model.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {models.length === 0 && !showForm && (
        <div className="text-center py-12 text-white/40">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma modelo de vídeo chamada cadastrada</p>
          <p className="text-sm mt-1">Clique em "Adicionar Modelo" para começar</p>
        </div>
      )}
    </div>
  );
};