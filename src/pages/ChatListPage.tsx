import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, MessageSquare, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ModelWithChat {
  id: string;
  name: string;
  avatar_url: string;
  is_online: boolean;
  has_chat: boolean;
}

export default function ChatListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [models, setModels] = useState<ModelWithChat[]>([]);
  const [filteredModels, setFilteredModels] = useState<ModelWithChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModelsWithChat();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredModels(
        models.filter((model) =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredModels(models);
    }
  }, [searchQuery, models]);

  const fetchModelsWithChat = async () => {
    try {
      setLoading(true);

      // Buscar todas as modelos
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('id, name, avatar_url')
        .order('name');

      if (modelsError) throw modelsError;

      // Buscar painéis de chat ativos
      const { data: panelsData, error: panelsError } = await supabase
        .from('model_chat_panels' as any)
        .select('model_id, is_active, is_online')
        .eq('is_active', true);

      if (panelsError && panelsError.code !== 'PGRST116') {
        throw panelsError;
      }

      // Mapear modelos com status de chat
      const panelsMap = new Map(
        (panelsData as any[] || []).map((p: any) => [p.model_id, p])
      );

      const modelsWithChat: ModelWithChat[] = (modelsData || [])
        .map((model) => {
          const panel = panelsMap.get(model.id);
          return {
            ...model,
            is_online: panel?.is_online || false,
            has_chat: !!panel,
          };
        })
        .filter((m) => m.has_chat);

      setModels(modelsWithChat);
      setFilteredModels(modelsWithChat);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os chats disponíveis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[rgba(0,245,212,0.95)] via-[rgba(191,234,124,0.95)] to-[rgba(255,217,61,0.95)] p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="text-black hover:bg-black/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-black flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Chat IA
            </h1>
            <p className="text-sm text-black/70">
              Converse com suas modelos favoritas
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar modelo..."
            className="pl-10 bg-white/90 border-none text-black"
          />
        </div>
      </div>

      {/* Models List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {filteredModels.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">
                {searchQuery
                  ? 'Nenhuma modelo encontrada'
                  : 'Nenhum chat disponível no momento'}
              </p>
            </div>
          ) : (
            filteredModels.map((model, index) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  onClick={() => navigate(`/chat/${model.id}`)}
                  className="bg-gray-900/50 border-white/10 p-4 cursor-pointer hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={model.avatar_url}
                        alt={model.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      {model.is_online && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{model.name}</h3>
                      <p className="text-sm text-gray-400">
                        {model.is_online ? 'Online agora' : 'Responde em breve'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-primary/20"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Conversar
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
