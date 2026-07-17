// Edge Function: instagram-import (provider: instagram120)
// Fluxo: 1 requisição no RapidAPI por página; para cada item que já existe (ig_shortcode),
// pulamos ANTES de baixar (não gera custo extra); os novos vão direto pro Bunny
// porque as URLs do Instagram expiram rápido.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!;
const RAPIDAPI_HOST = 'instagram120.p.rapidapi.com';
const BUNNY_ZONE = Deno.env.get('BUNNY_IG_STORAGE_ZONE')!;
const BUNNY_HOST = Deno.env.get('BUNNY_IG_STORAGE_REGION_HOST')!;
const BUNNY_KEY = Deno.env.get('BUNNY_IG_STORAGE_ACCESS_KEY')!;
const BUNNY_PULL = Deno.env.get('BUNNY_IG_PULL_ZONE_HOST')!;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function cleanUsername(s: string): string {
  return (s || '').trim().replace(/^@/, '').toLowerCase();
}

async function fetchPosts(username: string, maxId: string) {
  const res = await fetch(`https://${RAPIDAPI_HOST}/api/instagram/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
    body: JSON.stringify({ username, maxId: maxId || '' }),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch (_) {}
  if (!res.ok || json?.success === false) {
    const msg = json?.message || text.slice(0, 300);
    const err: any = new Error(`Provider: ${msg}`);
    err.providerFail = true;
    err.status = res.status;
    throw err;
  }
  return json;
}

// Normaliza um item de post do instagram120 em algo estável.
function normalizeItem(it: any) {
  const shortcode = it?.code || it?.shortcode || it?.pk || null;
  const mediaId = it?.id || it?.pk ? String(it?.id || it?.pk) : null;
  const videoUrl =
    it?.video_url ||
    it?.video_versions?.[0]?.url ||
    it?.videos?.[0]?.url ||
    null;
  const thumb =
    it?.thumbnail_url ||
    it?.display_url ||
    it?.image_versions2?.candidates?.[0]?.url ||
    null;
  const caption =
    it?.caption?.text ||
    (typeof it?.caption === 'string' ? it.caption : '') ||
    '';
  const width = it?.original_width || it?.width || null;
  const height = it?.original_height || it?.height || null;
  const duration = it?.video_duration || it?.duration || null;
  const user = it?.user || it?.owner || {};
  return { shortcode, mediaId, videoUrl, thumb, caption, width, height, duration, user };
}

// A resposta pode vir em vários formatos; tentamos os mais comuns.
function extractList(raw: any): { items: any[]; nextMaxId: string | null; owner: any } {
  const d = raw?.data ?? raw?.result ?? raw;
  const items =
    d?.items ||
    d?.data?.items ||
    d?.user?.edge_owner_to_timeline_media?.edges?.map((e: any) => e.node) ||
    d?.edges?.map((e: any) => e.node) ||
    (Array.isArray(d) ? d : []) ||
    [];
  const nextMaxId =
    d?.next_max_id ||
    d?.max_id ||
    d?.paging?.cursors?.after ||
    d?.user?.edge_owner_to_timeline_media?.page_info?.end_cursor ||
    null;
  const owner = d?.user || items?.[0]?.user || items?.[0]?.owner || {};
  return { items: Array.isArray(items) ? items : [], nextMaxId, owner };
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
    const username = cleanUsername(body?.username ?? '');
    const maxId: string = body?.maxId ?? '';
    const visibility: 'public' | 'private' = body?.visibility === 'private' ? 'private' : 'public';
    if (!username) {
      return new Response(JSON.stringify({ error: 'username é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1 REQUISIÇÃO no RapidAPI por chamada (evita cobrança dupla)
    const raw = await fetchPosts(username, maxId);
    const { items, nextMaxId, owner } = extractList(raw);

    // Garante/atualiza ig_model
    let igModelId: string | null = null;
    const { data: existingModel } = await admin
      .from('ig_models')
      .select('id')
      .eq('ig_username', username)
      .maybeSingle();
    if (existingModel) {
      igModelId = existingModel.id;
    } else {
      const { data: newModel, error: mErr } = await admin
        .from('ig_models')
        .insert({
          ig_username: username,
          ig_user_id: owner?.pk ? String(owner.pk) : owner?.id ? String(owner.id) : null,
          display_name: owner?.full_name || username,
          avatar_url: owner?.profile_pic_url || owner?.profile_pic_url_hd || null,
          default_visibility: visibility,
        })
        .select('id')
        .single();
      if (mErr) throw new Error(`ig_models insert: ${mErr.message}`);
      igModelId = newModel.id;
    }

    // Filtra apenas itens de vídeo
    const normalized = items.map(normalizeItem).filter((n) => n.videoUrl && n.shortcode);

    // Deduplicação em lote — checa quais shortcodes JÁ existem antes de baixar
    const shortcodes = normalized.map((n) => n.shortcode as string);
    let existingSet = new Set<string>();
    if (shortcodes.length) {
      const { data: existingRows } = await admin
        .from('ig_feed_videos')
        .select('ig_shortcode')
        .in('ig_shortcode', shortcodes);
      existingSet = new Set((existingRows ?? []).map((r: any) => r.ig_shortcode));
    }

    let imported = 0, skipped = 0, failed = 0;
    const results: any[] = [];

    for (const n of normalized) {
      if (existingSet.has(n.shortcode as string)) {
        skipped++;
        continue;
      }
      try {
        const bunnyPath = `${username}/${n.shortcode}.mp4`;
        await streamToBunny(n.videoUrl as string, bunnyPath);
        const cdnUrl = `https://${BUNNY_PULL}/${bunnyPath}`;

        let thumbUrl: string | null = null;
        if (n.thumb) {
          try {
            const thumbPath = `${username}/${n.shortcode}.jpg`;
            await streamToBunny(n.thumb, thumbPath);
            thumbUrl = `https://${BUNNY_PULL}/${thumbPath}`;
          } catch (_) { /* thumb é best-effort */ }
        }

        const { data: inserted, error: iErr } = await admin
          .from('ig_feed_videos')
          .insert({
            ig_model_id: igModelId,
            ig_shortcode: n.shortcode,
            ig_media_id: n.mediaId,
            source_url: `https://www.instagram.com/reel/${n.shortcode}/`,
            bunny_path: bunnyPath,
            video_url: cdnUrl,
            thumbnail_url: thumbUrl,
            caption: n.caption ?? null,
            duration_seconds: n.duration ?? null,
            width: n.width ?? null,
            height: n.height ?? null,
            visibility,
            imported_by: userId,
          })
          .select('id')
          .single();
        if (iErr) throw new Error(iErr.message);
        imported++;
        results.push({ shortcode: n.shortcode, id: inserted.id });
      } catch (e: any) {
        failed++;
        console.error('[ig-import]', n.shortcode, e?.message ?? e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        username,
        imported,
        skipped,
        failed,
        totalInPage: normalized.length,
        nextMaxId,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('[instagram-import]', e);
    // Falhas do provider (perfil não encontrado, link expirado, rate limit) retornam 200
    // com fallback:true para não gerar 500/blank-screen no frontend.
    if (e?.providerFail) {
      return new Response(
        JSON.stringify({
          ok: false,
          fallback: true,
          error: e.message,
          hint: 'O provider RapidAPI não retornou dados desse perfil (link expirado, perfil privado ou inexistente). Tente outro @username ou aguarde alguns minutos.',
          imported: 0, skipped: 0, failed: 0, nextMaxId: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
