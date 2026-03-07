import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const BRAZILIAN_STATES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const STATE_ALIASES: Record<string, string> = {
  "sao paulo": "SP",
  "são paulo": "SP",
  "minas gerais": "MG",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "rio de janeiro": "RJ",
  "espirito santo": "ES",
  "espírito santo": "ES",
};

function normalizeStateName(input?: string): string {
  if (!input) return "";
  const raw = String(input).trim();
  if (!raw) return "";

  const upper = raw.toUpperCase();
  if (BRAZILIAN_STATES[upper]) return BRAZILIAN_STATES[upper];

  const lower = raw.toLowerCase();
  const alias = STATE_ALIASES[lower];
  if (alias && BRAZILIAN_STATES[alias]) return BRAZILIAN_STATES[alias];

  const match = Object.values(BRAZILIAN_STATES).find((name) => name.toLowerCase() === lower);
  return match || "";
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clientLat = toNumber(body.lat, 0);
    const clientLng = toNumber(body.lng, 0);
    const hasClientCoords = Number.isFinite(clientLat) && Number.isFinite(clientLng) && clientLat !== 0 && clientLng !== 0;

    // Get client IP from forwarded headers (Cloudflare/Supabase)
    const forwarded = req.headers.get("x-forwarded-for") || "";
    const clientIP = forwarded.split(",")[0]?.trim() || null;

    let result: GeoResult | null = null;

    // Strategy 1: Google Reverse Geocode when coords are available (most accurate)
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (GOOGLE_API_KEY && hasClientCoords) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${clientLat},${clientLng}&language=pt-BR&key=${GOOGLE_API_KEY}`,
        );

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length > 0) {
            const components = data.results[0].address_components || [];
            const countryComp = components.find((c: any) => c.types?.includes("country"));
            const stateComp = components.find((c: any) => c.types?.includes("administrative_area_level_1"));
            const cityComp = components.find((c: any) => c.types?.includes("administrative_area_level_2"));
            const neighborhoodComp = components.find((c: any) => c.types?.includes("sublocality_level_1") || c.types?.includes("neighborhood"));

            const countryCode = String(countryComp?.short_name || "").toUpperCase();
            const normalizedState = normalizeStateName(stateComp?.long_name || stateComp?.short_name);

            if (countryCode === "BR" && normalizedState) {
              result = {
                region: normalizedState,
                city: String(cityComp?.long_name || ""),
                neighborhood: String(neighborhoodComp?.long_name || ""),
                address: String(data.results[0].formatted_address || ""),
                lat: clientLat,
                lng: clientLng,
                method: "google",
              };
            }
          }
        }
      } catch {
        // continue
      }
    }

    // Strategy 1b: Nominatim reverse geocode fallback (quando Google falha/sem chave)
    if (!result && hasClientCoords) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${clientLat}&lon=${clientLng}&format=json&addressdetails=1&accept-language=pt-BR`,
          {
            headers: { "User-Agent": "COCONUDI-Geolocate/1.0" },
          },
        );

        if (res.ok) {
          const data = await res.json();
          const address = data?.address || {};
          const normalizedState = normalizeStateName(address.state || address.region || "");
          const countryCode = String(address.country_code || "").toUpperCase();

          if (countryCode === "BR" && normalizedState) {
            result = {
              region: normalizedState,
              city: String(address.city || address.town || address.municipality || ""),
              neighborhood: String(address.suburb || address.neighbourhood || ""),
              address: String(data.display_name || ""),
              lat: clientLat,
              lng: clientLng,
              method: "nominatim",
            };
          }
        }
      } catch {
        // continue
      }
    }

    // Strategy 2: ipwho.is via client IP (HTTPS)
    if (!result && clientIP) {
      try {
        const res = await fetch(`https://ipwho.is/${clientIP}`);
        if (res.ok) {
          const data = await res.json();
          const countryCode = String(data.country_code || "").toUpperCase();
          const normalizedState = normalizeStateName(data.region);

          if (data.success && countryCode === "BR" && normalizedState) {
            result = {
              region: normalizedState,
              city: String(data.city || ""),
              neighborhood: "",
              address: "",
              lat: toNumber(data.latitude, 0),
              lng: toNumber(data.longitude, 0),
              method: "ipwho",
            };
          }
        }
      } catch {
        // continue
      }
    }

    // Strategy 3: ipapi.co via client IP (HTTPS)
    if (!result && clientIP) {
      try {
        const res = await fetch(`https://ipapi.co/${clientIP}/json/`);
        if (res.ok) {
          const data = await res.json();
          const countryCode = String(data.country_code || "").toUpperCase();
          const normalizedState = normalizeStateName(data.region || data.region_code);

          if (countryCode === "BR" && normalizedState) {
            result = {
              region: normalizedState,
              city: String(data.city || ""),
              neighborhood: "",
              address: "",
              lat: toNumber(data.latitude, 0),
              lng: toNumber(data.longitude, 0),
              method: "ipapi",
            };
          }
        }
      } catch {
        // continue
      }
    }

    // Never force São Paulo: return unresolved when not reliable
    if (!result) {
      result = {
        region: "",
        city: "",
        neighborhood: "",
        address: "",
        lat: hasClientCoords ? clientLat : 0,
        lng: hasClientCoords ? clientLng : 0,
        method: "unresolved",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
