import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Edge Function v2.0 - Model Auto Response (Ultra Robust)
// NUNCA retorna 500 - sempre retorna 200 com mensagem amigável
console.log('🚀 MODEL-AUTO-RESPONSE v2.0 ULTRA ROBUST loaded at', new Date().toISOString());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Função auxiliar para retornar resposta amigável
function friendlyResponse(message: string, debug?: any) {
  console.log('📤 Retornando resposta amigável:', message, debug ? JSON.stringify(debug) : '');
  return new Response(
    JSON.stringify({ 
      response: message,
      debug: debug || null
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req: Request) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📨 [${requestId}] NOVA REQUISIÇÃO: ${req.method} ${new Date().toISOString()}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight OK`);
    return new Response('ok', { headers: corsHeaders });
  }

  // MEGA TRY-CATCH - Envolve TUDO
  try {
    // ETAPA 1: Parse do body
    console.log(`📥 [${requestId}] ETAPA 1: Parseando body...`);
    let body: any;
    try {
      body = await req.json();
      console.log(`✅ [${requestId}] Body parseado:`, JSON.stringify(body));
    } catch (parseError: any) {
      console.error(`❌ [${requestId}] Erro ao parsear JSON:`, parseError?.message);
      return friendlyResponse('Ops! Não entendi sua mensagem. Tente novamente! 💕', { step: 'parse', error: parseError?.message });
    }

    const { entityId, message, conversationHistory = [], isCreator = false } = body;
    console.log(`📋 [${requestId}] Dados extraídos:`, { entityId, isCreator, messageLength: message?.length, historyLength: conversationHistory?.length });

    // ETAPA 2: Validar campos obrigatórios
    console.log(`🔍 [${requestId}] ETAPA 2: Validando campos...`);
    if (!entityId || !message) {
      console.error(`❌ [${requestId}] Campos obrigatórios ausentes`);
      return friendlyResponse('Por favor, envie uma mensagem! 💕', { step: 'validation', missing: { entityId: !entityId, message: !message } });
    }

    // ETAPA 3: Verificar variáveis de ambiente
    console.log(`🔧 [${requestId}] ETAPA 3: Verificando env vars...`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`❌ [${requestId}] Variáveis de ambiente Supabase ausentes`);
      return friendlyResponse('Estou com problemas técnicos. Tente mais tarde! 💕', { step: 'env', hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
    }
    console.log(`✅ [${requestId}] Env vars OK`);

    // ETAPA 4: Criar cliente Supabase
    console.log(`🔧 [${requestId}] ETAPA 4: Criando cliente Supabase...`);
    let supabase: any;
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log(`✅ [${requestId}] Cliente Supabase criado`);
    } catch (clientError: any) {
      console.error(`❌ [${requestId}] Erro ao criar cliente Supabase:`, clientError?.message);
      return friendlyResponse('Problema de conexão. Tente novamente! 💕', { step: 'supabase_client', error: clientError?.message });
    }

    // ETAPA 5: Buscar chat panel
    console.log(`🔍 [${requestId}] ETAPA 5: Buscando chat panel para ${isCreator ? 'creator_id' : 'model_id'} = ${entityId}`);
    let chatPanel: any = null;
    
    try {
      const columnName = isCreator ? 'creator_id' : 'model_id';
      const { data, error } = await supabase
        .from('model_chat_panels')
        .select('*')
        .eq(columnName, entityId)
        .maybeSingle();
      
      if (error) {
        console.error(`❌ [${requestId}] Erro na query:`, error);
        return friendlyResponse('Não consegui acessar minha configuração. Tente novamente! 💕', { step: 'query', error: error.message });
      }
      
      chatPanel = data;
      console.log(`✅ [${requestId}] Query executada. Resultado:`, chatPanel ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    } catch (queryError: any) {
      console.error(`❌ [${requestId}] Exception na query:`, queryError?.message);
      return friendlyResponse('Erro ao buscar configuração. Tente novamente! 💕', { step: 'query_exception', error: queryError?.message });
    }

    // ETAPA 6: Verificar se chat panel existe
    console.log(`🔍 [${requestId}] ETAPA 6: Verificando existência do chat panel...`);
    if (!chatPanel) {
      console.log(`⚠️ [${requestId}] Chat panel NÃO encontrado para ${isCreator ? 'creator' : 'model'}: ${entityId}`);
      return friendlyResponse('Meu chat ainda não foi configurado. Configure-o primeiro! 💕', { step: 'not_found', entityId, isCreator });
    }

    // ETAPA 7: Log completo do chat panel
    console.log(`📋 [${requestId}] ETAPA 7: Chat panel encontrado - DETALHES COMPLETOS:`);
    console.log(`   - ID: ${chatPanel.id}`);
    console.log(`   - is_active: ${chatPanel.is_active}`);
    console.log(`   - is_online: ${chatPanel.is_online}`);
    console.log(`   - ai_provider: "${chatPanel.ai_provider}"`);
    console.log(`   - api_key_encrypted: ${chatPanel.api_key_encrypted ? `"${chatPanel.api_key_encrypted.substring(0, 10)}..." (${chatPanel.api_key_encrypted.length} chars)` : 'VAZIO/NULL'}`);
    console.log(`   - prompt: ${chatPanel.prompt ? `"${chatPanel.prompt.substring(0, 50)}..."` : 'VAZIO/NULL'}`);
    console.log(`   - model_id: ${chatPanel.model_id}`);
    console.log(`   - creator_id: ${chatPanel.creator_id}`);

    // ETAPA 8: Verificar se está ativo
    console.log(`🔍 [${requestId}] ETAPA 8: Verificando status...`);
    if (!chatPanel.is_active) {
      console.log(`⚠️ [${requestId}] Chat está DESATIVADO`);
      return friendlyResponse('Meu chat está desativado no momento. 💕', { step: 'inactive' });
    }

    // ETAPA 9: Verificar provider
    console.log(`🔍 [${requestId}] ETAPA 9: Verificando provider...`);
    const provider = chatPanel.ai_provider?.toLowerCase()?.trim();
    console.log(`   Provider normalizado: "${provider}"`);
    
    if (!provider) {
      console.error(`❌ [${requestId}] Provider não configurado. Valor raw: "${chatPanel.ai_provider}"`);
      return friendlyResponse('Configure o provedor de IA no painel admin! 💕', { step: 'no_provider', rawProvider: chatPanel.ai_provider });
    }

    // ETAPA 10: Verificar API key
    console.log(`🔍 [${requestId}] ETAPA 10: Verificando API key...`);
    const apiKey = chatPanel.api_key_encrypted?.trim();
    
    if (!apiKey) {
      console.error(`❌ [${requestId}] API Key não configurada`);
      return friendlyResponse('Configure a API Key no painel admin! 💕', { step: 'no_api_key' });
    }
    console.log(`✅ [${requestId}] API Key presente: ${apiKey.substring(0, 8)}... (${apiKey.length} chars)`);

    // ETAPA 11: Chamar IA
    console.log(`🤖 [${requestId}] ETAPA 11: Chamando IA (provider: ${provider})...`);
    const systemPrompt = chatPanel.prompt || 'Você é um assistente prestativo e amigável.';
    let aiResponse = '';

    try {
      if (provider === 'gemini') {
        console.log(`🔧 [${requestId}] Iniciando chamada Gemini...`);
        aiResponse = await callGemini(apiKey, message, systemPrompt, conversationHistory, requestId);
      } else if (provider === 'openai') {
        console.log(`🔧 [${requestId}] Iniciando chamada OpenAI...`);
        aiResponse = await callOpenAI(apiKey, message, systemPrompt, conversationHistory, requestId);
      } else {
        console.error(`❌ [${requestId}] Provider não suportado: "${provider}"`);
        return friendlyResponse(`Provider "${provider}" não é suportado. Use "gemini" ou "openai"! 💕`, { step: 'unsupported_provider', provider });
      }

      console.log(`✅ [${requestId}] Resposta da IA recebida (${aiResponse.length} chars)`);
    } catch (aiError: any) {
      console.error(`❌ [${requestId}] ERRO NA IA:`, aiError?.message);
      console.error(`❌ [${requestId}] Stack:`, aiError?.stack?.substring(0, 500));
      return friendlyResponse('Estou com dificuldades técnicas. Tente novamente! 💕', { 
        step: 'ai_error', 
        provider,
        error: aiError?.message,
        apiKeyPrefix: apiKey.substring(0, 8)
      });
    }

    // ETAPA 12: Retornar resposta
    console.log(`✅ [${requestId}] ETAPA 12: Retornando resposta final`);
    console.log(`${'='.repeat(50)}\n`);
    
    return new Response(
      JSON.stringify({ response: aiResponse }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (MEGA_ERROR: any) {
    // MEGA CATCH - Captura QUALQUER erro não previsto
    console.error(`\n🚨🚨🚨 [MEGA ERROR] ERRO NÃO CAPTURADO 🚨🚨🚨`);
    console.error(`Mensagem: ${MEGA_ERROR?.message}`);
    console.error(`Stack: ${MEGA_ERROR?.stack}`);
    console.error(`Tipo: ${typeof MEGA_ERROR}`);
    console.error(`JSON: ${JSON.stringify(MEGA_ERROR)}`);
    
    // NUNCA retorna 500 - sempre 200 com mensagem amigável
    return friendlyResponse('Ops! Algo deu errado. Tente novamente! 💕', {
      step: 'mega_catch',
      error: MEGA_ERROR?.message,
      type: typeof MEGA_ERROR
    });
  }
});

async function callGemini(apiKey: string, userMessage: string, systemPrompt: string, history: any[], requestId: string): Promise<string> {
  console.log(`🔧 [${requestId}] Gemini: Preparando request...`);
  
  const contents = [];

  // Adicionar histórico
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  // Adicionar mensagem atual
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  console.log(`🔧 [${requestId}] Gemini: Enviando ${contents.length} mensagens...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    }
  );

  console.log(`🔧 [${requestId}] Gemini: Status ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [${requestId}] Gemini erro:`, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui gerar uma resposta.';
  console.log(`✅ [${requestId}] Gemini: Resposta OK (${text.length} chars)`);
  return text;
}

async function callOpenAI(apiKey: string, userMessage: string, systemPrompt: string, history: any[], requestId: string): Promise<string> {
  console.log(`🔧 [${requestId}] OpenAI: Preparando request...`);
  console.log(`🔧 [${requestId}] OpenAI: API Key prefix: ${apiKey.substring(0, 10)}...`);
  
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Adicionar histórico
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }

  // Adicionar mensagem atual
  messages.push({ role: 'user', content: userMessage });

  console.log(`🔧 [${requestId}] OpenAI: Enviando ${messages.length} mensagens...`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.9,
      max_tokens: 1024,
    })
  });

  console.log(`🔧 [${requestId}] OpenAI: Status ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [${requestId}] OpenAI erro raw:`, errorText);
    
    try {
      const errorJson = JSON.parse(errorText);
      const errorMessage = errorJson.error?.message || errorText;
      throw new Error(`OpenAI: ${errorMessage}`);
    } catch (parseErr) {
      throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
  console.log(`✅ [${requestId}] OpenAI: Resposta OK (${text.length} chars)`);
  return text;
}
