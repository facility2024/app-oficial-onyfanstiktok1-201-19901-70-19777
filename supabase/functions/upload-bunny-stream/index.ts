import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  title: string;
  fileBase64: string;
  fileName: string;
}

interface BunnyVideoResponse {
  guid: string;
  videoLibraryId: number;
  title: string;
  length: number;
  status: number;
  thumbnailFileName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIBRARY_ID = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');
    const API_KEY = Deno.env.get('BUNNY_STREAM_API_KEY');
    const CDN_URL = Deno.env.get('BUNNY_STREAM_CDN_URL');

    if (!LIBRARY_ID || !API_KEY || !CDN_URL) {
      console.error('Missing Bunny Stream environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, fileBase64, fileName }: UploadRequest = await req.json();

    if (!title || !fileBase64 || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Título, arquivo e nome do arquivo são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Bunny Upload] Starting upload for: ${title}`);
    console.log(`[Bunny Upload] File name: ${fileName}`);

    // Step 1: Create video object in Bunny Stream
    console.log('[Bunny Upload] Step 1: Creating video object...');
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Bunny Upload] Failed to create video object:', errorText);
      return new Response(
        JSON.stringify({ error: 'Falha ao criar objeto de vídeo no Bunny Stream' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoData: BunnyVideoResponse = await createResponse.json();
    const videoId = videoData.guid;
    console.log(`[Bunny Upload] Video object created with ID: ${videoId}`);

    // Step 2: Upload the video binary data
    console.log('[Bunny Upload] Step 2: Uploading video binary...');
    
    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    console.log(`[Bunny Upload] Binary size: ${binaryData.length} bytes`);

    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: binaryData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Bunny Upload] Failed to upload video:', errorText);
      return new Response(
        JSON.stringify({ error: 'Falha ao fazer upload do vídeo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Bunny Upload] Video uploaded successfully!');

    // Generate URLs
    const videoUrl = `https://${CDN_URL}/${videoId}/play_720p.mp4`;
    const thumbnailUrl = `https://${CDN_URL}/${videoId}/thumbnail.jpg`;
    const embedUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}`;
    const hlsUrl = `https://${CDN_URL}/${videoId}/playlist.m3u8`;

    console.log(`[Bunny Upload] Video URL: ${videoUrl}`);
    console.log(`[Bunny Upload] Thumbnail URL: ${thumbnailUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        videoUrl,
        thumbnailUrl,
        embedUrl,
        hlsUrl,
        message: 'Vídeo enviado com sucesso! O processamento pode levar alguns minutos.',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[Bunny Upload] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
