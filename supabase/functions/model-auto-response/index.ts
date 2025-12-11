// =====================================================
// MODEL-AUTO-RESPONSE v3.0 - COMPLETE REWRITE
// Deployed: 2024-12-11 - FORCE CACHE INVALIDATION
// =====================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const VERSION = "v3.0-FORCE-CACHE-CLEAR";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log(`🚀 [${VERSION}] Edge Function initialized at ${new Date().toISOString()}`);

// Função auxiliar para resposta amigável - NUNCA retorna erro 500
const createResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

const friendlyError = (message: string, debugInfo?: any) => {
  console.log(`📤 Resposta amigável: ${message}`, debugInfo || '');
  return createResponse({ response: message, debug: debugInfo });
};

// Handler principal
const handler = async (req: Request): Promise<Response> => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📨 [${requestId}] ${req.method} request received`);
  console.log(`📨 [${requestId}] Version: ${VERSION}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight OK`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Step 1: Parse request body
    console.log(`📥 [${requestId}] Step 1: Parsing request body...`);
    
    let requestBody: any;
    try {
      const rawBody = await req.text();
      console.log(`📥 [${requestId}] Raw body length: ${rawBody.length}`);
      requestBody = JSON.parse(rawBody);
    } catch (parseErr: any) {
      console.error(`❌ [${requestId}] JSON parse error:`, parseErr?.message);
      return friendlyError('Não entendi sua mensagem. Tente novamente! 💕', { step: 1, error: 'parse_error' });
    }

    const { entityId, message, conversationHistory, isCreator } = requestBody;
    console.log(`📋 [${requestId}] Extracted data:`, {
      entityId: entityId || 'MISSING',
      isCreator: isCreator || false,
      messageLength: message?.length || 0,
      historyLength: conversationHistory?.length || 0
    });

    // Step 2: Validate required fields
    console.log(`🔍 [${requestId}] Step 2: Validating fields...`);
    
    if (!entityId) {
      console.error(`❌ [${requestId}] Missing entityId`);
      return friendlyError('Erro de configuração. Tente novamente! 💕', { step: 2, missing: 'entityId' });
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.error(`❌ [${requestId}] Missing or invalid message`);
      return friendlyError('Por favor, digite uma mensagem! 💕', { step: 2, missing: 'message' });
    }

    // Step 3: Create Supabase client
    console.log(`🔧 [${requestId}] Step 3: Creating Supabase client...`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error(`❌ [${requestId}] Missing Supabase env vars`);
      return friendlyError('Configuração do servidor incompleta. 💕', { step: 3, error: 'env_vars' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`✅ [${requestId}] Supabase client created`);

    // Step 4: Fetch chat panel configuration
    console.log(`🔍 [${requestId}] Step 4: Fetching chat panel...`);
    console.log(`🔍 [${requestId}] Looking for ${isCreator ? 'creator_id' : 'model_id'} = ${entityId}`);
    
    const columnName = isCreator === true ? 'creator_id' : 'model_id';
    
    const { data: chatPanel, error: queryError } = await supabase
      .from('model_chat_panels')
      .select('*')
      .eq(columnName, entityId)
      .maybeSingle();

    if (queryError) {
      console.error(`❌ [${requestId}] Query error:`, queryError);
      return friendlyError('Não consegui acessar minha configuração. 💕', { step: 4, error: queryError.message });
    }

    if (!chatPanel) {
      console.log(`⚠️ [${requestId}] Chat panel NOT FOUND for ${columnName}=${entityId}`);
      return friendlyError('Meu chat ainda não foi configurado. Configure no painel admin! 💕', { step: 4, notFound: true });
    }

    // Step 5: Log chat panel details
    console.log(`✅ [${requestId}] Step 5: Chat panel found!`);
    console.log(`   📋 ID: ${chatPanel.id}`);
    console.log(`   📋 is_active: ${chatPanel.is_active}`);
    console.log(`   📋 is_online: ${chatPanel.is_online}`);
    console.log(`   📋 ai_provider: "${chatPanel.ai_provider}"`);
    console.log(`   📋 api_key: ${chatPanel.api_key_encrypted ? `${chatPanel.api_key_encrypted.substring(0, 8)}... (${chatPanel.api_key_encrypted.length} chars)` : 'EMPTY'}`);
    console.log(`   📋 prompt: ${chatPanel.prompt ? `"${chatPanel.prompt.substring(0, 40)}..."` : 'EMPTY'}`);

    // Step 6: Validate chat panel status
    console.log(`🔍 [${requestId}] Step 6: Validating chat status...`);
    
    if (!chatPanel.is_active) {
      console.log(`⚠️ [${requestId}] Chat is INACTIVE`);
      return friendlyError('Meu chat está desativado no momento. 💕', { step: 6, inactive: true });
    }

    // Step 7: Validate AI provider
    console.log(`🔍 [${requestId}] Step 7: Validating AI provider...`);
    
    const provider = (chatPanel.ai_provider || '').toLowerCase().trim();
    console.log(`   Provider normalized: "${provider}"`);
    
    if (!provider || (provider !== 'gemini' && provider !== 'openai')) {
      console.error(`❌ [${requestId}] Invalid provider: "${provider}"`);
      return friendlyError(`Configure o provedor de IA (gemini ou openai) no painel admin! 💕`, { step: 7, provider: chatPanel.ai_provider });
    }

    // Step 8: Validate API key
    console.log(`🔍 [${requestId}] Step 8: Validating API key...`);
    
    const apiKey = (chatPanel.api_key_encrypted || '').trim();
    
    if (!apiKey || apiKey.length < 10) {
      console.error(`❌ [${requestId}] Invalid API key (length: ${apiKey.length})`);
      return friendlyError('Configure a API Key no painel admin! 💕', { step: 8, keyLength: apiKey.length });
    }
    console.log(`✅ [${requestId}] API key valid: ${apiKey.substring(0, 8)}... (${apiKey.length} chars)`);

    // Step 9: Prepare AI request
    console.log(`🤖 [${requestId}] Step 9: Preparing AI request...`);
    
    const systemPrompt = chatPanel.prompt || 'Você é um assistente prestativo e amigável.';
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    
    console.log(`   System prompt: "${systemPrompt.substring(0, 50)}..."`);
    console.log(`   History messages: ${history.length}`);
    console.log(`   User message: "${message.substring(0, 50)}..."`);

    // Step 10: Call AI API
    console.log(`🤖 [${requestId}] Step 10: Calling ${provider.toUpperCase()} API...`);
    
    let aiResponse: string;
    
    try {
      if (provider === 'gemini') {
        aiResponse = await callGeminiAPI(apiKey, message, systemPrompt, history, requestId);
      } else {
        aiResponse = await callOpenAIAPI(apiKey, message, systemPrompt, history, requestId);
      }
      
      console.log(`✅ [${requestId}] AI response received (${aiResponse.length} chars)`);
    } catch (aiError: any) {
      console.error(`❌ [${requestId}] AI API error:`, aiError?.message);
      return friendlyError('Estou com dificuldades técnicas. Tente novamente! 💕', { 
        step: 10, 
        provider, 
        error: aiError?.message 
      });
    }

    // Step 11: Return success response
    console.log(`✅ [${requestId}] Step 11: Returning success response`);
    console.log(`${'='.repeat(60)}\n`);
    
    return createResponse({ response: aiResponse });

  } catch (unexpectedError: any) {
    // Catch-all for any unexpected errors
    console.error(`🚨 [${requestId}] UNEXPECTED ERROR:`, unexpectedError?.message);
    console.error(`🚨 [${requestId}] Stack:`, unexpectedError?.stack?.substring(0, 500));
    
    return friendlyError('Ops! Algo deu errado. Tente novamente! 💕', {
      step: 'unexpected',
      error: unexpectedError?.message
    });
  }
};

// Gemini API call
async function callGeminiAPI(
  apiKey: string, 
  userMessage: string, 
  systemPrompt: string, 
  history: any[], 
  requestId: string
): Promise<string> {
  console.log(`🔧 [${requestId}] Gemini: Building request...`);
  
  const contents: any[] = [];
  
  // Add history
  for (const msg of history) {
    if (msg && msg.content) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(msg.content) }]
      });
    }
  }
  
  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  console.log(`🔧 [${requestId}] Gemini: Sending ${contents.length} messages...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
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
    console.error(`❌ [${requestId}] Gemini error:`, errorText.substring(0, 300));
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    console.error(`❌ [${requestId}] Gemini: No text in response`);
    throw new Error('Gemini returned empty response');
  }
  
  console.log(`✅ [${requestId}] Gemini: Success (${text.length} chars)`);
  return text;
}

// OpenAI API call
async function callOpenAIAPI(
  apiKey: string, 
  userMessage: string, 
  systemPrompt: string, 
  history: any[], 
  requestId: string
): Promise<string> {
  console.log(`🔧 [${requestId}] OpenAI: Building request...`);
  console.log(`🔧 [${requestId}] OpenAI: API key prefix: ${apiKey.substring(0, 10)}...`);
  
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add history
  for (const msg of history) {
    if (msg && msg.content) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: String(msg.content)
      });
    }
  }
  
  // Add current message
  messages.push({ role: 'user', content: userMessage });

  console.log(`🔧 [${requestId}] OpenAI: Sending ${messages.length} messages...`);

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
    console.error(`❌ [${requestId}] OpenAI error:`, errorText.substring(0, 300));
    
    let errorMessage = `OpenAI API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {}
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  
  if (!text) {
    console.error(`❌ [${requestId}] OpenAI: No text in response`);
    throw new Error('OpenAI returned empty response');
  }
  
  console.log(`✅ [${requestId}] OpenAI: Success (${text.length} chars)`);
  return text;
}

// Start the server
Deno.serve(handler);
