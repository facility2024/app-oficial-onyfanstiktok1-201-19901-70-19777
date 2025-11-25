import { supabase } from '@/integrations/supabase/client';

/**
 * Retorna o user_id correto:
 * - Se o usuário estiver autenticado: retorna auth.user.id
 * - Se não estiver autenticado: retorna/cria UUID anônimo no sessionStorage
 */
export const getUserId = async (): Promise<string> => {
  // 1️⃣ Verificar se usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id) {
    console.log('✅ getUserId: Usuário autenticado:', user.id);
    return user.id;
  }
  
  // 2️⃣ Usuário anônimo: usar/criar UUID no localStorage (consistência)
  let anonymousId = localStorage.getItem('anonymous_user_id');
  
  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem('anonymous_user_id', anonymousId);
    console.log('✅ getUserId: Criado ID anônimo:', anonymousId);
  } else {
    console.log('✅ getUserId: Usando ID anônimo existente:', anonymousId);
  }
  
  return anonymousId;
};

/**
 * Versão síncrona - usa cache do auth
 * Use apenas quando tiver certeza que o auth já foi inicializado
 */
export const getUserIdSync = (): string | null => {
  // Tentar pegar do cache do supabase (já carregado)
  const sessionStr = localStorage.getItem('sb-tnzvhwapfhkhqjgyiomk-auth-token');
  
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session?.user?.id) {
        return session.user.id;
      }
    } catch {}
  }
  
  // Fallback para anônimo - USAR localStorage (consistência)
  let anonymousId = localStorage.getItem('anonymous_user_id');
  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem('anonymous_user_id', anonymousId);
  }
  
  return anonymousId;
};