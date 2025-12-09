// Bunny Upload Edge Function - v3 - Using Deno.serve native (no external imports)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('[bunny-upload] GET health check requested');
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'bunny-upload Edge Function is deployed and running!',
        version: 'v3-native',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // POST - Create video on Bunny
  if (req.method === 'POST') {
    try {
      console.log('[bunny-upload] POST request received');
      
      const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY');
      const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID');
      const BUNNY_CDN_URL = Deno.env.get('BUNNY_CDN_URL');

      console.log('[bunny-upload] Environment check:', {
        hasApiKey: !!BUNNY_API_KEY,
        hasLibraryId: !!BUNNY_LIBRARY_ID,
        hasCdnUrl: !!BUNNY_CDN_URL
      });

      if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
        console.error('[bunny-upload] Missing required environment variables');
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error', 
            details: 'Missing Bunny.net credentials' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const body = await req.json();
      const { title } = body;

      if (!title) {
        return new Response(
          JSON.stringify({ error: 'Title is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('[bunny-upload] Creating video with title:', title);

      // Create video on Bunny Stream
      const createResponse = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
        {
          method: 'POST',
          headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        }
      );

      console.log('[bunny-upload] Bunny API response status:', createResponse.status);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[bunny-upload] Bunny API error:', errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create video on Bunny', 
            details: errorText 
          }),
          { 
            status: createResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const videoData = await createResponse.json();
      console.log('[bunny-upload] Video created:', videoData.guid);

      // Generate TUS upload signature
      const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const encoder = new TextEncoder();
      const data = encoder.encode(BUNNY_LIBRARY_ID + BUNNY_API_KEY + expirationTime + videoData.guid);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const response = {
        videoId: videoData.guid,
        libraryId: BUNNY_LIBRARY_ID,
        tusEndpoint: `https://video.bunnycdn.com/tusupload`,
        authorizationSignature: signature,
        authorizationExpire: expirationTime,
        videoUrl: `https://${BUNNY_CDN_URL || 'vz-f7f5f7c4-c9e.b-cdn.net'}/${videoData.guid}/play_720p.mp4`,
        thumbnailUrl: `https://${BUNNY_CDN_URL || 'vz-f7f5f7c4-c9e.b-cdn.net'}/${videoData.guid}/thumbnail.jpg`,
      };

      console.log('[bunny-upload] Success, returning response');

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error('[bunny-upload] Error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error', 
          details: error instanceof Error ? error.message : String(error)
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
