import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUNNY_LIBRARY_ID = "558340";
const BUNNY_API_KEY = "3be9e550-5641-40ea-ba4696767be3-755b-449f";
const BUNNY_CDN_HOSTNAME = "vz-2342b018-2d3.b-cdn.net";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📦 Recebendo upload de vídeo...");

    const formData = await req.formData();
    const file = formData.get('video') as File;
    const title = formData.get('title') as string || 'video-' + Date.now();

    if (!file) {
      throw new Error('Nenhum arquivo de vídeo enviado');
    }

    console.log(`📹 Arquivo: ${file.name}, Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Step 1: Create video object in Bunny Stream
    console.log("🔧 Criando objeto de vídeo no Bunny Stream...");
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'AccessKey': BUNNY_API_KEY,
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("❌ Erro ao criar vídeo:", errorText);
      throw new Error(`Erro ao criar vídeo: ${createResponse.status} - ${errorText}`);
    }

    const videoData = await createResponse.json();
    const videoGuid = videoData.guid;
    console.log(`✅ Vídeo criado com GUID: ${videoGuid}`);

    // Step 2: Upload the video file
    console.log("📤 Fazendo upload do arquivo...");
    const fileBuffer = await file.arrayBuffer();
    
    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoGuid}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'AccessKey': BUNNY_API_KEY,
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("❌ Erro no upload:", errorText);
      throw new Error(`Erro no upload: ${uploadResponse.status} - ${errorText}`);
    }

    console.log("✅ Upload concluído!");

    // Construct CDN URLs
    const videoUrl = `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/play_720p.mp4`;
    const thumbnailUrl = `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/thumbnail.jpg`;

    console.log(`🎬 URL do vídeo: ${videoUrl}`);
    console.log(`🖼️ URL da thumbnail: ${thumbnailUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        videoGuid,
        videoUrl,
        thumbnailUrl,
        message: 'Vídeo enviado com sucesso!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("❌ Erro no upload:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
