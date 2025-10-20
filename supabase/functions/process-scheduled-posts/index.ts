import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Processando posts agendados...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar posts agendados que já deveriam ter sido publicados
    // Usar horário UTC para comparação direta
    const now = new Date();
    console.log(`⏰ Hora atual UTC: ${now.toISOString()}`);
    
    // Converter para horário do Brasil para debug
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    console.log(`⏰ Hora atual do Brasil: ${brazilTime.toISOString()}`);

    const { data: postsToPublish, error: fetchError } = await supabase
      .from('posts_agendados')
      .select(`
        *,
        models:modelo_id (
          id,
          username,
          name,
          avatar_url
        )
      `)
      .eq('status', 'agendado')
      .lte('data_agendamento', now.toISOString())
      .order('data_agendamento', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar posts:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontrados ${postsToPublish?.length || 0} posts para publicar`);

    const publishedPosts = [];
    
    for (const post of postsToPublish || []) {
      try {
        console.log(`📤 Publicando post: ${post.titulo} de @${post.modelo_username}`);
        
        // Se for vídeo, criar na tabela videos
        if (post.tipo_conteudo === 'video') {
          console.log(`🎥 Criando vídeo na tabela videos...`);
          
          const { error: videoError } = await supabase
            .from('videos')
            .insert({
              user_id: post.modelo_id,
              title: post.titulo || 'Novo vídeo',
              description: post.descricao || '',
              video_url: post.conteudo_url,
              thumbnail_url: post.imagens?.[0] || 'https://via.placeholder.com/300x400',
              music_name: 'Som Original',
              is_active: true,
              visibility: 'public',
              likes_count: 0,
              comments_count: 0,
              shares_count: 0,
              views_count: 0
            });

          if (videoError) {
            console.error('❌ Erro ao criar vídeo:', videoError);
            throw videoError;
          }
          
          console.log('✅ Vídeo criado na tabela videos');
        }
        
        // Atualizar status para publicado
        const { error: updateError } = await supabase
          .from('posts_agendados')
          .update({ 
            status: 'publicado',
            data_publicacao: new Date().toISOString()
          })
          .eq('id', post.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar post ${post.id}:`, updateError);
          continue;
        }

        // Registrar execução
        const { error: execError } = await supabase
          .from('agendamento_execucoes')
          .insert({
            post_agendado_id: post.id,
            status_execucao: 'executado',
            data_execucao: new Date().toISOString()
          });

        if (execError) {
          console.warn(`⚠️ Erro ao registrar execução:`, execError);
        }

        // Se for para enviar para tela principal, adicionar à tabela posts_principais
        if (post.enviar_tela_principal) {
          console.log(`🏠 Enviando para tela principal: ${post.titulo}`);
          
          const { error: mainPostError } = await supabase
            .from('posts_principais')
            .insert({
              modelo_id: post.modelo_id,
              modelo_username: post.modelo_username,
              titulo: post.titulo,
              descricao: post.descricao,
              conteudo_url: post.conteudo_url,
              tipo_conteudo: post.tipo_conteudo,
              post_agendado_id: post.id,
              is_active: true
            });

          if (mainPostError) {
            console.error(`❌ Erro ao adicionar à tela principal:`, mainPostError);
          }
        }

        publishedPosts.push({
          id: post.id,
          titulo: post.titulo,
          modelo_username: post.modelo_username,
          enviar_tela_principal: post.enviar_tela_principal
        });

        console.log(`✅ Post publicado com sucesso: ${post.titulo}`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar post ${post.id}:`, error);
        
        // Registrar erro na execução
        await supabase
          .from('agendamento_execucoes')
          .insert({
            post_agendado_id: post.id,
            status_execucao: 'erro',
            erro_mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
            data_execucao: new Date().toISOString()
          });
      }
    }

    const result = {
      success: true,
      message: `Processamento concluído. ${publishedPosts.length} posts publicados.`,
      publishedPosts,
      processedAt: new Date().toISOString(),
      brazilTime: brazilTime.toISOString()
    };

    console.log('📊 Resultado:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false,
        processedAt: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});