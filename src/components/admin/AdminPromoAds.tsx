import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Radio, Phone, Plus, Trash2, Eye, Calendar, Clock, Send, Search, Check } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
}

interface PromoAd {
  id: string;
  modelId: string;
  modelName: string;
  modelUsername: string;
  modelAvatar: string;
  type: 'live' | 'video_call';
  url: string;
  description: string;
  timerMinutes: number;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

const TIMER_OPTIONS = [
  { value: 1, label: '1 minuto' },
  { value: 5, label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 20, label: '20 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
];

const STORAGE_KEY = 'admin_promo_ads';

export const AdminPromoAds = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [promoAds, setPromoAds] = useState<PromoAd[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [type, setType] = useState<'live' | 'video_call'>('live');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    loadModels();
    loadPromoAds();
  }, []);

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, username, avatar_url')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setModels(data || []);
    } catch (err) {
      console.error('Error loading models:', err);
    }
  };

  const loadPromoAds = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPromoAds(JSON.parse(stored));
    } catch {
      setPromoAds([]);
    }
  };

  const savePromoAds = (ads: PromoAd[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ads));
    setPromoAds(ads);
    window.dispatchEvent(new Event('promo_ads_updated'));
  };

  const handleCreate = () => {
    if (!selectedModelId || !url || !startDate || !endDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const model = models.find(m => m.id === selectedModelId);
    if (!model) return;

    const newAd: PromoAd = {
      id: crypto.randomUUID(),
      modelId: model.id,
      modelName: model.name,
      modelUsername: model.username,
      modelAvatar: model.avatar_url,
      type,
      url,
      description: description || (type === 'live' ? `${model.name} está AO VIVO agora!` : `Faça uma vídeo chamada com ${model.name}!`),
      timerMinutes,
      startDate,
      endDate,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...promoAds, newAd];
    savePromoAds(updated);
    toast.success('Anúncio promocional criado com sucesso!');

    // Reset form
    setSelectedModelId('');
    setUrl('');
    setDescription('');
    setTimerMinutes(5);
    setStartDate('');
    setEndDate('');
  };

  const handleDelete = (id: string) => {
    savePromoAds(promoAds.filter(a => a.id !== id));
    toast.success('Anúncio removido');
  };

  const handleToggle = (id: string) => {
    savePromoAds(promoAds.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const isAdActive = (ad: PromoAd) => {
    if (!ad.active) return false;
    const now = new Date();
    return new Date(ad.startDate) <= now && now <= new Date(ad.endDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radio className="w-6 h-6 text-red-500" />
          Anúncios Promocionais - Live & Vídeo Chamada
        </h2>
      </div>

      {/* Formulário de criação */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Novo Anúncio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Modelo */}
            <div className="space-y-2 relative">
              <Label className="text-gray-300">Modelo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  value={selectedModelId ? models.find(m => m.id === selectedModelId)?.name || modelSearch : modelSearch}
                  onChange={e => {
                    setModelSearch(e.target.value);
                    setSelectedModelId('');
                    setShowModelDropdown(true);
                  }}
                  onFocus={() => setShowModelDropdown(true)}
                  placeholder="Buscar modelo..."
                  className="bg-gray-800 border-gray-600 text-white pl-9"
                />
                {selectedModelId && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
              </div>
              {showModelDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md max-h-48 overflow-y-auto shadow-lg">
                  {models
                    .filter(m => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.username.toLowerCase().includes(modelSearch.toLowerCase()))
                    .map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-700 ${selectedModelId === m.id ? 'bg-gray-700' : ''}`}
                        onClick={() => {
                          setSelectedModelId(m.id);
                          setModelSearch(m.name);
                          setShowModelDropdown(false);
                        }}
                      >
                        <img src={m.avatar_url || '/placeholder.svg'} alt="" className="w-6 h-6 rounded-full object-cover" />
                        {m.name} <span className="text-gray-400">@{m.username}</span>
                        {selectedModelId === m.id && <Check className="w-4 h-4 text-green-400 ml-auto" />}
                      </button>
                    ))}
                  {models.filter(m => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.username.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-3">Nenhuma modelo encontrada</p>
                  )}
                </div>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-gray-300">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'live' | 'video_call')}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="live" className="text-white">
                    <div className="flex items-center gap-2"><Radio className="w-4 h-4 text-red-500" /> Live</div>
                  </SelectItem>
                  <SelectItem value="video_call" className="text-white">
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-green-500" /> Vídeo Chamada</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label className="text-gray-300">URL do Link</Label>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {/* Timer */}
            <div className="space-y-2">
              <Label className="text-gray-300">Intervalo de Exibição</Label>
              <Select value={String(timerMinutes)} onValueChange={v => setTimerMinutes(Number(v))}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {TIMER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-white">
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {o.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data início */}
            <div className="space-y-2">
              <Label className="text-gray-300">Data de Início</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {/* Data fim */}
            <div className="space-y-2">
              <Label className="text-gray-300">Data de Finalização</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-gray-300">Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Deixe vazio para descrição automática..."
              className="bg-gray-800 border-gray-600 text-white"
              rows={2}
            />
          </div>

          <Button onClick={handleCreate} className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700">
            <Send className="w-4 h-4 mr-2" />
            Criar Anúncio Promocional
          </Button>
        </CardContent>
      </Card>

      {/* Lista de anúncios */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Anúncios Ativos ({promoAds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {promoAds.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum anúncio promocional criado</p>
          ) : (
            <div className="space-y-3">
              {promoAds.map(ad => (
                <div key={ad.id} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <img src={ad.modelAvatar || '/placeholder.svg'} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{ad.modelName}</span>
                      <Badge variant={ad.type === 'live' ? 'destructive' : 'default'} className={ad.type === 'live' ? '' : 'bg-green-600'}>
                        {ad.type === 'live' ? '🔴 Live' : '📞 Vídeo Chamada'}
                      </Badge>
                      {isAdActive(ad) ? (
                        <Badge className="bg-green-600 text-white">Ativo</Badge>
                      ) : ad.active ? (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">Agendado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm truncate">{ad.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> A cada {TIMER_OPTIONS.find(o => o.value === ad.timerMinutes)?.label}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ad.startDate).toLocaleDateString('pt-BR')} - {new Date(ad.endDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={ad.active ? 'outline' : 'default'} onClick={() => handleToggle(ad.id)}>
                      {ad.active ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(ad.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
