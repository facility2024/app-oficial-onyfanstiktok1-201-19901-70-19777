import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityId, message, conversationHistory = [], isCreator = false } = await req.json();

    console.log('🤖 MODEL-CHAT: Recebida requisição:', { entityId, isCreator });

    if (!entityId || !message) {
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
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro interno do servidor' }),
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro OpenAI:', errorText);
    throw new Error(`Erro na API OpenAI: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
}
