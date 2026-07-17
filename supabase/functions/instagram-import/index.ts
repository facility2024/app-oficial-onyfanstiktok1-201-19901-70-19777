// Edge Function: instagram-import
// Fluxo por SHORTCODE (posts /p/ e /reel/):
// 1. Recebe uma lista de URLs/shortcodes.
// 2. Deduplica ANTES de chamar a RapidAPI (checa ig_shortcode existente) — não gera cobrança extra.
// 3. Para cada shortcode novo: 1 requisição na RapidAPI (mediaByShortcode).
// 4. Faz stream do vídeo/imagens para a Bunny (novo storage IG) — links do IG expiram rápido.
// 5. Insere linha em ig_feed_videos + upsert em ig_models por owner.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!;
const RAPIDAPI_HOST = 'instagram-scraper-api2.p.rapidapi.com';
const BUNNY_ZONE = Deno.env.get('BUNNY_IG_STORAGE_ZONE')!;
const BUNNY_HOST = Deno.env.get('BUNNY_IG_STORAGE_REGION_HOST')!;
const BUNNY_KEY = Deno.env.get('BUNNY_IG_STORAGE_ACCESS_KEY')!;
const BUNNY_PULL = Deno.env.get('BUNNY_IG_PULL_ZONE_HOST')!;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function slugify(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

function extractShortcode(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  // Se veio só o shortcode
  if (/^[A-Za-z0-9_-]{5,20}$/.test(s) && !s.includes('/')) return s;
  // URL de post/reel/tv
  const m = s.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

async function fetchByShortcode(shortcode: string) {
  const url = `https://${RAPIDAPI_HOST}/v1/post_info?code_or_id_or_url=${encodeURIComponent(shortcode)}&include_insights=false`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch (_) {}
  if (!res.ok) {
    const err: any = new Error(`Provider ${res.status}: ${json?.message ?? text.slice(0, 200)}`);
    err.providerFail = true;
    throw err;
  }
  return json;
}

// Normaliza a resposta em: owner + lista de mídias (carousel vira várias).
function normalizePost(raw: any): {
  owner: { username: string; full_name?: string; pic?: string; pk?: string };
  caption: string;
  post_type: 'video' | 'image' | 'carousel';
  media: Array<{ kind: 'video' | 'image'; url: string; thumb?: string; width?: number; height?: number; duration?: number }>;
  media_id?: string;
  width?: number; height?: number; duration?: number;
} {
  const d = raw?.data ?? raw;
  const item = d?.items?.[0] ?? d?.item ?? d;
  const user = item?.user ?? item?.owner ?? {};
  const owner = {
    username: (user?.username || '').toLowerCase(),
    full_name: user?.full_name,
    pic: user?.profile_pic_url || user?.profile_pic_url_hd,
    pk: user?.pk ? String(user.pk) : user?.id ? String(user.id) : undefined,
  };
  const caption = item?.caption?.text ?? (typeof item?.caption === 'string' ? item.caption : '') ?? '';
  const media: any[] = [];

  const pushVideoOrImage = (node: any) => {
    const vurl = node?.video_url || node?.video_versions?.[0]?.url;
    if (vurl) {
      media.push({
        kind: 'video',
        url: vurl,
        thumb: node?.thumbnail_url || node?.display_url || node?.image_versions2?.candidates?.[0]?.url,
        width: node?.original_width || node?.width,
        height: node?.original_height || node?.height,
        duration: node?.video_duration || node?.duration,
      });
    } else {
      const iurl = node?.display_url || node?.image_versions2?.candidates?.[0]?.url;
      if (iurl) {
        media.push({
          kind: 'image',
          url: iurl,
          width: node?.original_width || node?.width,
          height: node?.original_height || node?.height,
        });
      }
    }
  };

  const carousel = item?.carousel_media || item?.carousel_media_v2;
  if (Array.isArray(carousel) && carousel.length > 0) {
    for (const c of carousel) pushVideoOrImage(c);
  } else {
    pushVideoOrImage(item);
  }

  const post_type: 'video' | 'image' | 'carousel' =
    (Array.isArray(carousel) && carousel.length > 1) ? 'carousel'
    : (media[0]?.kind === 'video' ? 'video' : 'image');

  return {
    owner,
    caption,
    post_type,
    media,
    media_id: item?.id ? String(item.id) : item?.pk ? String(item.pk) : undefined,
    width: media[0]?.width,
    height: media[0]?.height,
    duration: media[0]?.duration,
  };
}

async function streamToBunny(sourceUrl: string, bunnyPath: string): Promise<void> {
  const src = await fetch(sourceUrl);
  if (!src.ok || !src.body) throw new Error(`fetch media ${src.status}`);
  const put = await fetch(`https://${BUNNY_HOST}/${BUNNY_ZONE}/${bunnyPath}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'application/octet-stream' },
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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const visibility: 'public' | 'private' = body?.visibility === 'private' ? 'private' : 'public';
    const rawList: string[] = Array.isArray(body?.urls) ? body.urls : (body?.url ? [body.url] : []);
    const shortcodes = Array.from(new Set(
      rawList.map((s) => extractShortcode(s)).filter((s): s is string => !!s)
    ));

    if (shortcodes.length === 0) {
      return new Response(JSON.stringify({ error: 'Envie ao menos um link /p/ ou /reel/ do Instagram.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplicação prévia — evita chamar RapidAPI para o que já temos
    const { data: existingRows } = await admin
      .from('ig_feed_videos')
      .select('ig_shortcode')
      .in('ig_shortcode', shortcodes);
    const existingSet = new Set((existingRows ?? []).map((r: any) => r.ig_shortcode));

    const results: any[] = [];
    let imported = 0, skipped = 0, failed = 0;

    for (const sc of shortcodes) {
      if (existingSet.has(sc)) {
        skipped++;
        results.push({ shortcode: sc, status: 'skipped' });
        continue;
      }
      try {
        const raw = await fetchByShortcode(sc);
        const post = normalizePost(raw);
        if (!post.owner.username || post.media.length === 0) {
          throw new Error('Post sem mídia utilizável');
        }
        const slug = slugify(post.owner.username);

        // Upsert ig_model por username
        let igModelId: string;
        const { data: exModel } = await admin
          .from('ig_models')
          .select('id, avatar_url, display_name, slug')
          .eq('ig_username', post.owner.username)
          .maybeSingle();

        if (exModel) {
          igModelId = exModel.id;
          const patch: any = {};
          if (!exModel.avatar_url && post.owner.pic) patch.avatar_url = post.owner.pic;
          if (!exModel.display_name && post.owner.full_name) patch.display_name = post.owner.full_name;
          if (!exModel.slug) patch.slug = slug;
          if (Object.keys(patch).length) await admin.from('ig_models').update(patch).eq('id', igModelId);
        } else {
          const { data: newModel, error: mErr } = await admin
            .from('ig_models')
            .insert({
              ig_username: post.owner.username,
              ig_user_id: post.owner.pk ?? null,
              display_name: post.owner.full_name ?? post.owner.username,
              avatar_url: post.owner.pic ?? null,
              slug,
              default_visibility: visibility,
            })
            .select('id')
            .single();
          if (mErr) throw new Error(`ig_models insert: ${mErr.message}`);
          igModelId = newModel.id;
        }

        // Stream de todas as mídias para a Bunny sob <slug>/<shortcode>[_i].ext
        const mediaOut: any[] = [];
        let mainVideoUrl: string | null = null;
        let mainThumbUrl: string | null = null;
        let mainBunnyPath: string | null = null;

        for (let i = 0; i < post.media.length; i++) {
          const m = post.media[i];
          const suffix = post.media.length > 1 ? `_${i + 1}` : '';
          const ext = m.kind === 'video' ? 'mp4' : 'jpg';
          const path = `${slug}/${sc}${suffix}.${ext}`;
          await streamToBunny(m.url, path);
          const cdn = `https://${BUNNY_PULL}/${path}`;

          let thumbCdn: string | undefined;
          if (m.kind === 'video' && m.thumb) {
            try {
              const tp = `${slug}/${sc}${suffix}_thumb.jpg`;
              await streamToBunny(m.thumb, tp);
              thumbCdn = `https://${BUNNY_PULL}/${tp}`;
            } catch (_) { /* best-effort */ }
          }

          mediaOut.push({ kind: m.kind, url: cdn, thumb: thumbCdn ?? null, width: m.width ?? null, height: m.height ?? null, duration: m.duration ?? null });

          if (!mainVideoUrl) {
            mainVideoUrl = cdn;
            mainThumbUrl = thumbCdn ?? (m.kind === 'image' ? cdn : null);
            mainBunnyPath = path;
          }
        }

        const { data: inserted, error: iErr } = await admin
          .from('ig_feed_videos')
          .insert({
            ig_model_id: igModelId,
            ig_shortcode: sc,
            ig_media_id: post.media_id ?? null,
            source_url: `https://www.instagram.com/p/${sc}/`,
            bunny_path: mainBunnyPath,
            video_url: mainVideoUrl,
            thumbnail_url: mainThumbUrl,
            caption: post.caption ?? null,
            duration_seconds: post.duration ?? null,
            width: post.width ?? null,
            height: post.height ?? null,
            visibility,
            post_type: post.post_type,
            media: mediaOut,
            imported_by: userId,
          })
          .select('id')
          .single();
        if (iErr) throw new Error(iErr.message);
        imported++;
        results.push({ shortcode: sc, status: 'ok', id: inserted.id, username: post.owner.username, post_type: post.post_type, media_count: mediaOut.length });
      } catch (e: any) {
        failed++;
        console.error('[ig-import]', sc, e?.message ?? e);
        results.push({ shortcode: sc, status: 'error', error: e?.message ?? String(e) });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, imported, skipped, failed, total: shortcodes.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('[instagram-import]', e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
