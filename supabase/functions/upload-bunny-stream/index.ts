// Simplified version for deployment testing - v3
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  console.log('[Bunny] Request:', req.method, url.pathname);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET - Simple health check (can test in browser)
  if (req.method === 'GET') {
    console.log('[Bunny] Health check request');
    return new Response(
      JSON.stringify({ 
        status: 'ok',
        message: 'Edge Function is deployed and running!',
        timestamp: new Date().toISOString(),
        version: 'v3-diagnostic'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // POST - Video creation
  if (req.method === 'POST') {
    try {
      console.log('[Bunny] POST request received');
      
      // Check environment
      const LIBRARY_ID = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');
      const API_KEY = Deno.env.get('BUNNY_STREAM_API_KEY');
      const CDN_URL = Deno.env.get('BUNNY_STREAM_CDN_URL');

      console.log('[Bunny] Env check:', { 
        hasLibrary: !!LIBRARY_ID, 
        hasApiKey: !!API_KEY, 
        hasCdn: !!CDN_URL 
      });

      if (!LIBRARY_ID || !API_KEY || !CDN_URL) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing environment variables',
            hasLibrary: !!LIBRARY_ID,
            hasApiKey: !!API_KEY,
            hasCdn: !!CDN_URL
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse body
      const body = await req.json();
      const title = body.title?.trim();
      
      if (!title) {
        return new Response(
          JSON.stringify({ error: 'Title is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Bunny] Creating video:', title);

      // Create video in Bunny
      const bunnyResponse = await fetch(
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

      console.log('[Bunny] Bunny API status:', bunnyResponse.status);

      if (!bunnyResponse.ok) {
        const errorText = await bunnyResponse.text();
        console.error('[Bunny] Bunny API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Bunny API error', status: bunnyResponse.status, details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const videoData = await bunnyResponse.json();
      const videoId = videoData.guid;
      console.log('[Bunny] Video created:', videoId);

      // Generate auth signature
      const expirationTime = Math.floor(Date.now() / 1000) + 21600;
      const encoder = new TextEncoder();
      const data = encoder.encode(LIBRARY_ID + API_KEY + expirationTime + videoId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const authorizationSignature = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return new Response(
        JSON.stringify({
          success: true,
          videoId,
          libraryId: LIBRARY_ID,
          authorizationSignature,
          expirationTime,
          videoUrl: `https://${CDN_URL}/${videoId}/play_720p.mp4`,
          thumbnailUrl: `https://${CDN_URL}/${videoId}/thumbnail.jpg`,
          hlsUrl: `https://${CDN_URL}/${videoId}/playlist.m3u8`,
          tusEndpoint: 'https://video.bunnycdn.com/tusupload',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      console.error('[Bunny] Error:', error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
