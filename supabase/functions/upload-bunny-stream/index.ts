// Re-deploy trigger: 2025-12-09T11:00:00Z - Force deployment
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
  console.log('[Bunny Upload] ===== REQUEST RECEIVED =====');
  console.log('[Bunny Upload] Method:', req.method);
  console.log('[Bunny Upload] URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('[Bunny Upload] Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log environment variables (without exposing full values)
    const LIBRARY_ID = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');
    const API_KEY = Deno.env.get('BUNNY_STREAM_API_KEY');
    const CDN_URL = Deno.env.get('BUNNY_STREAM_CDN_URL');

    console.log('[Bunny Upload] Environment check:');
    console.log('[Bunny Upload] - LIBRARY_ID exists:', !!LIBRARY_ID);
    console.log('[Bunny Upload] - API_KEY exists:', !!API_KEY);
    console.log('[Bunny Upload] - CDN_URL exists:', !!CDN_URL);

    if (!LIBRARY_ID || !API_KEY || !CDN_URL) {
      console.error('[Bunny Upload] ERROR: Missing environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do servidor incompleta',
          details: {
            hasLibraryId: !!LIBRARY_ID,
            hasApiKey: !!API_KEY,
            hasCdnUrl: !!CDN_URL
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('[Bunny Upload] Request body parsed:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[Bunny Upload] ERROR: Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title }: CreateVideoRequest = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      console.error('[Bunny Upload] ERROR: Invalid or missing title');
      return new Response(
        JSON.stringify({ error: 'Título é obrigatório e deve ser uma string válida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Bunny Upload] Creating video object for: "${title.trim()}"`);

    // Create video object in Bunny Stream
    const bunnyUrl = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`;
    console.log('[Bunny Upload] Calling Bunny API:', bunnyUrl);
    
    const createResponse = await fetch(bunnyUrl, {
      method: 'POST',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title.trim() }),
    });

    console.log('[Bunny Upload] Bunny API response status:', createResponse.status);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Bunny Upload] ERROR: Bunny API failed:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar objeto de vídeo no Bunny Stream',
          bunnyStatus: createResponse.status,
          bunnyError: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoData: BunnyVideoResponse = await createResponse.json();
    const videoId = videoData.guid;
    console.log(`[Bunny Upload] Video object created successfully with ID: ${videoId}`);

    // Generate expiration time (6 hours from now)
    const expirationTime = Math.floor(Date.now() / 1000) + 21600;
    console.log('[Bunny Upload] Expiration time:', expirationTime);

    // Create authorization signature for TUS upload
    const encoder = new TextEncoder();
    const data = encoder.encode(LIBRARY_ID + API_KEY + expirationTime + videoId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const authorizationSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('[Bunny Upload] Authorization signature generated');

    // Generate URLs
    const videoUrl = `https://${CDN_URL}/${videoId}/play_720p.mp4`;
    const thumbnailUrl = `https://${CDN_URL}/${videoId}/thumbnail.jpg`;
    const hlsUrl = `https://${CDN_URL}/${videoId}/playlist.m3u8`;

    console.log('[Bunny Upload] URLs generated:');
    console.log('[Bunny Upload] - Video URL:', videoUrl);
    console.log('[Bunny Upload] - Thumbnail URL:', thumbnailUrl);

    const responseData = {
      success: true,
      videoId,
      libraryId: LIBRARY_ID,
      authorizationSignature,
      expirationTime,
      videoUrl,
      thumbnailUrl,
      hlsUrl,
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
    };

    console.log('[Bunny Upload] ===== SUCCESS - Returning response =====');

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[Bunny Upload] ===== UNEXPECTED ERROR =====');
    console.error('[Bunny Upload] Error message:', error.message);
    console.error('[Bunny Upload] Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
