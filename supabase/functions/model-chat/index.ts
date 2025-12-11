import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Edge Function v3.1 - Model Chat - CORS FIX
console.log('🚀 MODEL-CHAT Edge Function v3.1 loaded - ' + new Date().toISOString());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('📨 MODEL-CHAT v3.1 - Requisição:', req.method, req.url);
  
  // CORS preflight - MUST return 'ok' body per Supabase docs
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo OPTIONS/CORS com body "ok"');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Parseando body da requisição...');
    const body = await req.json();
    const { entityId, message, conversationHistory = [], isCreator = false } = body;

    console.log('🤖 MODEL-CHAT v2.2: Recebida requisição:', { 
      entityId, 
      isCreator, 
      messageLength: message?.length,
      historyLength: conversationHistory?.length 
    });

    if (!entityId || !message) {
      console.error('❌ Campos obrigatórios ausentes:', { entityId: !!entityId, message: !!message });
      return new Response(
        JSON.stringify({ error: 'entityId e message são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Buscando configuração do chat panel...');

    // Buscar configuração do chat panel - suporta model_id OU creator_id
    let query = supabase
      .from('model_chat_panels')
      .select('*');

    if (isCreator) {
      query = query.eq('creator_id', entityId);
    } else {
      query = query.eq('model_id', entityId);
    }

    const { data: chatPanel, error: panelError } = await query.single();

    if (panelError) {
      console.error('❌ Erro ao buscar chat panel:', panelError);
      return new Response(
        JSON.stringify({ error: 'Chat panel não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Chat panel encontrado:', {
      is_active: chatPanel.is_active,
      is_online: chatPanel.is_online,
      ai_provider: chatPanel.ai_provider,
      has_api_key: !!chatPanel.api_key_encrypted,
      isCreator
    });

    if (!chatPanel.is_active) {
      return new Response(
        JSON.stringify({ error: 'Chat desativado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chatPanel.ai_provider || !chatPanel.api_key_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Chat não configurado corretamente. Configure o provider e API key no painel admin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 Provider:', chatPanel.ai_provider);

    let aiResponse = '';
    const systemPrompt = chatPanel.prompt || 'Você é um assistente prestativo.';

    // Chamar a IA apropriada
    if (chatPanel.ai_provider === 'gemini') {
      aiResponse = await callGemini(
        chatPanel.api_key_encrypted,
        message,
        systemPrompt,
        conversationHistory
      );
    } else if (chatPanel.ai_provider === 'openai') {
      aiResponse = await callOpenAI(
        chatPanel.api_key_encrypted,
        message,
        systemPrompt,
        conversationHistory
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Provider de IA não suportado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Resposta da IA gerada com sucesso');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral na função:', error);
    console.error('❌ Stack trace:', error?.stack);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro interno do servidor',
        details: error?.stack?.substring(0, 200) || 'No stack trace'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callGemini(apiKey: string, userMessage: string, systemPrompt: string, history: any[]): Promise<string> {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro Gemini:', errorText);
    throw new Error(`Erro na API Gemini: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui gerar uma resposta.';
}

async function callOpenAI(apiKey: string, userMessage: string, systemPrompt: string, history: any[]): Promise<string> {
  console.log('🔑 OpenAI: Iniciando chamada...');
  console.log('🔑 OpenAI: API Key começa com:', apiKey.substring(0, 10) + '...');
  
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

  console.log('🔑 OpenAI: Enviando', messages.length, 'mensagens');

  try {
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

    console.log('🔑 OpenAI: Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI - Status:', response.status);
      console.error('❌ Erro OpenAI - Body:', errorText);
      
      // Parse para dar mensagem mais clara
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error?.message || errorText;
        throw new Error(`OpenAI: ${errorMessage}`);
      } catch {
        throw new Error(`Erro na API OpenAI: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('✅ OpenAI: Resposta recebida com sucesso');
    return data.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
  } catch (error: any) {
    console.error('❌ OpenAI Exception:', error);
    throw error;
  }
}
