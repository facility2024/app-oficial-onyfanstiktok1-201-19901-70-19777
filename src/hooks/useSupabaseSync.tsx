import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSupabaseSync = () => {
  
  const testConnection = useCallback(async () => {
    try {
      console.log('🧪 Testando conexão com Supabase...');
      
      const { data, error } = await supabase
        .from('videos')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro na conexão:', error);
        toast.error('Erro na conexão com o banco de dados');
        return false;
      }
      
      console.log('✅ Conexão com Supabase OK');
      return true;
      
    } catch (error) {
      console.error('❌ Erro crítico:', error);
      toast.error('Erro crítico na conexão');
      return false;
    }
  }, []);

  const syncData = useCallback(async () => {
    try {
      console.log('🔄 Sincronizando dados...');
      
      // Testar conexão primeiro
      const isConnected = await testConnection();
      if (!isConnected) return false;
      
      // Processar posts agendados automaticamente
      const { data, error } = await supabase.functions.invoke('process-scheduled-posts');
      
      if (error) {
        console.error('❌ Erro ao processar posts:', error);
        return false;
      }
      
      console.log('✅ Sincronização completa:', data);
      return true;
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      return false;
    }
  }, [testConnection]);

  useEffect(() => {
    // Testar conexão na inicialização
    testConnection();
    
    // Sincronizar dados periodicamente (a cada 5 minutos)
    const interval = setInterval(syncData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [testConnection, syncData]);

  return {
    testConnection,
    syncData
  };
};