import { supabase } from '@/integrations/supabase/client';

/**
 * Retorna o user_id correto:
 * - Se o usuário estiver autenticado: retorna auth.user.id
 * - Se não estiver autenticado: retorna/cria UUID anônimo no localStorage
 * - Migra automaticamente IDs antigos do sessionStorage para localStorage
 */
export const getUserId = async (): Promise<string> => {
  // 1️⃣ Verificar se usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id) {
    console.log('✅ getUserId: Usuário autenticado:', user.id);
    return user.id;
  }
  
  // 2️⃣ Migração: mover IDs antigos do sessionStorage para localStorage
  const sessionId = sessionStorage.getItem('anonymous_user_id') || sessionStorage.getItem('user_id');
  let anonymousId = localStorage.getItem('anonymous_user_id');
  
  if (!anonymousId && sessionId) {
    // Migrar ID do sessionStorage para localStorage
    anonymousId = sessionId;
    localStorage.setItem('anonymous_user_id', anonymousId);
    console.log('🔄 getUserId: ID migrado do sessionStorage para localStorage:', anonymousId);
    // Limpar sessionStorage antigo
    sessionStorage.removeItem('anonymous_user_id');
    sessionStorage.removeItem('user_id');
  }
  
  // 3️⃣ Usuário anônimo: usar/criar UUID no localStorage
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
  
  // Migração: mover IDs antigos do sessionStorage para localStorage
  const sessionId = sessionStorage.getItem('anonymous_user_id') || sessionStorage.getItem('user_id');
  let anonymousId = localStorage.getItem('anonymous_user_id');
  
  if (!anonymousId && sessionId) {
    anonymousId = sessionId;
    localStorage.setItem('anonymous_user_id', anonymousId);
    sessionStorage.removeItem('anonymous_user_id');
    sessionStorage.removeItem('user_id');
  }
  
  // Fallback para anônimo - USAR localStorage (consistência)
  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem('anonymous_user_id', anonymousId);
  }
  
  return anonymousId;
};