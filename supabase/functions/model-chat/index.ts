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
    const { modelId, message, conversationHistory = [] } = await req.json();

    console.log('🤖 MODEL-CHAT: Recebida requisição para modelo:', modelId);

    if (!modelId || !message) {
      return new Response(
        JSON.stringify({ error: 'modelId e message são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Buscando configuração do chat panel para modelo:', modelId);

    // Buscar configuração do chat panel
    const { data: chatPanel, error: panelError } = await supabase
      .from('model_chat_panels')
      .select('*')
      .eq('model_id', modelId)
      .single();

    if (panelError) {
      console.error('❌ Erro ao buscar chat panel:', panelError);
      return new Response(
        JSON.stringify({ error: 'Chat panel não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Chat panel encontrado:', {
      model_id: chatPanel.model_id,
      is_active: chatPanel.is_active,
      is_online: chatPanel.is_online,
      ai_provider: chatPanel.ai_provider,
      has_api_key: !!chatPanel.api_key_encrypted,
      prompt_preview: chatPanel.prompt?.substring(0, 50)
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
    console.log('📝 Prompt do sistema:', chatPanel.prompt || 'Você é um assistente prestativo.');

    let aiResponse = '';

    // Chamar a IA apropriada
    if (chatPanel.ai_provider === 'gemini') {
      aiResponse = await callGemini(
        chatPanel.api_key_encrypted,
        message,
        chatPanel.prompt || 'Você é um assistente prestativo.',
        conversationHistory
      );
    } else if (chatPanel.ai_provider === 'openai') {
      aiResponse = await callOpenAI(
        chatPanel.api_key_encrypted,
        message,
        chatPanel.prompt || 'You are a helpful assistant.',
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

  } catch (error) {
    console.error('❌ Erro na edge function model-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar mensagem';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callGemini(apiKey: string, userMessage: string, systemPrompt: string, history: any[]) {
  console.log('🤖 GEMINI: Iniciando chamada...');
  console.log('📝 GEMINI: System Prompt:', systemPrompt);
  console.log('💬 GEMINI: User Message:', userMessage);
  console.log('📜 GEMINI: History length:', history.length);

  const contents = [];
  
  // Adicionar histórico de conversa
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  // Adicionar mensagem atual do usuário
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const requestBody = {
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
  };

  console.log('📤 GEMINI: Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ GEMINI: API error:', errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ GEMINI: Response received');
  console.log('📥 GEMINI: Response data:', JSON.stringify(data, null, 2));

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Nenhuma resposta gerada pela Gemini');
  }

  const generatedText = data.candidates[0].content.parts[0].text;
  console.log('✅ GEMINI: Generated text:', generatedText);

  return generatedText;
}

async function callOpenAI(apiKey: string, userMessage: string, systemPrompt: string, history: any[]) {
  console.log('Chamando OpenAI API...');

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Adicionar histórico de conversa
  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  // Adicionar mensagem atual
  messages.push({
    role: 'user',
    content: userMessage
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro OpenAI API:', errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Resposta OpenAI recebida');

  if (!data.choices || data.choices.length === 0) {
    throw new Error('Nenhuma resposta gerada pela OpenAI');
  }

  return data.choices[0].message.content;
}
