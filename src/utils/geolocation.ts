/**
 * Robust geolocation detection for Brazil
 * Priority: Browser GPS → Reverse Geocoding → IP-based → Manual fallback
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

// Reverse lookup: full name → abbreviation
const STATE_NAME_TO_ABBR: Record<string, string> = {};
Object.entries(BRAZILIAN_STATES).forEach(([abbr, name]) => {
  STATE_NAME_TO_ABBR[name.toLowerCase()] = abbr;
  STATE_NAME_TO_ABBR[abbr.toLowerCase()] = abbr;
});

/**
 * Normalize a Brazilian state name to its full name
 */
export function normalizeStateName(input: string): string {
  if (!input) return 'São Paulo';
  const trimmed = input.trim();
  
  // Check if it's an abbreviation
  const upper = trimmed.toUpperCase();
  if (BRAZILIAN_STATES[upper]) return BRAZILIAN_STATES[upper];
  
  // Check if it's already a full name
  const lower = trimmed.toLowerCase();
  if (STATE_NAME_TO_ABBR[lower]) return BRAZILIAN_STATES[STATE_NAME_TO_ABBR[lower]];
  
  // Fuzzy match - check if the input contains a state name
  for (const [name, abbr] of Object.entries(STATE_NAME_TO_ABBR)) {
    if (lower.includes(name) || name.includes(lower)) {
      return BRAZILIAN_STATES[abbr];
    }
  }
  
  return trimmed; // Return as-is if no match
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
        enableHighAccuracy: false, // Faster, still good enough for state-level
        timeout: 8000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  });
}

/**
 * Method 2: Reverse geocode coordinates to state/city using Nominatim (free, no key)
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ state: string; city: string; country: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt-BR`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'COCONUDI-App/1.0' },
  });

  if (!response.ok) throw new Error('Reverse geocoding failed');
  
  const data = await response.json();
  const address = data.address || {};
  
  // Nominatim returns state in address.state for Brazil
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
 * Method 3: IP-based geolocation using ip-api.com (free, no key, accurate for Brazil)
 */
async function getLocationByIP(): Promise<LocationResult> {
  // Try ip-api.com first (very accurate for Brazil, 45 req/min free)
  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,lat,lon&lang=pt-BR');
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return {
          state: normalizeStateName(data.regionName || data.region || ''),
          city: data.city || 'Desconhecida',
          country: data.countryCode || 'BR',
          lat: data.lat || -23.5505,
          lng: data.lon || -46.6333,
          method: 'ip',
        };
      }
    }
  } catch {
    console.warn('⚠️ ip-api.com failed, trying fallback...');
  }

  // Fallback: ipapi.co (free tier)
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      return {
        state: normalizeStateName(data.region || ''),
        city: data.city || 'Desconhecida',
        country: data.country_code || 'BR',
        lat: data.latitude || -23.5505,
        lng: data.longitude || -46.6333,
        method: 'ip',
      };
    }
  } catch {
    console.warn('⚠️ ipapi.co also failed');
  }

  throw new Error('All IP geolocation APIs failed');
}

/**
 * Main detection function - tries GPS first, then IP, then fallback
 */
export async function detectLocation(): Promise<LocationResult> {
  // Method 1: Try browser GPS + reverse geocoding
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

  // Method 2: IP-based geolocation
  try {
    console.log('📍 Tentando geolocalização por IP...');
    const ipLocation = await getLocationByIP();
    console.log('📍 Localização por IP:', ipLocation);
    return ipLocation;
  } catch (ipError) {
    console.warn('⚠️ IP geolocation falhou:', (ipError as Error).message);
  }

  // Method 3: Fallback
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
