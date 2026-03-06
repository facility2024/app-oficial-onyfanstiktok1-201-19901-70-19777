/**
 * Robust geolocation detection for Brazil
 * Priority: Browser GPS → HTTPS IP APIs → Edge Function → Fallback
 */

export interface LocationResult {
  state: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  method: 'gps' | 'ip' | 'fallback';
}

const BRAZILIAN_STATES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
  'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
  'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins',
};

const STATE_NAME_TO_ABBR: Record<string, string> = {};
Object.entries(BRAZILIAN_STATES).forEach(([abbr, name]) => {
  STATE_NAME_TO_ABBR[name.toLowerCase()] = abbr;
  STATE_NAME_TO_ABBR[abbr.toLowerCase()] = abbr;
});

const BRAZILIAN_STATE_NAMES = new Set(
  Object.values(BRAZILIAN_STATES).map((stateName) => stateName.toLowerCase())
);

// Also map common variations like "State of ..." returned by some APIs
const STATE_ALIASES: Record<string, string> = {
  'estado de são paulo': 'SP',
  'estado de minas gerais': 'MG',
  'estado do rio de janeiro': 'RJ',
  'estado do paraná': 'PR',
  'estado de santa catarina': 'SC',
  'estado do rio grande do sul': 'RS',
  'state of são paulo': 'SP',
  'state of minas gerais': 'MG',
  'sao paulo': 'SP',
  'minas gerais': 'MG',
  'rio de janeiro': 'RJ',
  'rio grande do sul': 'RS',
  'rio grande do norte': 'RN',
  'mato grosso do sul': 'MS',
  'mato grosso': 'MT',
  'espirito santo': 'ES',
  'espírito santo': 'ES',
};

export function normalizeStateName(input: string): string {
  if (!input) return 'São Paulo';
  const trimmed = input.trim();
  
  // Check if it's an abbreviation
  const upper = trimmed.toUpperCase();
  if (BRAZILIAN_STATES[upper]) return BRAZILIAN_STATES[upper];
  
  // Check if it's already a full name
  const lower = trimmed.toLowerCase();
  if (STATE_NAME_TO_ABBR[lower]) return BRAZILIAN_STATES[STATE_NAME_TO_ABBR[lower]];
  
  // Check aliases
  if (STATE_ALIASES[lower]) return BRAZILIAN_STATES[STATE_ALIASES[lower]];
  
  // Fuzzy match
  for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (lower.includes(name) || name.includes(lower)) {
      return BRAZILIAN_STATES[abbr];
    }
  }
  
  return trimmed;
}

function isValidBrazilState(state: string): boolean {
  if (!state) return false;
  return BRAZILIAN_STATE_NAMES.has(normalizeStateName(state).toLowerCase());
}

/**
 * Method 1: Browser GPS geolocation
 */
function getBrowserGeolocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`GPS error: ${error.message}`));
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  });
}

/**
 * Method 2: Reverse geocode coordinates using Nominatim (free, HTTPS, no key)
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ state: string; city: string; country: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt-BR`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'COCONUDI-App/1.0' },
  });

  if (!response.ok) throw new Error('Reverse geocoding failed');
  
  const data = await response.json();
  const address = data.address || {};
  
  const rawState = address.state || '';
  const city = address.city || address.town || address.municipality || address.village || '';
  const country = address.country_code?.toUpperCase() || 'BR';
  
  return {
    state: normalizeStateName(rawState),
    city: city || 'Desconhecida',
    country,
  };
}

/**
 * Method 3: Edge Function geolocate (server-side IP detection - most reliable on HTTPS)
 */
async function getLocationByEdgeFunction(): Promise<LocationResult> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data, error } = await supabase.functions.invoke('geolocate', {
    body: {},
  });
  
  if (error) throw new Error(`Edge function error: ${error.message}`);
  if (!data || !data.region) throw new Error('No region returned');

  const normalizedState = normalizeStateName(data.region);
  const method = String(data.method || 'unknown').toLowerCase();

  // geojs/fallback podem refletir IP de proxy/servidor e gerar estado errado
  if (!isValidBrazilState(normalizedState) || method === 'geojs' || method === 'fallback') {
    throw new Error(`Unreliable edge location: state=${data.region}, method=${method}`);
  }
  
  console.log('📍 Edge function geolocate retornou:', data);
  return {
    state: normalizedState,
    city: data.city || 'Desconhecida',
    country: 'BR',
    lat: data.lat || -23.5505,
    lng: data.lng || -46.6333,
    method: 'ip',
  };
}

/**
 * Method 4: HTTPS IP-based geolocation (client-side fallback)
 */
async function getLocationByIP(): Promise<LocationResult> {
  // ipapi.co (HTTPS, free)
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (!data.error) {
        const normalizedState = normalizeStateName(data.region || '');
        if (isValidBrazilState(normalizedState)) {
          return {
            state: normalizedState,
            city: data.city || 'Desconhecida',
            country: data.country_code || 'BR',
            lat: data.latitude || -23.5505,
            lng: data.longitude || -46.6333,
            method: 'ip',
          };
        }
      }
    }
  } catch {
    console.warn('⚠️ ipapi.co failed');
  }

  // ipwho.is (HTTPS, free, no key)
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const normalizedState = normalizeStateName(data.region || '');
        if (isValidBrazilState(normalizedState)) {
          return {
            state: normalizedState,
            city: data.city || 'Desconhecida',
            country: data.country_code || 'BR',
            lat: data.latitude || -23.5505,
            lng: data.longitude || -46.6333,
            method: 'ip',
          };
        }
      }
    }
  } catch {
    console.warn('⚠️ ipwho.is failed');
  }

  throw new Error('All HTTPS IP geolocation APIs failed or returned non-BR state');
}

/**
 * Main detection - GPS → HTTPS IP (client-side) → Edge Function → Fallback
 */
export async function detectLocation(): Promise<LocationResult> {
  // Method 1: Browser GPS + reverse geocoding
  try {
    console.log('📍 Tentando GPS do navegador...');
    const coords = await getBrowserGeolocation();
    console.log('📍 GPS obtido:', coords);
    
    const geo = await reverseGeocode(coords.lat, coords.lng);
    console.log('📍 Geocodificação reversa:', geo);
    
    return {
      state: geo.state,
      city: geo.city,
      country: geo.country,
      lat: coords.lat,
      lng: coords.lng,
      method: 'gps',
    };
  } catch (gpsError) {
    console.warn('⚠️ GPS falhou:', (gpsError as Error).message);
  }

  // Method 2: HTTPS IP APIs (client-side, reflete a rede real do dispositivo)
  try {
    console.log('📍 Tentando HTTPS IP APIs...');
    const ipLocation = await getLocationByIP();
    console.log('📍 Localização por IP:', ipLocation);
    return ipLocation;
  } catch (ipError) {
    console.warn('⚠️ IP geolocation falhou:', (ipError as Error).message);
  }

  // Method 3: Edge Function (fallback)
  try {
    console.log('📍 Tentando Edge Function geolocate (fallback)...');
    const edgeLocation = await getLocationByEdgeFunction();
    console.log('📍 Localização via Edge Function:', edgeLocation);
    return edgeLocation;
  } catch (edgeError) {
    console.warn('⚠️ Edge Function falhou:', (edgeError as Error).message);
  }

  // Fallback
  console.warn('⚠️ Todas as APIs falharam, usando fallback São Paulo');
  return {
    state: 'São Paulo',
    city: 'São Paulo',
    country: 'BR',
    lat: -23.5505,
    lng: -46.6333,
    method: 'fallback',
  };
}

export const ALL_BRAZILIAN_STATES = Object.values(BRAZILIAN_STATES).sort();
