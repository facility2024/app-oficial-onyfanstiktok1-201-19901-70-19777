import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateVideoRequest {
  title: string;
}

interface BunnyVideoResponse {
  guid: string;
  videoLibraryId: number;
  title: string;
}

serve(async (req: Request): Promise<Response> => {
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

    const { title }: CreateVideoRequest = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Título é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Bunny Upload] Creating video object for: ${title}`);

    // Create video object in Bunny Stream
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

    // Generate expiration time (6 hours from now)
    const expirationTime = Math.floor(Date.now() / 1000) + 21600;

    // Create authorization signature for TUS upload
    const encoder = new TextEncoder();
    const data = encoder.encode(LIBRARY_ID + API_KEY + expirationTime + videoId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const authorizationSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Generate URLs
    const videoUrl = `https://${CDN_URL}/${videoId}/play_720p.mp4`;
    const thumbnailUrl = `https://${CDN_URL}/${videoId}/thumbnail.jpg`;
    const hlsUrl = `https://${CDN_URL}/${videoId}/playlist.m3u8`;

    console.log(`[Bunny Upload] TUS upload ready for video: ${videoId}`);

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        libraryId: LIBRARY_ID,
        authorizationSignature,
        expirationTime,
        videoUrl,
        thumbnailUrl,
        hlsUrl,
        tusEndpoint: `https://video.bunnycdn.com/tusupload`,
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
