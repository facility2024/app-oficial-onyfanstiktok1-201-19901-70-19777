import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  BarChart3, 
  Settings2, 
  RefreshCw,
  Video,
  Users,
  Clock,
  TrendingUp,
  Zap,
  Trash2,
  Save,
  RotateCcw,
  MousePointerClick,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Force rebuild - v1
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Configuração padrão do algoritmo
const DEFAULT_CONFIG = {
  maxVideos: 30,
  mixRatio: {
    novos: 40,
    favoritos: 30,
    aleatorios: 30,
  },
  scoreWeights: {
    novidade: 40,
    afinidade: 30,
    popularidade: 20,
    aleatoriedade: 10,
  },
  novidadeDays: 7,
};

interface VideoStats {
  total: number;
  models: number;
  creators: number;
  recentVideos: number;
  byGenre: { name: string; count: number }[];
  topVideos: { id: string; title: string; owner: string; views: number; likes: number }[];
}

interface ClickMetric {
  promo_id: string;
  button_type: string;
  region: string;
  city: string;
  device_type: string;
  created_at: string;
}

interface ClickSummary {
  totalClicks: number;
  byButton: { name: string; count: number }[];
  byRegion: { name: string; count: number }[];
  byHour: { hour: string; count: number }[];
  recentClicks: ClickMetric[];
}

export const AdminIntelligentFeed: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [videoStats, setVideoStats] = useState<VideoStats>({
    total: 0,
    models: 0,
    creators: 0,
    recentVideos: 0,
    byGenre: [],
    topVideos: [],
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [clickSummary, setClickSummary] = useState<ClickSummary>({
    totalClicks: 0,
    byButton: [],
    byRegion: [],
    byHour: [],
    recentClicks: [],
  });

  // Carregar estatísticas do banco
  useEffect(() => {
    fetchVideoStats();
    fetchClickMetrics();
    loadSavedConfig();
  }, []);

  const loadSavedConfig = () => {
    const saved = localStorage.getItem('intelligent_feed_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar config:', e);
      }
    }
  };

  const fetchClickMetrics = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('promo_click_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error || !data) return;

      const clicks = data as ClickMetric[];
      
      // By button type
      const buttonMap: Record<string, number> = {};
      clicks.forEach(c => { buttonMap[c.button_type] = (buttonMap[c.button_type] || 0) + 1; });
      const byButton = Object.entries(buttonMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

      // By region
      const regionMap: Record<string, number> = {};
      clicks.forEach(c => { const r = c.region || 'Desconhecido'; regionMap[r] = (regionMap[r] || 0) + 1; });
      const byRegion = Object.entries(regionMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

      // By hour (last 24h)
      const hourMap: Record<string, number> = {};
      const now = new Date();
      clicks.forEach(c => {
        const d = new Date(c.created_at);
        if (now.getTime() - d.getTime() < 24 * 60 * 60 * 1000) {
          const h = d.getHours().toString().padStart(2, '0') + ':00';
          hourMap[h] = (hourMap[h] || 0) + 1;
        }
      });
      const byHour = Object.entries(hourMap).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour));

      setClickSummary({
        totalClicks: clicks.length,
        byButton,
        byRegion,
        byHour,
        recentClicks: clicks.slice(0, 20),
      });
    } catch (e) {
      console.error('Erro ao buscar métricas de cliques:', e);
    }
  };

  const fetchVideoStats = async () => {
    setLoading(true);
    try {
      // Total de vídeos ativos
      const { count: total } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Vídeos de modelos
      const { count: models } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('model_id', 'is', null);

      // Vídeos de criadores
      const { count: creators } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('creator_id', 'is', null);

      // Vídeos recentes (últimos 7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentVideos } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Vídeos por gênero - deixar vazio por enquanto (tabela não está no schema)
      const byGenre: { name: string; count: number }[] = [];

      // Top 5 vídeos com nome do modelo/criador
      const { data: topData, error: topErr } = await supabase
        .from('videos')
        .select('id, title, views_count, likes_count, model_id, creator_id')
        .eq('is_active', true)
        .order('views_count', { ascending: false })
        .limit(5);

      console.log('Top videos data:', topData, 'error:', topErr);

      let topVideos: { id: string; title: string; owner: string; views: number; likes: number }[] = [];

      if (topData && topData.length > 0) {
        const modelIds = topData.filter(v => v.model_id).map(v => v.model_id!);
        const creatorIds = topData.filter(v => v.creator_id).map(v => v.creator_id!);
        const videoIds = topData.map(v => v.id);

        const [modelsRes, creatorsRes, likesRes] = await Promise.all([
          modelIds.length > 0
            ? supabase.from('models').select('id, name').in('id', modelIds)
            : Promise.resolve({ data: [], error: null } as any),
          creatorIds.length > 0
            ? supabase.from('profiles').select('id, name, username').in('id', creatorIds)
            : Promise.resolve({ data: [], error: null } as any),
          videoIds.length > 0
            ? supabase.from('likes').select('video_id').in('video_id', videoIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        const modelsMap: Record<string, string> = {};
        const creatorsMap: Record<string, string> = {};
        const likesMap: Record<string, number> = {};

        modelsRes.data?.forEach((m: any) => {
          modelsMap[m.id] = m.name || 'Modelo';
        });

        creatorsRes.data?.forEach((c: any) => {
          creatorsMap[c.id] = c.name || c.username || 'Criador';
        });

        likesRes.data?.forEach((like: any) => {
          if (!like.video_id) return;
          likesMap[like.video_id] = (likesMap[like.video_id] || 0) + 1;
        });

        topVideos = topData.map(v => {
          const owner = v.model_id
            ? (modelsMap[v.model_id] || 'Modelo')
            : (v.creator_id ? (creatorsMap[v.creator_id] || 'Criador') : 'Desconhecido');

          const displayTitle = v.title && v.title.trim() !== '' ? v.title : owner;
          const liveLikes = likesMap[v.id] ?? v.likes_count ?? 0;

          return {
            id: v.id,
            title: displayTitle,
            owner,
            views: Math.max(0, v.views_count || 0),
            likes: Math.max(0, liveLikes),
          };
        });
      }

      setVideoStats({
        total: total || 0,
        models: models || 0,
        creators: creators || 0,
        recentVideos: recentVideos || 0,
        byGenre,
        topVideos,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: string, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleMixRatioChange = (key: 'novos' | 'favoritos' | 'aleatorios', value: number) => {
    const others = ['novos', 'favoritos', 'aleatorios'].filter(k => k !== key) as ('novos' | 'favoritos' | 'aleatorios')[];
    const remaining = 100 - value;
    const currentOthersSum = others.reduce((sum, k) => sum + config.mixRatio[k], 0);
    
    const newMixRatio = { ...config.mixRatio, [key]: value };
    
    // Redistribuir proporcionalmente
    if (currentOthersSum > 0) {
      others.forEach(k => {
        newMixRatio[k] = Math.round((config.mixRatio[k] / currentOthersSum) * remaining);
      });
    } else {
      const perOther = Math.floor(remaining / others.length);
      others.forEach(k => {
        newMixRatio[k] = perOther;
      });
    }

    // Garantir que soma seja 100
    const sum = Object.values(newMixRatio).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      newMixRatio.aleatorios += (100 - sum);
    }

    setConfig(prev => ({ ...prev, mixRatio: newMixRatio }));
    setHasChanges(true);
  };

  const handleScoreWeightChange = (key: keyof typeof config.scoreWeights, value: number) => {
    setConfig(prev => ({
      ...prev,
      scoreWeights: { ...prev.scoreWeights, [key]: value }
    }));
    setHasChanges(true);
  };

  const saveConfig = () => {
    localStorage.setItem('intelligent_feed_config', JSON.stringify(config));
    setHasChanges(false);
    toast.success('Configurações salvas com sucesso!');
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('intelligent_feed_config');
    setHasChanges(false);
    toast.success('Configurações restauradas ao padrão');
  };

  const clearGlobalCache = () => {
    const keys = Object.keys(localStorage).filter(k => 
      k.includes('intelligent_feed') || k.includes('user_memory') || k.includes('initial_feed')
    );
    keys.forEach(k => localStorage.removeItem(k));
    toast.success(`${keys.length} itens de cache removidos`);
  };

  // Dados para o gráfico de pizza do mix ratio
  const mixRatioData = [
    { name: 'Novos', value: config.mixRatio.novos, color: '#00F5D4' },
    { name: 'Favoritos', value: config.mixRatio.favoritos, color: '#FFD93D' },
    { name: 'Aleatórios', value: config.mixRatio.aleatorios, color: '#A855F7' },
  ];

  // Dados para o gráfico de barras de vídeos por tipo
  const videoTypeData = [
    { name: 'Modelos', count: videoStats.models, fill: '#00F5D4' },
    { name: 'Criadores', count: videoStats.creators, fill: '#FFD93D' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            Feed Inteligente
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Configurações e métricas do algoritmo de recomendação
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchVideoStats}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          {hasChanges && (
            <Button 
              size="sm"
              onClick={saveConfig}
              className="bg-primary text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{videoStats.total}</p>
                <p className="text-xs text-gray-400">Vídeos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Users className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{videoStats.models}</p>
                <p className="text-xs text-gray-400">Vídeos Modelos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{videoStats.creators}</p>
                <p className="text-xs text-gray-400">Vídeos Criadores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{videoStats.recentVideos}</p>
                <p className="text-xs text-gray-400">Novos (7 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações do Algoritmo */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Mix Ratio */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Mix do Feed
            </CardTitle>
            <CardDescription className="text-gray-400">
              Proporção de tipos de vídeo no feed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-cyan-400 text-sm">Novos</Label>
                  <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                    {config.mixRatio.novos}%
                  </Badge>
                </div>
                <Slider
                  value={[config.mixRatio.novos]}
                  onValueChange={([v]) => handleMixRatioChange('novos', v)}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-yellow-400 text-sm">Favoritos</Label>
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                    {config.mixRatio.favoritos}%
                  </Badge>
                </div>
                <Slider
                  value={[config.mixRatio.favoritos]}
                  onValueChange={([v]) => handleMixRatioChange('favoritos', v)}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-yellow-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-purple-400 text-sm">Aleatórios</Label>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                    {config.mixRatio.aleatorios}%
                  </Badge>
                </div>
                <Slider
                  value={[config.mixRatio.aleatorios]}
                  onValueChange={([v]) => handleMixRatioChange('aleatorios', v)}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-purple-500"
                />
              </div>
            </div>

            {/* Pie Chart Preview */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mixRatioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${value}%`}
                    labelLine={false}
                  >
                    {mixRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Score Weights */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Settings2 className="w-5 h-5 text-primary" />
              Pesos do Score
            </CardTitle>
            <CardDescription className="text-gray-400">
              Influência de cada fator no ranking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-white text-sm">Novidade</Label>
                <span className="text-gray-400 text-sm">{config.scoreWeights.novidade}%</span>
              </div>
              <Progress value={config.scoreWeights.novidade} className="h-2" />
              <Slider
                value={[config.scoreWeights.novidade]}
                onValueChange={([v]) => handleScoreWeightChange('novidade', v)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-white text-sm">Afinidade</Label>
                <span className="text-gray-400 text-sm">{config.scoreWeights.afinidade}%</span>
              </div>
              <Progress value={config.scoreWeights.afinidade} className="h-2" />
              <Slider
                value={[config.scoreWeights.afinidade]}
                onValueChange={([v]) => handleScoreWeightChange('afinidade', v)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-white text-sm">Popularidade</Label>
                <span className="text-gray-400 text-sm">{config.scoreWeights.popularidade}%</span>
              </div>
              <Progress value={config.scoreWeights.popularidade} className="h-2" />
              <Slider
                value={[config.scoreWeights.popularidade]}
                onValueChange={([v]) => handleScoreWeightChange('popularidade', v)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-white text-sm">Aleatoriedade</Label>
                <span className="text-gray-400 text-sm">{config.scoreWeights.aleatoriedade}%</span>
              </div>
              <Progress value={config.scoreWeights.aleatoriedade} className="h-2" />
              <Slider
                value={[config.scoreWeights.aleatoriedade]}
                onValueChange={([v]) => handleScoreWeightChange('aleatoriedade', v)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            {/* Parâmetros adicionais */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <Label className="text-white text-sm mb-2 block">Max Vídeos</Label>
                <Input
                  type="number"
                  value={config.maxVideos}
                  onChange={(e) => handleConfigChange('maxVideos', parseInt(e.target.value) || 30)}
                  className="bg-gray-800 border-white/20 text-white"
                />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Dias Novidade</Label>
                <Input
                  type="number"
                  value={config.novidadeDays}
                  onChange={(e) => handleConfigChange('novidadeDays', parseInt(e.target.value) || 7)}
                  className="bg-gray-800 border-white/20 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vídeos por Tipo e Gênero */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Vídeos por Tipo */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={videoTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vídeos por Gênero */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-primary" />
              Top Gêneros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videoStats.byGenre.length > 0 ? (
              <div className="space-y-3">
                {videoStats.byGenre.map((genre, i) => (
                  <div key={genre.name} className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center border-white/20">
                      {i + 1}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-white text-sm">{genre.name}</span>
                        <span className="text-gray-400 text-sm">{genre.count}</span>
                      </div>
                      <Progress 
                        value={(genre.count / videoStats.total) * 100} 
                        className="h-1.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Nenhum gênero encontrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Vídeos */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            Top 5 Vídeos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {videoStats.topVideos.map((video, i) => (
              <div 
                key={video.id} 
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
              >
                <Badge 
                  className={`w-8 h-8 flex items-center justify-center ${
                    i === 0 ? 'bg-yellow-500' : 
                    i === 1 ? 'bg-gray-400' : 
                    i === 2 ? 'bg-amber-700' : 'bg-gray-600'
                  }`}
                >
                  {i + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{video.title}</p>
                  <p className="text-gray-400 text-xs">👤 {video.owner} · ID: {video.id.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-cyan-400">{video.views.toLocaleString()} views</span>
                  <span className="text-pink-400">{video.likes.toLocaleString()} likes</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Cliques nas Promoções */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <MousePointerClick className="w-5 h-5 text-pink-400" />
            Rastreio de Cliques — Promoções
          </CardTitle>
          <CardDescription className="text-gray-400">
            Total: {clickSummary.totalClicks} cliques registrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Por Botão */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-primary" /> Por Botão
              </h4>
              <div className="space-y-2">
                {clickSummary.byButton.map(b => (
                  <div key={b.name} className="flex justify-between items-center p-2 rounded bg-gray-800/50">
                    <span className="text-white text-sm capitalize">{b.name}</span>
                    <Badge variant="outline" className="border-pink-500/50 text-pink-400">{b.count}</Badge>
                  </div>
                ))}
                {clickSummary.byButton.length === 0 && <p className="text-gray-500 text-sm">Sem dados</p>}
              </div>
            </div>

            {/* Por Estado/Região */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" /> Por Estado
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {clickSummary.byRegion.map(r => (
                  <div key={r.name} className="flex justify-between items-center p-2 rounded bg-gray-800/50">
                    <span className="text-white text-sm">{r.name}</span>
                    <Badge variant="outline" className="border-green-500/50 text-green-400">{r.count}</Badge>
                  </div>
                ))}
                {clickSummary.byRegion.length === 0 && <p className="text-gray-500 text-sm">Sem dados</p>}
              </div>
            </div>

            {/* Por Hora */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" /> Últimas 24h por Hora
              </h4>
              {clickSummary.byHour.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clickSummary.byHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="hour" stroke="#888" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#888" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                      <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem dados nas últimas 24h</p>
              )}
            </div>
          </div>

          {/* Últimos cliques */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Últimos Cliques</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {clickSummary.recentClicks.map((c, i) => {
                const d = new Date(c.created_at);
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-gray-800/30 text-xs">
                    <Badge variant="outline" className="border-pink-500/40 text-pink-300 capitalize text-[10px]">{c.button_type}</Badge>
                    <span className="text-gray-400">{c.region || '?'}</span>
                    <span className="text-gray-500">{c.device_type}</span>
                    <span className="ml-auto text-gray-500">{d.toLocaleString('pt-BR')}</span>
                  </div>
                );
              })}
              {clickSummary.recentClicks.length === 0 && <p className="text-gray-500 text-sm">Nenhum clique registrado</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações Administrativas */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Settings2 className="w-5 h-5 text-primary" />
            Ações Administrativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={resetConfig}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar Configurações
            </Button>
            <Button 
              variant="outline" 
              onClick={clearGlobalCache}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Cache Global
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
