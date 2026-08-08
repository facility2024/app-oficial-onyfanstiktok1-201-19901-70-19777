import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Processando posts agendados...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if a specific post_id was sent (for "Enviar agora")
    let specificPostId: string | null = null;
    try {
      const body = await req.json();
      specificPostId = body?.post_id || null;
      console.log('📦 Body recebido:', JSON.stringify(body));
    } catch {
      // No body or invalid JSON - process all pending
    }

    const now = new Date();
    console.log(`⏰ Hora atual UTC: ${now.toISOString()}`);

    let query = supabase
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
      .eq('status', 'agendado');

    if (specificPostId) {
      // Force-publish a specific post regardless of schedule time
      console.log(`🎯 Publicação forçada do post: ${specificPostId}`);
      query = query.eq('id', specificPostId);
    } else {
      // Only publish posts whose schedule time has passed
      query = query.lte('data_agendamento', now.toISOString());
    }

    const { data: postsToPublish, error: fetchError } = await query.order('data_agendamento', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar posts:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontrados ${postsToPublish?.length || 0} posts para publicar`);

    const publishedPosts = [];
    
    for (const post of postsToPublish || []) {
      try {
        console.log(`📤 Publicando post: ${post.titulo} de @${post.modelo_username}`);
        
        if (post.tipo_conteudo === 'video') {
          // Try to activate existing inactive video for this model + URL
          const { data: existingVideo } = await supabase
            .from('videos')
            .select('id')
            .eq('model_id', post.modelo_id)
            .eq('video_url', post.conteudo_url)
            .eq('is_active', false)
            .limit(1)
            .maybeSingle();

          if (existingVideo) {
            await supabase.from('videos').update({ is_active: true, visibility: 'public' }).eq('id', existingVideo.id);
          } else {
            await supabase.from('videos').insert({
              model_id: post.modelo_id,
              title: post.titulo || 'Novo vídeo',
              description: post.descricao || '',
              video_url: post.conteudo_url,
              thumbnail_url: post.imagens?.[0] || post.conteudo_url,
              is_active: true,
              visibility: 'public',
              duration: '0:00',
              likes_count: 0, comments_count: 0, shares_count: 0, views_count: 0
            });
          }
        } else if (post.tipo_conteudo === 'carrossel' || post.tipo_conteudo === 'image') {
          // Carrossel de imagens NÃO é vídeo: fica salvo em posts_agendados/posts_principais
          // para o app renderizar como carrossel com áudio, sem inserir na tabela videos.
          if (!post.imagens || post.imagens.length === 0) {
            throw new Error('Carrossel sem imagens');
          }
        }
        
        // Update status to published
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

        // Record execution
        await supabase
          .from('agendamento_execucoes')
          .insert({
            post_agendado_id: post.id,
            status_execucao: 'executado',
            data_execucao: new Date().toISOString()
          });

        // Send to main screen if configured
        if (post.enviar_tela_principal) {
          console.log(`🏠 Enviando para tela principal: ${post.titulo}`);
          const isCarousel = post.tipo_conteudo === 'carrossel' || post.tipo_conteudo === 'image';
          const mainContentUrl = isCarousel && post.imagens?.[0] ? post.imagens[0] : post.conteudo_url;
          await supabase
            .from('posts_principais')
            .insert({
              modelo_id: post.modelo_id,
              modelo_username: post.modelo_username,
              titulo: post.titulo,
              descricao: post.descricao,
              conteudo_url: mainContentUrl,
              tipo_conteudo: post.tipo_conteudo,
              imagens: isCarousel ? (post.imagens || []) : null,
              audio_url: isCarousel ? (post.audio_url || null) : null,
              botoes: isCarousel ? (post.botoes || []) : [],
              post_agendado_id: post.id,
              is_active: true
            });
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
        await supabase
          .from('posts_agendados')
          .update({ status: 'erro' })
          .eq('id', post.id);

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
      processedAt: new Date().toISOString()
    };

    console.log('📊 Resultado:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
