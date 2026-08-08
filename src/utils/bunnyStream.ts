const DEFAULT_BUNNY_STREAM_LIBRARY_ID = '558340';

const BUNNY_CDN_HOST_RE = /^vz-[a-z0-9-]+\.b-cdn\.net$/i;
const BUNNY_PLAYER_HOST_RE = /^(player|iframe)\.mediadelivery\.net$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isBunnyStreamUrl = (src?: string | null): boolean => {
  const parsed = parseBunnyStreamUrl(src);
  return Boolean(parsed?.videoId);
};

export const parseBunnyStreamUrl = (src?: string | null): { libraryId: string; videoId: string } | null => {
  try {
    const url = new URL(String(src || '').trim());
    const parts = url.pathname.split('/').filter(Boolean);

    if (BUNNY_CDN_HOST_RE.test(url.hostname)) {
      const videoId = parts[0];
      return UUID_RE.test(videoId || '')
        ? { libraryId: DEFAULT_BUNNY_STREAM_LIBRARY_ID, videoId }
        : null;
    }

    if (BUNNY_PLAYER_HOST_RE.test(url.hostname)) {
      const [, libraryId, videoId] = parts;
      return libraryId && UUID_RE.test(videoId || '') ? { libraryId, videoId } : null;
    }

    return null;
  } catch {
    return null;
  }
};

export const toBunnyStreamEmbedUrl = (
  src?: string | null,
  options: {
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    preload?: boolean;
    responsive?: boolean;
    compactControls?: boolean;
  } = {},
): string | null => {
  const parsed = parseBunnyStreamUrl(src);
  if (!parsed) return null;

  const params = new URLSearchParams({
    autoplay: String(options.autoplay ?? false),
    muted: String(options.muted ?? true),
    loop: String(options.loop ?? true),
    preload: String(options.preload ?? true),
    responsive: String(options.responsive ?? true),
    playsinline: 'true',
  });

  if (options.compactControls) {
    params.set('compactControls', 'true');
  }

  return `https://player.mediadelivery.net/embed/${parsed.libraryId}/${parsed.videoId}?${params.toString()}`;
};

export const toBunnyStreamCanonicalEmbedUrl = (src?: string | null): string | null => {
  const parsed = parseBunnyStreamUrl(src);
  return parsed ? `https://player.mediadelivery.net/embed/${parsed.libraryId}/${parsed.videoId}` : null;
};

/**
 * Retorna a URL de thumbnail estática (imagem leve) do vídeo Bunny Stream,
 * evitando embutir o player inteiro em grids/listas.
 */
export const toBunnyStreamThumbnailUrl = (src?: string | null): string | null => {
  try {
    const raw = String(src || '').trim();
    if (!raw) return null;
    const url = new URL(raw);
    if (BUNNY_CDN_HOST_RE.test(url.hostname)) {
      const parts = url.pathname.split('/').filter(Boolean);
      const videoId = parts[0];
      if (UUID_RE.test(videoId || '')) {
        return `https://${url.hostname}/${videoId}/thumbnail.jpg`;
      }
    }
    const parsed = parseBunnyStreamUrl(raw);
    if (parsed) {
      return `https://vz-${parsed.libraryId}.b-cdn.net/${parsed.videoId}/thumbnail.jpg`;
    }
    return null;
  } catch {
    return null;
  }
};