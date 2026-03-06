import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get businesses with 0 or null coordinates
    const { data: businesses, error } = await supabase
      .from('local_businesses')
      .select('id, name, address')
      .eq('is_active', true)
      .or('latitude.eq.0,latitude.is.null');

    if (error) throw error;
    if (!businesses || businesses.length === 0) {
      return new Response(JSON.stringify({ message: 'No businesses need geocoding', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updated = 0;
    const results: any[] = [];

    for (const biz of businesses) {
      if (!biz.address) continue;

      try {
        const encoded = encodeURIComponent(biz.address);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&language=pt-BR&key=${GOOGLE_API_KEY}`
        );
        const data = await res.json();

        if (data.status === 'OK' && data.results.length > 0) {
          const loc = data.results[0].geometry.location;

          const { error: updateError } = await supabase
            .from('local_businesses')
            .update({ latitude: loc.lat, longitude: loc.lng })
            .eq('id', biz.id);

          if (!updateError) {
            updated++;
            results.push({ id: biz.id, name: biz.name, lat: loc.lat, lng: loc.lng, status: 'ok' });
          } else {
            results.push({ id: biz.id, name: biz.name, status: 'update_error', error: updateError.message });
          }
        } else {
          results.push({ id: biz.id, name: biz.name, status: 'geocode_failed', googleStatus: data.status });
        }

        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        results.push({ id: biz.id, name: biz.name, status: 'error', error: String(err) });
      }
    }

    return new Response(JSON.stringify({ updated, total: businesses.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
