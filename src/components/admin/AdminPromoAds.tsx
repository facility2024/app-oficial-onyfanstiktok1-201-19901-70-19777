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
import { Radio, Phone, Plus, Trash2, Eye, Calendar, Clock, Send, Search, Check, Timer, Hash } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  isCreator?: boolean;
}

interface PromoAd {
  id: string;
  model_id: string;
  model_name: string;
  model_username: string;
  model_avatar: string | null;
  type: string;
  url: string;
  description: string;
  timer_minutes: number;
  start_date: string;
  end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  shows_per_day: number;
  active: boolean;
  created_at: string;
}

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
  const [dailyStartTime, setDailyStartTime] = useState('08:00');
  const [dailyEndTime, setDailyEndTime] = useState('23:00');
  const [showsPerDay, setShowsPerDay] = useState(10);
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    loadModels();
    loadPromoAds();
  }, []);

  const loadModels = async () => {
    try {
      const [
        { data: modelsData, error: modelsError },
        { data: creatorRoles, error: rolesError },
        { data: approvedApps, error: appsError },
      ] = await Promise.all([
        supabase.from('models').select('id, name, username, avatar_url').eq('is_active', true).order('name'),
        (supabase as any).from('user_roles').select('user_id').eq('role', 'creator'),
        (supabase as any).from('creator_applications').select('user_id, nickname, full_name').eq('status', 'approved'),
      ]);

      if (modelsError) throw modelsError;

      const creatorIds = Array.from(new Set((creatorRoles || []).map((r: any) => r.user_id).filter(Boolean))) as string[];
      const appsByUserId = new Map<string, { nickname?: string; full_name?: string }>();
      (approvedApps || []).forEach((app: any) => {
        if (app?.user_id) appsByUserId.set(app.user_id, { nickname: app.nickname, full_name: app.full_name });
      });

      const profilesById = new Map<string, any>();
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, name, username, avatar_url').in('id', creatorIds);
        (profilesData || []).forEach((p) => profilesById.set(p.id, p));
      }

      const creatorsData: Model[] = creatorIds.map((cid) => {
        const profile = profilesById.get(cid);
        const app = appsByUserId.get(cid);
        const fallbackName = app?.nickname || app?.full_name || profile?.username || `creator_${cid.slice(0, 6)}`;
        return { id: cid, name: profile?.name || fallbackName, username: profile?.username || app?.nickname || fallbackName, avatar_url: profile?.avatar_url || '', isCreator: true };
      });

      const normalizedModels: Model[] = (modelsData || []).map((m) => ({ ...m, isCreator: false }));
      const mergedById = new Map<string, Model>();
      [...normalizedModels, ...creatorsData].forEach((item) => { if (!mergedById.has(item.id)) mergedById.set(item.id, item); });
      setModels(Array.from(mergedById.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error loading models/creators:', err);
    }
  };

  const loadPromoAds = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('promo_ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar promo_ads:', error);
        setPromoAds([]);
        return;
      }
      setPromoAds(data || []);
    } catch {
      setPromoAds([]);
    }
  };

  const handleCreate = async () => {
    if (!selectedModelId || !url || !startDate || !endDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) { toast.error('Data inválida'); return; }
    if (endMs <= startMs) { toast.error('Data final deve ser maior que a inicial'); return; }
    if (showsPerDay < 1) { toast.error('Quantidade de exibições deve ser pelo menos 1'); return; }

    // Validate time range
    if (dailyStartTime >= dailyEndTime) {
      toast.error('Horário de início deve ser antes do horário de fim');
      return;
    }

    const model = models.find(m => m.id === selectedModelId);
    if (!model) return;

    // Calculate timer_minutes from shows_per_day and daily time window
    const [startH, startM] = dailyStartTime.split(':').map(Number);
    const [endH, endM] = dailyEndTime.split(':').map(Number);
    const dailyWindowMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const calculatedTimerMinutes = showsPerDay > 1 ? Math.max(1, Math.floor(dailyWindowMinutes / showsPerDay)) : dailyWindowMinutes;

    setLoading(true);
    const { error } = await (supabase as any).from('promo_ads').insert({
      model_id: model.id,
      model_name: model.name,
      model_username: model.username,
      model_avatar: model.avatar_url || null,
      type,
      url,
      description: description || (type === 'live' ? `${model.name} está AO VIVO agora!` : `Faça uma vídeo chamada com ${model.name}!`),
      timer_minutes: calculatedTimerMinutes,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      daily_start_time: dailyStartTime + ':00',
      daily_end_time: dailyEndTime + ':00',
      shows_per_day: showsPerDay,
      active: true,
    });
    setLoading(false);

    if (error) {
      console.error('Erro ao criar promo ad:', error);
      toast.error('Erro ao criar anúncio: ' + error.message);
      return;
    }

    toast.success(`Anúncio criado! Aparecerá ${showsPerDay}x/dia entre ${dailyStartTime} e ${dailyEndTime} (a cada ~${calculatedTimerMinutes}min)`);
    window.dispatchEvent(new Event('promo_ads_updated'));
    await loadPromoAds();

    // Reset form
    setSelectedModelId('');
    setUrl('');
    setDescription('');
    setShowsPerDay(10);
    setDailyStartTime('08:00');
    setDailyEndTime('23:00');
    setStartDate('');
    setEndDate('');
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('promo_ads').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover: ' + error.message); return; }
    toast.success('Anúncio removido');
    window.dispatchEvent(new Event('promo_ads_updated'));
    await loadPromoAds();
  };

  const handleToggle = async (id: string) => {
    const ad = promoAds.find(a => a.id === id);
    if (!ad) return;
    const { error } = await (supabase as any).from('promo_ads').update({ active: !ad.active }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar: ' + error.message); return; }
    window.dispatchEvent(new Event('promo_ads_updated'));
    await loadPromoAds();
  };

  const isAdActive = (ad: PromoAd) => {
    if (!ad.active) return false;
    const now = new Date();
    return new Date(ad.start_date) <= now && now <= new Date(ad.end_date);
  };

  const formatTime = (t: string | null) => {
    if (!t) return '--:--';
    return t.substring(0, 5);
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
                  onChange={e => { setModelSearch(e.target.value); setSelectedModelId(''); setShowModelDropdown(true); }}
                  onFocus={() => setShowModelDropdown(true)}
                  placeholder="Buscar modelo..."
                  className="bg-gray-800 border-gray-600 text-white pl-9"
                />
                {selectedModelId && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
              </div>
              {showModelDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md max-h-48 overflow-y-auto shadow-lg">
                  {models
                    .filter(m => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.username.toLowerCase().includes(modelSearch.toLowerCase()))
                    .map(m => (
                      <button key={m.id} type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-gray-700 ${selectedModelId === m.id ? 'bg-gray-700' : ''}`}
                        onClick={() => { setSelectedModelId(m.id); setModelSearch(m.name); setShowModelDropdown(false); }}>
                        <img src={m.avatar_url || '/placeholder.svg'} alt="" className="w-6 h-6 rounded-full object-cover" />
                        {m.name} <span className="text-gray-400">@{m.username}</span>
                        {m.isCreator && <Badge variant="outline" className="text-xs px-1 py-0 text-blue-400 border-blue-400 ml-1">Criador</Badge>}
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
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="live" className="text-white"><div className="flex items-center gap-2"><Radio className="w-4 h-4 text-red-500" /> Live</div></SelectItem>
                  <SelectItem value="video_call" className="text-white"><div className="flex items-center gap-2"><Phone className="w-4 h-4 text-green-500" /> Vídeo Chamada</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label className="text-gray-300">URL do Link</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="bg-gray-800 border-gray-600 text-white" />
            </div>

            {/* Exibições por dia */}
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                Quantas vezes por dia
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={showsPerDay}
                onChange={e => setShowsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {/* Horário diário início */}
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                Horário Início (diário)
              </Label>
              <Select value={dailyStartTime} onValueChange={setDailyStartTime}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600 max-h-60">
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = String(i).padStart(2, '0') + ':00';
                    return <SelectItem key={h} value={h} className="text-white">{h}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Horário diário fim */}
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                Horário Fim (diário)
              </Label>
              <Select value={dailyEndTime} onValueChange={setDailyEndTime}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600 max-h-60">
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = String(i).padStart(2, '0') + ':00';
                    return <SelectItem key={h} value={h} className="text-white">{h}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Data início */}
            <div className="space-y-2">
              <Label className="text-gray-300">Data de Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-800 border-gray-600 text-white" />
            </div>

            {/* Data fim */}
            <div className="space-y-2">
              <Label className="text-gray-300">Data de Finalização</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-800 border-gray-600 text-white" />
            </div>
          </div>

          {/* Preview do cálculo */}
          {dailyStartTime && dailyEndTime && showsPerDay > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                📊 <strong>Resumo:</strong> O anúncio aparecerá <strong className="text-green-400">{showsPerDay}x por dia</strong> entre{' '}
                <strong className="text-blue-400">{dailyStartTime}</strong> e{' '}
                <strong className="text-blue-400">{dailyEndTime}</strong>
                {(() => {
                  const [sH, sM] = dailyStartTime.split(':').map(Number);
                  const [eH, eM] = dailyEndTime.split(':').map(Number);
                  const windowMin = (eH * 60 + eM) - (sH * 60 + sM);
                  if (windowMin <= 0) return null;
                  const interval = Math.max(1, Math.floor(windowMin / showsPerDay));
                  return <> — intervalo de ~<strong className="text-yellow-400">{interval >= 60 ? `${Math.floor(interval / 60)}h${interval % 60 > 0 ? `${interval % 60}min` : ''}` : `${interval}min`}</strong></>;
                })()}
              </p>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-gray-300">Descrição (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Deixe vazio para descrição automática..." className="bg-gray-800 border-gray-600 text-white" rows={2} />
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Criando...' : 'Criar Anúncio Promocional'}
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
                  <img src={ad.model_avatar || '/placeholder.svg'} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{ad.model_name}</span>
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
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {ad.shows_per_day || '∞'}x/dia
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {formatTime(ad.daily_start_time)} - {formatTime(ad.daily_end_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{ad.timer_minutes}min intervalo
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ad.start_date).toLocaleDateString('pt-BR')} - {new Date(ad.end_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={ad.active ? 'outline' : 'default'} onClick={() => handleToggle(ad.id)}>
                      <Eye className="w-4 h-4" />
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
