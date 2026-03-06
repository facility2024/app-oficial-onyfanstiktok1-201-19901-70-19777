import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GeoResult {
  region: string;
  city: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  method: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clientLat = body.lat;
    const clientLng = body.lng;

    // Get client IP from headers
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIP = forwarded ? forwarded.split(',')[0].trim() : null;

    let result: GeoResult | null = null;

    // Strategy 1: ip-api.com
    if (!result && clientIP) {
      try {
        const res = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,regionName,city,lat,lon&lang=pt-BR`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            result = {
              region: data.regionName || 'São Paulo',
              city: data.city || 'Desconhecida',
              neighborhood: '',
              address: '',
              lat: data.lat || -23.5505,
              lng: data.lon || -46.6333,
              method: 'ip-api',
            };
          }
        }
      } catch { /* continue */ }
    }

    // Strategy 2: ipinfo.io
    if (!result && clientIP) {
      try {
        const res = await fetch(`https://ipinfo.io/${clientIP}/json`);
        if (res.ok) {
          const data = await res.json();
          const [lat, lng] = (data.loc || '-23.5505,-46.6333').split(',').map(Number);
          result = {
            region: data.region || 'São Paulo',
            city: data.city || 'Desconhecida',
            neighborhood: '',
            address: '',
            lat,
            lng,
            method: 'ipinfo',
          };
        }
      } catch { /* continue */ }
    }

    // Strategy 3: Google Maps Reverse Geocode (if coords provided)
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const lat = clientLat || result?.lat;
    const lng = clientLng || result?.lng;

    if (GOOGLE_API_KEY && lat && lng) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${GOOGLE_API_KEY}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const components = data.results[0].address_components || [];
            let state = result?.region || '';
            let city = result?.city || '';
            let neighborhood = '';
            let address = data.results[0].formatted_address || '';

            for (const comp of components) {
              if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
              if (comp.types.includes('administrative_area_level_2')) city = comp.long_name;
              if (comp.types.includes('sublocality_level_1') || comp.types.includes('neighborhood')) {
                neighborhood = comp.long_name;
              }
            }

            result = {
              region: state || result?.region || 'São Paulo',
              city: city || result?.city || 'Desconhecida',
              neighborhood,
              address,
              lat: lat,
              lng: lng,
              method: 'google',
            };
          }
        }
      } catch { /* continue with existing result */ }
    }

    // Strategy 4: geojs.io fallback
    if (!result) {
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (res.ok) {
          const data = await res.json();
          result = {
            region: data.region || 'São Paulo',
            city: data.city || 'Desconhecida',
            neighborhood: '',
            address: '',
            lat: parseFloat(data.latitude) || -23.5505,
            lng: parseFloat(data.longitude) || -46.6333,
            method: 'geojs',
          };
        }
      } catch { /* continue */ }
    }

    // Final fallback
    if (!result) {
      result = {
        region: 'São Paulo',
        city: 'São Paulo',
        neighborhood: '',
        address: '',
        lat: -23.5505,
        lng: -46.6333,
        method: 'fallback',
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
