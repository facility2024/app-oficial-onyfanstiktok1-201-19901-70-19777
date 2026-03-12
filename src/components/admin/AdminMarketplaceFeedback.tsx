import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Trash2, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedbackItem {
  id: string;
  message: string;
  user_email: string | null;
  created_at: string;
}

export const AdminMarketplaceFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    // First cleanup old ones
    await (supabase as any).rpc('cleanup_old_marketplace_feedback');
    
    const { data, error } = await (supabase as any)
      .from('marketplace_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setFeedbacks(data);
    if (error) toast.error('Erro ao carregar feedbacks');
    setLoading(false);
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  const deleteFeedback = async (id: string) => {
    await (supabase as any).from('marketplace_feedback').delete().eq('id', id);
    setFeedbacks(prev => prev.filter(f => f.id !== id));
    toast.success('Feedback removido');
  };

  const getTimeRemaining = (createdAt: string) => {
    const expiry = new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return 'Expirando...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min restantes`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-amber-400" />
          Feedback do Marketplace
        </h2>
        <Button onClick={fetchFeedbacks} variant="outline" size="sm" className="text-white border-white/20">
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      <p className="text-amber-400 text-sm">
        ⚠️ Feedbacks são automaticamente deletados após 48 horas do envio.
      </p>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : feedbacks.length === 0 ? (
        <Card className="bg-gray-900 border-white/10">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum feedback recebido no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {feedbacks.map(fb => (
            <Card key={fb.id} className="bg-gray-900 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white text-base mb-2">{fb.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        📧 {fb.user_email || 'Anônimo'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      <span className="text-amber-400 font-medium">
                        ⏳ {getTimeRemaining(fb.created_at)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFeedback(fb.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
