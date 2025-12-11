// =====================================================
// CREATOR-CHAT v1.0 - NEW FUNCTION (replaces model-auto-response)
// Created: 2024-12-11
// =====================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const VERSION = "creator-chat-v1.1";
const BUILD_TIME = "2025-12-11T14:30:00Z";

console.log(`🔄 [${VERSION}] Build time: ${BUILD_TIME} - Forcing redeploy`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

console.log(`🚀 [${VERSION}] Edge Function initialized at ${new Date().toISOString()}`);

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

const handler = async (req: Request): Promise<Response> => {
  const requestId = `req_${Date.now()}`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📨 [${requestId}] ${req.method} - Version: ${VERSION}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse body
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch {
      return friendlyError('Não entendi sua mensagem. 💕', { error: 'parse' });
    }

    const { entityId, message, conversationHistory, isCreator } = requestBody;
    console.log(`📋 [${requestId}] entityId: ${entityId}, isCreator: ${isCreator}, msg: ${message?.length || 0} chars`);

    if (!entityId || !message) {
      return friendlyError('Por favor, digite uma mensagem! 💕', { missing: true });
    }

    // Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return friendlyError('Configuração incompleta. 💕', { env: false });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch chat panel
    const columnName = isCreator === true ? 'creator_id' : 'model_id';
    console.log(`🔍 [${requestId}] Query: ${columnName} = ${entityId}`);
    
    const { data: chatPanel, error: queryError } = await supabase
      .from('model_chat_panels')
      .select('*')
      .eq(columnName, entityId)
      .maybeSingle();

    if (queryError) {
      console.error(`❌ [${requestId}] Query error:`, queryError);
      return friendlyError('Erro ao buscar configuração. 💕', { query: queryError.message });
    }

    if (!chatPanel) {
      console.log(`⚠️ [${requestId}] NOT FOUND`);
      return friendlyError('Chat não configurado. Configure no painel admin! 💕', { notFound: true });
    }

    console.log(`✅ [${requestId}] Panel found: active=${chatPanel.is_active}, provider=${chatPanel.ai_provider}, key=${chatPanel.api_key_encrypted?.length || 0} chars`);

    if (!chatPanel.is_active) {
      return friendlyError('Chat desativado. 💕', { inactive: true });
    }

    const provider = (chatPanel.ai_provider || '').toLowerCase().trim();
    const apiKey = (chatPanel.api_key_encrypted || '').trim();
    
    if (!provider || (provider !== 'gemini' && provider !== 'openai')) {
      return friendlyError('Configure o provedor (gemini/openai) no admin! 💕', { provider });
    }

    if (!apiKey || apiKey.length < 10) {
      return friendlyError('Configure a API Key no admin! 💕', { keyLen: apiKey.length });
    }

    // Call AI
    const systemPrompt = chatPanel.prompt || 'Você é um assistente amigável.';
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    
    console.log(`🤖 [${requestId}] Calling ${provider}...`);

    let aiResponse: string;
    
    try {
      if (provider === 'gemini') {
        aiResponse = await callGemini(apiKey, message, systemPrompt, history);
      } else {
        aiResponse = await callOpenAI(apiKey, message, systemPrompt, history);
      }
      console.log(`✅ [${requestId}] AI OK: ${aiResponse.length} chars`);
    } catch (aiErr: any) {
      console.error(`❌ [${requestId}] AI error:`, aiErr?.message);
      return friendlyError('Erro técnico. Tente novamente! 💕', { ai: aiErr?.message });
    }

    return createResponse({ response: aiResponse });

  } catch (err: any) {
    console.error(`🚨 [${requestId}] Unexpected:`, err?.message);
    return friendlyError('Algo deu errado. Tente novamente! 💕', { unexpected: err?.message });
  }
};

async function callGemini(apiKey: string, msg: string, prompt: string, history: any[]): Promise<string> {
  const contents = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: String(m.content || '') }]
  }));
  contents.push({ role: 'user', parts: [{ text: msg }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: prompt }] },
        generationConfig: { temperature: 0.9, maxOutputTokens: 1024 }
      })
    }
  );

  if (!res.ok) throw new Error(`Gemini: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
}

async function callOpenAI(apiKey: string, msg: string, prompt: string, history: any[]): Promise<string> {
  const messages = [{ role: 'system', content: prompt }];
  history.forEach(m => messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '') }));
  messages.push({ role: 'user', content: msg });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.9, max_tokens: 1024 })
  });

  if (!res.ok) {
    const txt = await res.text();
    try {
      const json = JSON.parse(txt);
      throw new Error(json.error?.message || `OpenAI: ${res.status}`);
    } catch { throw new Error(`OpenAI: ${res.status}`); }
  }
  
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'Sem resposta.';
}

Deno.serve(handler);
