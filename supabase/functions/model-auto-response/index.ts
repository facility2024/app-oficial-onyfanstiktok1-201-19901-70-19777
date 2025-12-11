import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Edge Function v1.0 - Model Auto Response (Deployed)
// Esta função substitui model-chat pois já está deployada no Supabase
console.log('🚀 MODEL-AUTO-RESPONSE v1.0 loaded at', new Date().toISOString());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  console.log('📨 MODEL-AUTO-RESPONSE Request:', req.method, url.pathname);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Parseando body da requisição...');
    const body = await req.json();
    const { entityId, message, conversationHistory = [], isCreator = false } = body;

    console.log('🤖 AUTO-RESPONSE: Recebida requisição:', { 
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente Supabase não configuradas');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Buscando configuração do chat panel para:', isCreator ? 'creator_id' : 'model_id', entityId);

    // Buscar configuração do chat panel - suporta model_id OU creator_id
    let chatPanel = null;
    let panelError = null;

    try {
      if (isCreator) {
        const result = await supabase
          .from('model_chat_panels')
          .select('*')
          .eq('creator_id', entityId)
          .maybeSingle();
        chatPanel = result.data;
        panelError = result.error;
      } else {
        const result = await supabase
          .from('model_chat_panels')
          .select('*')
          .eq('model_id', entityId)
          .maybeSingle();
        chatPanel = result.data;
        panelError = result.error;
      }
    } catch (queryError: any) {
      console.error('❌ Erro ao consultar chat panel:', queryError);
      return new Response(
        JSON.stringify({ 
          response: 'Desculpe, não consegui acessar minha configuração. Tente novamente! 💕',
          error: queryError?.message 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (panelError) {
      console.error('❌ Erro ao buscar chat panel:', panelError);
      return new Response(
        JSON.stringify({ 
          response: 'Desculpe, houve um problema ao carregar minha configuração. 💕',
          error: panelError.message 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chatPanel) {
      console.log('⚠️ Chat panel não encontrado para:', entityId, 'isCreator:', isCreator);
      return new Response(
        JSON.stringify({ 
          response: 'Meu chat ainda não foi configurado. Por favor, configure-o no painel de administração! 💕',
          notConfigured: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    console.log('🔑 API Key presente:', !!chatPanel.api_key_encrypted, 'Tamanho:', chatPanel.api_key_encrypted?.length || 0);

    let aiResponse = '';
    const systemPrompt = chatPanel.prompt || 'Você é um assistente prestativo.';

    // Chamar a IA apropriada com try-catch específico
    try {
      if (chatPanel.ai_provider === 'gemini') {
        console.log('🔧 Iniciando chamada Gemini...');
        aiResponse = await callGemini(
          chatPanel.api_key_encrypted,
          message,
          systemPrompt,
          conversationHistory
        );
      } else if (chatPanel.ai_provider === 'openai') {
        console.log('🔧 Iniciando chamada OpenAI...');
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
    } catch (aiError: any) {
      console.error('❌ Erro específico da IA:', aiError?.message || aiError);
      console.error('❌ Stack:', aiError?.stack?.substring(0, 300));
      
      // Retornar mensagem amigável em vez de erro 500
      return new Response(
        JSON.stringify({ 
          response: 'Desculpe, estou com dificuldades técnicas agora. Tente novamente em alguns instantes! 💕',
          aiError: true,
          errorDetails: aiError?.message || 'Erro desconhecido na API de IA'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
