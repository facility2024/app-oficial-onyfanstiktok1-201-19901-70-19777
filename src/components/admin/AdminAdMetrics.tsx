import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdMetric {
  promo_id: string;
  title: string;
  advertiser: string | null;
  category: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  avg_watch_ms: number;
  completed_views: number;
  abandon_rate: number;
}

export const AdminAdMetrics = () => {
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ad-metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_ad_metrics');
      if (error) {
        console.error('[AdMetrics]', error);
        return [] as AdMetric[];
      }
      return (data || []) as AdMetric[];
    },
    staleTime: 30_000,
  });

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-black p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          Métricas dos Anúncios (Ad Server)
        </h3>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando métricas...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma métrica registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="py-2 pr-3">Anúncio</th>
                <th className="py-2 pr-3">Anunciante</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Impressões</th>
                <th className="py-2 pr-3">Cliques</th>
                <th className="py-2 pr-3">CTR</th>
                <th className="py-2 pr-3">Tempo médio</th>
                <th className="py-2 pr-3">Completas</th>
                <th className="py-2 pr-3">Abandono</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.promo_id} className="border-b border-white/5 text-white">
                  <td className="py-2 pr-3 font-semibold">{m.title}</td>
                  <td className="py-2 pr-3 text-gray-300">{m.advertiser || '—'}</td>
                  <td className="py-2 pr-3 text-gray-300">{m.category || '—'}</td>
                  <td className="py-2 pr-3">{m.impressions}</td>
                  <td className="py-2 pr-3">{m.clicks}</td>
                  <td className="py-2 pr-3 text-emerald-400 font-bold">{Number(m.ctr).toFixed(2)}%</td>
                  <td className="py-2 pr-3">{(Number(m.avg_watch_ms) / 1000).toFixed(1)}s</td>
                  <td className="py-2 pr-3">{m.completed_views}</td>
                  <td className="py-2 pr-3 text-orange-400">{Number(m.abandon_rate).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAdMetrics;
