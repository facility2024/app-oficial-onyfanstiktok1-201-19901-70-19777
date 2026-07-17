// Edge Function: instagram-import
// Recebe uma URL/shortcode do Instagram, extrai o vídeo via RapidAPI,
// faz stream para uma zona Bunny SEPARADA e registra em public.ig_feed_videos.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!;
const BUNNY_ZONE = Deno.env.get('BUNNY_IG_STORAGE_ZONE')!;
const BUNNY_HOST = Deno.env.get('BUNNY_IG_STORAGE_REGION_HOST')!; // storage.bunnycdn.com
const BUNNY_KEY = Deno.env.get('BUNNY_IG_STORAGE_ACCESS_KEY')!;
const BUNNY_PULL = Deno.env.get('BUNNY_IG_PULL_ZONE_HOST')!; // xxx.b-cdn.net

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function extractShortcode(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const m = clean.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{5,20}$/.test(clean)) return clean;
  return null;
}

async function fetchFromRapidApi(shortcode: string) {
  // Provider: instagram-scraper-api2 (rocketapi) — genérico. Se usar outro, ajuste o host/path.
  const url = `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(shortcode)}`;
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`RapidAPI ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

function pickVideoUrl(data: any): { videoUrl?: string; thumb?: string; caption?: string; user?: any; mediaId?: string; width?: number; height?: number; duration?: number } {
  const d = data?.data ?? data;
  const videoUrl =
    d?.video_url ||
    d?.video_versions?.[0]?.url ||
    d?.videos?.[0]?.url ||
    d?.media?.video_versions?.[0]?.url;
  const thumb =
    d?.thumbnail_url ||
    d?.display_url ||
    d?.image_versions2?.candidates?.[0]?.url ||
    d?.thumbnail_src;
  const caption =
    d?.caption?.text ||
    (typeof d?.caption === 'string' ? d.caption : '') ||
    d?.edge_media_to_caption?.edges?.[0]?.node?.text ||
    '';
  const user = d?.user || d?.owner || {};
  const mediaId = d?.id || d?.pk || d?.media_id;
  return {
    videoUrl,
    thumb,
    caption,
    user,
    mediaId: mediaId ? String(mediaId) : undefined,
    width: d?.original_width || d?.dimensions?.width,
    height: d?.original_height || d?.dimensions?.height,
    duration: d?.video_duration || d?.duration,
  };
}

async function streamToBunny(sourceUrl: string, bunnyPath: string): Promise<void> {
  const src = await fetch(sourceUrl);
  if (!src.ok || !src.body) throw new Error(`fetch video ${src.status}`);
  const put = await fetch(`https://${BUNNY_HOST}/${BUNNY_ZONE}/${bunnyPath}`, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: src.body,
  });
  if (!put.ok) {
    const t = await put.text();
    throw new Error(`Bunny PUT ${put.status}: ${t.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supaUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supaUser.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claims.claims.sub;

    // Admin check
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const input: string = body?.url ?? body?.shortcode ?? '';
    const visibility: 'public' | 'private' = body?.visibility === 'private' ? 'private' : 'public';
    const shortcode = extractShortcode(input);
    if (!shortcode) {
      return new Response(JSON.stringify({ error: 'URL/shortcode inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Deduplicação
    const { data: existing } = await admin
      .from('ig_feed_videos')
      .select('id')
      .eq('ig_shortcode', shortcode)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: true, id: existing.id, shortcode }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // RapidAPI
    const raw = await fetchFromRapidApi(shortcode);
    const picked = pickVideoUrl(raw);
    if (!picked.videoUrl) {
      return new Response(JSON.stringify({ error: 'Post sem vídeo/reel', raw: raw?.data ? 'ok' : raw }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ig_model upsert
    const igUsername: string = picked.user?.username || 'unknown';
    let igModelId: string | null = null;
    const { data: existingModel } = await admin
      .from('ig_models')
      .select('id')
      .eq('ig_username', igUsername)
      .maybeSingle();
    if (existingModel) {
      igModelId = existingModel.id;
    } else {
      const { data: newModel, error: mErr } = await admin
        .from('ig_models')
        .insert({
          ig_username: igUsername,
          ig_user_id: picked.user?.pk ? String(picked.user.pk) : picked.user?.id ? String(picked.user.id) : null,
          display_name: picked.user?.full_name || igUsername,
          avatar_url: picked.user?.profile_pic_url || picked.user?.profile_pic_url_hd || null,
          default_visibility: visibility,
        })
        .select('id')
        .single();
      if (mErr) throw new Error(`ig_models insert: ${mErr.message}`);
      igModelId = newModel.id;
    }

    // Upload no Bunny
    const bunnyPath = `${igUsername}/${shortcode}.mp4`;
    await streamToBunny(picked.videoUrl, bunnyPath);
    const cdnUrl = `https://${BUNNY_PULL}/${bunnyPath}`;

    // Thumb (opcional, best effort)
    let thumbUrl: string | null = null;
    if (picked.thumb) {
      try {
        const thumbPath = `${igUsername}/${shortcode}.jpg`;
        await streamToBunny(picked.thumb, thumbPath);
        thumbUrl = `https://${BUNNY_PULL}/${thumbPath}`;
      } catch (_) { /* ignora falha de thumb */ }
    }

    const { data: inserted, error: iErr } = await admin
      .from('ig_feed_videos')
      .insert({
        ig_model_id: igModelId,
        ig_shortcode: shortcode,
        ig_media_id: picked.mediaId ?? null,
        source_url: `https://www.instagram.com/reel/${shortcode}/`,
        bunny_path: bunnyPath,
        video_url: cdnUrl,
        thumbnail_url: thumbUrl,
        caption: picked.caption ?? null,
        duration_seconds: picked.duration ?? null,
        width: picked.width ?? null,
        height: picked.height ?? null,
        visibility,
        imported_by: userId,
      })
      .select()
      .single();
    if (iErr) throw new Error(`insert video: ${iErr.message}`);

    return new Response(JSON.stringify({ ok: true, video: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[instagram-import]', e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
