import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Event = {
  id: string;
  created_at: string;
  resource_id: string | null;
  payload: any;
};

export default function AdminIngestInstagramLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('api_events')
      .select('id, created_at, resource_id, payload')
      .eq('event_type', 'ingest.instagram')
      .order('created_at', { ascending: false })
      .limit(100);
    setEvents((data as Event[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const endpoint = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/ingest-instagram`;

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Ingest Instagram (Externo)</h3>
            <p className="text-sm text-gray-400">
              Endpoint que recebe criadoras e vídeos de uma ferramenta externa e cria tudo aqui automaticamente.
            </p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-gray-950 border border-gray-700 rounded font-mono text-xs text-green-300 break-all">
          POST {endpoint}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Autentique com <code className="text-white">Authorization: Bearer &lt;API_KEY&gt;</code> (gere em API & Webhooks).
          Body: <code className="text-white">{`{ creator: { instagram_username, display_name, avatar_url, bio }, videos: [{ video_url, thumbnail_url, caption, ig_shortcode, duration_seconds, visibility }] }`}</code>
        </p>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Últimas ingestões ({events.length})</h3>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
        {events.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhuma ingestão registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="p-3 bg-gray-900 border border-gray-700 rounded text-sm">
                <div className="flex flex-wrap items-center gap-2 text-white">
                  <Badge className="bg-purple-600">@{e.payload?.username ?? '—'}</Badge>
                  <Badge className="bg-green-600">+{e.payload?.inserted ?? 0} vídeos</Badge>
                  {e.payload?.skipped ? <Badge className="bg-yellow-600">{e.payload.skipped} pulados</Badge> : null}
                  <span className="text-xs text-gray-400 ml-auto">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">creator_id: {e.resource_id}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
