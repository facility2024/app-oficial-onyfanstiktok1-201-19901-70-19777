import { Eye, Heart, MessageCircle, Share2, TrendingUp, Award, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreatorStats, TopVideo } from '@/hooks/useCreatorStats';

export function CreatorStatsPanel() {
  const { stats, loading, error, refetch } = useCreatorStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 bg-red-500/10 border-red-500/30 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={refetch} variant="outline" className="text-white border-gray-600">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </Card>
    );
  }

  if (!stats) return null;

  const maxViews = Math.max(...stats.viewsLast7Days.map(d => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">📊 Resumo de Performance</h2>
        <Button onClick={refetch} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Eye className="w-6 h-6" />} 
          label="Total de Views" 
          value={formatNumber(stats.totalViews)} 
          color="from-green-500 to-emerald-600"
        />
        <StatCard 
          icon={<Heart className="w-6 h-6" />} 
          label="Curtidas" 
          value={formatNumber(stats.totalLikes)} 
          color="from-pink-500 to-rose-600"
        />
        <StatCard 
          icon={<MessageCircle className="w-6 h-6" />} 
          label="Comentários" 
          value={formatNumber(stats.totalComments)} 
          color="from-blue-500 to-cyan-600"
        />
        <StatCard 
          icon={<Share2 className="w-6 h-6" />} 
          label="Compartilhados" 
          value={formatNumber(stats.totalShares)} 
          color="from-orange-500 to-amber-600"
        />
      </div>

      {/* Gráfico de Views (Últimos 7 dias) */}
      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
          Visualizações (Últimos 7 dias)
        </h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {stats.viewsLast7Days.map((day, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full flex flex-col items-center justify-end h-28">
                <span className="text-xs text-gray-400 mb-1">{day.views}</span>
                <div 
                  className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-md transition-all duration-300"
                  style={{ 
                    height: `${Math.max((day.views / maxViews) * 100, 4)}%`,
                    minHeight: '4px'
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 mt-2">{day.day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top 5 Vídeos */}
      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-yellow-400" />
          Top 5 Vídeos Mais Populares
        </h3>
        {stats.topVideos.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            Você ainda não tem vídeos publicados.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.topVideos.map((video, index) => (
              <TopVideoItem key={video.id} video={video} rank={index + 1} />
            ))}
          </div>
        )}
      </Card>

      {/* Métricas de Engajamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gray-800/50 border-gray-700 p-6">
          <h3 className="text-white font-semibold mb-2">📊 Taxa de Engajamento</h3>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-green-400">
              {stats.engagementRate.toFixed(1)}%
            </span>
            <div className="flex-1">
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.engagementRate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                (Curtidas + Comentários) / Views
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700 p-6">
          <h3 className="text-white font-semibold mb-2">📈 Crescimento Semanal</h3>
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-bold ${stats.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(0)}%
            </span>
            <div className="flex-1">
              <p className={`text-sm ${stats.growthRate >= 10 ? 'text-green-400' : 'text-gray-400'}`}>
                {stats.growthRate >= 10 ? '↑ Acima da média!' : 'Continue publicando!'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Baseado nas views da última semana
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Total */}
      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 p-4">
        <p className="text-center text-gray-300">
          📹 Você tem <span className="font-bold text-white">{stats.totalVideos}</span> vídeo(s) publicado(s)
        </p>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <Card className={`bg-gradient-to-br ${color} p-4 border-0`}>
      <div className="flex items-center gap-3">
        <div className="text-white/80">{icon}</div>
        <div>
          <p className="text-white/70 text-xs">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

interface TopVideoItemProps {
  video: TopVideo;
  rank: number;
}

function TopVideoItem({ video, rank }: TopVideoItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-colors">
      <span className="text-2xl font-bold text-gray-500 w-8">#{rank}</span>
      <img 
        src={video.thumbnail_url} 
        alt={video.title}
        className="w-16 h-10 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{video.title}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {formatNumber(video.views_count)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {formatNumber(video.likes_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> {formatNumber(video.comments_count)}
          </span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-green-400 text-sm font-semibold">
          {video.engagementRate.toFixed(1)}%
        </span>
        <p className="text-xs text-gray-500">engajamento</p>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
