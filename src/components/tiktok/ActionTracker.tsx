import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ActionTrackerProps {
  onActionAttempt: (actionType: string, userName: string) => Promise<boolean>;
}

export const ActionTracker = ({ onActionAttempt }: ActionTrackerProps) => {
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('bonusUser');
    if (userData) {
      const user = JSON.parse(userData);
      setUserName(user.name);
    }
  }, []);

  const checkDailyLimit = (actionType: string): boolean => {
    const userData = localStorage.getItem('bonusUser');
    if (!userData) return true; // Not registered, allow action
    
    const user = JSON.parse(userData);
    const today = new Date().toDateString();
    const lastActionDate = user.lastActionDate;
    
    // Reset counter if it's a new day
    if (lastActionDate !== today) {
      user.dailyActions = 0;
      user.lastActionDate = today;
      localStorage.setItem('bonusUser', JSON.stringify(user));
    }
    
    // Check if user has reached daily limit
    if (user.dailyActions >= 3) {
      // Calculate time remaining until next day
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(`${hours}h ${minutes}m`);
      setShowLimitDialog(true);
      return false;
    }
    
    // Increment action counter
    user.dailyActions += 1;
    localStorage.setItem('bonusUser', JSON.stringify(user));
    
    return true;
  };

  const handleActionAttempt = async (actionType: string) => {
    const canPerformAction = checkDailyLimit(actionType);
    return await onActionAttempt(actionType, userName);
  };

  return (
    <>
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="bg-gradient-to-b from-red-500 to-red-600 text-white border-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
              😢 {userName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <p className="text-lg font-bold">
              Você já cumpriu sua tarefa hoje!
            </p>
            <p className="text-sm">
              Você agora só pode executar comentários e compartilhamentos dentro das próximas 24 horas.
            </p>
            <div className="bg-white/20 p-4 rounded-lg">
              <p className="text-sm font-bold">
                Tempo restante: {timeRemaining}
              </p>
            </div>
            <Button 
              onClick={() => setShowLimitDialog(false)}
              className="w-full bg-white text-red-600 hover:bg-gray-100 font-bold"
            >
              ENTENDI
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Export utility function for other components to use
export const useActionTracker = () => {
  const checkAndTrackAction = async (actionType: string, videoId?: string, modelId?: string): Promise<boolean> => {
    const userData = localStorage.getItem('bonusUser');
    
    // Allow all actions for unregistered users
    if (!userData) {
      console.log('No user data found, allowing action:', actionType);
      return true;
    }
    
    try {
      const user = JSON.parse(userData);
      const userId = user.id;
      
      if (!userId) {
        console.log('No user ID found, action allowed but not tracked');
        return true;
      }

      // Verificar se é uma ação válida para pontuação
      const validActions = ['like', 'comment', 'share', 'profile_view'];
      if (!validActions.includes(actionType)) {
        return true;
      }

      // Registrar ação no banco de dados
      const { data: actionData, error: actionError } = await supabase
        .from('user_actions')
        .insert([{
          user_id: userId,
          action_type: actionType,
          video_id: videoId || null,
          model_id: modelId || null,
          session_id: `session_${Date.now()}`,
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent
        }])
        .select()
        .single();

      if (actionError) {
        console.error('Erro ao registrar ação:', actionError);
        return true; // Continua funcionando mesmo com erro
      }

      // Verificar se completou uma tarefa (3 ações)
      const { data: taskData } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('task_date', new Date().toISOString().split('T')[0])
        .single();

      // Se completou tarefa pela primeira vez hoje, mostrar mensagem
      if (taskData && taskData.is_completed && taskData.total_actions === 3) {
        showCompletionMessage(user.name, taskData);
      }

      console.log('Ação registrada:', actionType, 'User:', userId);
      return true;

    } catch (error) {
      console.error('Erro ao processar ação:', error);
      return true; // Sempre permite a ação mesmo com erro
    }
  };

  const getClientIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Erro ao obter IP:', error);
      return null;
    }
  };

  const showCompletionMessage = (userName: string, taskData: any) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    toast({
      title: `🎉 Parabéns ${userName}!`,
      description: `Você completou as 3 tarefas com excelência! Agora faltam ${hours}h ${minutes}m para você realizar novas tarefas. Você acabou de conquistar 1 ponto!`,
      duration: 8000,
    });
  };

  return { checkAndTrackAction };
};