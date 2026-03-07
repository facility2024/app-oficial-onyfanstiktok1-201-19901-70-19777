import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip");

    let region: string | null = null;
    let city: string | null = null;
    let neighborhood: string | null = null;
    let address: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;

    // 1) ip-api.com (grátis, inclui distrito)
    if (clientIp && clientIp !== "127.0.0.1") {
      try {
        const ipRes = await fetch(
          `http://ip-api.com/json/${clientIp}?lang=pt-BR&fields=status,regionName,city,district,lat,lon`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (ipRes.ok) {
          const d = await ipRes.json();
          if (d.status === "success") {
            region = d.regionName;
            city = d.city;
            neighborhood = d.district || null;
            lat = d.lat;
            lng = d.lon;
          }
        }
      } catch {
        // continue
      }
    }

    // 2) Fallback: ipinfo.io
    if (!city && clientIp && clientIp !== "127.0.0.1") {
      try {
        const res = await fetch(`https://ipinfo.io/${clientIp}/json`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const d = await res.json();
          region = d.region;
          city = d.city;
          if (d.loc) {
            const [la, lo] = d.loc.split(",").map(Number);
            lat = la;
            lng = lo;
          }
        }
      } catch {
        // continue
      }
    }

    // 3) Google Reverse Geocoding (bairro + endereço completo)
    if (lat && lng && GOOGLE_API_KEY && (!neighborhood || !address)) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=pt-BR`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        if (data.status === "OK" && data.results?.length > 0) {
          if (!address) address = data.results[0].formatted_address;
          for (const r of data.results) {
            for (const c of r.address_components || []) {
              const t = c.types || [];
              if (
                !neighborhood &&
                (t.includes("sublocality_level_1") ||
                  t.includes("sublocality") ||
                  t.includes("neighborhood"))
              )
                neighborhood = c.long_name;
              if (!region && t.includes("administrative_area_level_1"))
                region = c.long_name;
              if (
                !city &&
                (t.includes("administrative_area_level_2") ||
                  t.includes("locality"))
              )
                city = c.long_name;
            }
            if (neighborhood) break;
          }
        }
      } catch {
        // continue
      }
    }

    // 4) Último fallback: geojs.io
    if (!city) {
      try {
        const res = await fetch("https://get.geojs.io/v1/ip/geo.json", {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const d = await res.json();
          region = d.region;
          city = d.city;
        }
      } catch {
        // continue
      }
    }

    return new Response(
      JSON.stringify({ region, city, neighborhood, address, lat, lng }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        region: null,
        city: null,
        neighborhood: null,
        address: null,
        error: String(err),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
