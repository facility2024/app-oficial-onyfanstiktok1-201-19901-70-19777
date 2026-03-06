import { useEffect, useState } from 'react';
import { MarkerF, InfoWindowF } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { Star, Phone, MapPin, ExternalLink } from 'lucide-react';

interface LocalBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  rating: number | null;
  is_sponsored: boolean;
  description: string | null;
  website: string | null;
  image_url: string | null;
}

interface MapBusinessPinsProps {
  visible: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurante: '#ef4444',
  loja: '#3b82f6',
  bar: '#f59e0b',
  salão: '#ec4899',
  academia: '#8b5cf6',
  mercado: '#10b981',
  farmacia: '#06b6d4',
  default: '#6366f1',
};

function createBusinessIcon(category: string, sponsored: boolean): string {
  const color = CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.default;
  const size = sponsored ? 36 : 28;
  const star = sponsored
    ? `<polygon points="12,2 15,9 22,9.5 17,14 18.5,21 12,17 5.5,21 7,14 2,9.5 9,9" fill="#facc15" stroke="#ca8a04" stroke-width="0.5"/>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="9" r="3" fill="white"/>
    ${star}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const MapBusinessPins = ({ visible }: MapBusinessPinsProps) => {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [selected, setSelected] = useState<LocalBusiness | null>(null);

  useEffect(() => {
    if (!visible) return;

    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('local_businesses')
        .select('id, name, category, address, latitude, longitude, phone, rating, is_sponsored, description, website, image_url')
        .eq('is_active', true);
      if (data) setBusinesses(data);
    };
    fetch();
  }, [visible]);

  if (!visible || businesses.length === 0) return null;

  return (
    <>
      {businesses.map(biz => (
        <MarkerF
          key={biz.id}
          position={{ lat: biz.latitude, lng: biz.longitude }}
          icon={{
            url: createBusinessIcon(biz.category, biz.is_sponsored),
            scaledSize: new google.maps.Size(biz.is_sponsored ? 36 : 28, biz.is_sponsored ? 36 : 28),
            anchor: new google.maps.Point(biz.is_sponsored ? 18 : 14, biz.is_sponsored ? 36 : 28),
          }}
          onClick={() => setSelected(biz)}
          zIndex={biz.is_sponsored ? 999 : 1}
        />
      ))}

      {selected && (
        <InfoWindowF
          position={{ lat: selected.latitude, lng: selected.longitude }}
          onCloseClick={() => setSelected(null)}
        >
          <div className="p-1 min-w-[180px] max-w-[240px]">
            {selected.image_url && (
              <img
                src={selected.image_url}
                alt={selected.name}
                className="w-full h-20 object-cover rounded mb-1.5"
              />
            )}
            <div className="flex items-start justify-between gap-1">
              <div>
                <h3 className="font-bold text-sm text-gray-900">{selected.name}</h3>
                <span
                  className="inline-block text-[10px] px-1.5 py-0.5 rounded-full text-white mt-0.5"
                  style={{ backgroundColor: CATEGORY_COLORS[selected.category.toLowerCase()] || CATEGORY_COLORS.default }}
                >
                  {selected.category}
                </span>
              </div>
              {selected.is_sponsored && (
                <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-medium">
                  ⭐ Patrocinado
                </span>
              )}
            </div>

            {selected.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{selected.description}</p>
            )}

            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{selected.address}</span>
            </div>

            {selected.rating && (
              <div className="flex items-center gap-1 mt-0.5 text-xs">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-gray-700">{selected.rating.toFixed(1)}</span>
              </div>
            )}

            <div className="flex gap-2 mt-1.5">
              {selected.phone && (
                <a
                  href={`tel:${selected.phone}`}
                  className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline"
                >
                  <Phone className="w-3 h-3" /> Ligar
                </a>
              )}
              {selected.website && (
                <a
                  href={selected.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Site
                </a>
              )}
            </div>
          </div>
        </InfoWindowF>
      )}
    </>
  );
};
