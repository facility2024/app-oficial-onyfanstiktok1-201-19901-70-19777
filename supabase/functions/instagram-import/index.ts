// Edge Function: instagram-import
// Provider: instagram120 (RapidAPI)
// Fluxo NOVO (username-first):
//   1) Recebe links de perfil (ou @username / URLs de reel/post)
//   2) Para cada username:
//        - ensureModel() → userInfo 1x (só na 1ª aparição do @) + avatar no Bunny
//        - fetchUserPosts(username, maxId) → lista posts, pagina até maxPages
//        - dedup por ig_shortcode ANTES de gastar RapidAPI de novo
//        - baixa mídia (video/imagem/carrossel) → Bunny → insere ig_feed_videos
//   3) Se receber links de reel/post individuais, também aceita (mediaByShortcode)
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

const BUNNY_ROOT = 'modelos-oficiais-coconudi';

function slugify(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

function extractShortcode(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  const m = s.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

function extractUsername(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  // se for URL de post/reel, não é username
  if (/instagram\.com\/(?:reel|reels|p|tv)\//i.test(s)) return null;
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(s) && !s.includes('/')) return s.replace(/^@/, '').toLowerCase();
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})\/?/i);
  if (m && !/^(reel|reels|p|tv|explore|stories)$/i.test(m[1])) return m[1].toLowerCase();
  return null;
}

async function rapidPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://${RAPIDAPI_HOST}${path}`, {
    method: 'POST',
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch (_) {}
  if (!res.ok) {
    const err: any = new Error(`RapidAPI ${res.status}: ${json?.message ?? text.slice(0, 300)}`);
    err.providerFail = true;
    throw err;
  }
  return json;
}

async function fetchMediaByShortcode(shortcode: string) {
  return rapidPost('/api/instagram/mediaByShortcode', { shortcode });
}
async function fetchUserInfo(username: string) {
  return rapidPost('/api/instagram/userInfo', { username });
}
async function fetchUserPosts(username: string, maxId = '') {
  return rapidPost('/api/instagram/posts', { username, maxId });
}

// ============ Extração de mídia ============
function collectMedia(root: any): Array<{ kind: 'video' | 'image'; url: string; thumb?: string; width?: number; height?: number; duration?: number }> {
  const out: any[] = [];
  const seen = new Set<string>();

  function pushVideo(u: string, thumb?: string, w?: number, h?: number, dur?: number) {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push({ kind: 'video', url: u, thumb, width: w, height: h, duration: dur });
  }
  function pushImage(u: string, w?: number, h?: number) {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push({ kind: 'image', url: u, width: w, height: h });
  }

  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) { for (const n of node) walk(n); return; }
    if (typeof node !== 'object') return;

    const vurl = node.video_url
      || (Array.isArray(node.video_versions) ? node.video_versions[0]?.url : undefined);
    if (vurl && typeof vurl === 'string') {
      const thumb = node.thumbnail_url
        || node.display_url
        || node.image_versions2?.candidates?.[0]?.url
        || node.thumbnail_src;
      pushVideo(vurl, thumb, node.original_width || node.width, node.original_height || node.height, node.video_duration || node.duration);
    }

    if (!vurl) {
      const iurl = node.display_url
        || node.image_versions2?.candidates?.[0]?.url
        || node.thumbnail_src;
      if (iurl && typeof iurl === 'string' && /^https?:/.test(iurl)) {
        if (!/profile_pic|s150x150|s320x320/i.test(iurl)) {
          pushImage(iurl, node.original_width || node.width, node.original_height || node.height);
        }
      }
    }

    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && (Array.isArray(v) || typeof v === 'object')) walk(v);
    }
  }

  walk(root);
  return out;
}

function extractOwner(root: any): { username: string; full_name?: string; pic?: string; pk?: string } {
  function findUser(node: any, depth = 0): any {
    if (!node || depth > 6 || typeof node !== 'object') return null;
    if (typeof node.username === 'string' && node.username.length > 0) return node;
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && typeof v === 'object') {
        const found = findUser(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  const u = findUser(root) ?? {};
  return {
    username: (u?.username || '').toLowerCase(),
    full_name: u?.full_name,
    pic: u?.profile_pic_url_hd || u?.profile_pic_url,
    pk: u?.pk ? String(u.pk) : u?.id ? String(u.id) : undefined,
  };
}

function extractCaption(node: any): string {
  return node?.caption?.text
    ?? (typeof node?.caption === 'string' ? node.caption : '')
    ?? node?.edge_media_to_caption?.edges?.[0]?.node?.text
    ?? '';
}

// ============ Bunny ============
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

// ============ Model ============
async function ensureModel(
  admin: any,
  username: string,
  hint: { full_name?: string; pic?: string; pk?: string },
  visibility: 'public' | 'private',
): Promise<{ id: string; slug: string }> {
  const slug = slugify(username);

  const { data: existing } = await admin
    .from('ig_models')
    .select('id, slug, avatar_url, display_name, ig_user_id')
    .eq('ig_username', username)
    .maybeSingle();

  if (existing) {
    const patch: any = {};
    if (!existing.slug) patch.slug = slug;
    if (!existing.display_name && hint.full_name) patch.display_name = hint.full_name;
    if (!existing.ig_user_id && hint.pk) patch.ig_user_id = hint.pk;
    if (Object.keys(patch).length) await admin.from('ig_models').update(patch).eq('id', existing.id);
    return { id: existing.id, slug: existing.slug || slug };
  }

  // 1ª vez → userInfo 1x
  let full_name = hint.full_name;
  let pic = hint.pic;
  let pk = hint.pk;
  try {
    const info = await fetchUserInfo(username);
    const u = info?.data ?? info?.user ?? info;
    full_name = u?.full_name ?? full_name;
    pic = u?.profile_pic_url_hd ?? u?.profile_pic_url ?? pic;
    pk = u?.pk ? String(u.pk) : u?.id ? String(u.id) : pk;
  } catch (e) {
    console.warn('[ig-import] userInfo falhou:', (e as Error).message);
  }

  let avatarCdn: string | null = null;
  if (pic) {
    try {
      const path = `${BUNNY_ROOT}/${slug}/profile.jpg`;
      await streamToBunny(pic, path);
      avatarCdn = `https://${BUNNY_PULL}/${path}`;
    } catch (e) {
      console.warn('[ig-import] avatar bunny falhou:', (e as Error).message);
    }
  }

  const { data: newModel, error } = await admin
    .from('ig_models')
    .insert({
      ig_username: username,
      ig_user_id: pk ?? null,
      display_name: full_name ?? username,
      avatar_url: avatarCdn ?? pic ?? null,
      slug,
      default_visibility: visibility,
    })
    .select('id, slug')
    .single();
  if (error) throw new Error(`ig_models insert: ${error.message}`);
  return { id: newModel.id, slug: newModel.slug };
}

// ============ Persistência de UM post ============
async function persistPost(
  admin: any,
  model: { id: string; slug: string },
  shortcode: string,
  postNode: any,
  visibility: 'public' | 'private',
  userId: string,
) {
  const media = collectMedia(postNode);
  if (media.length === 0) throw new Error('Post sem mídia utilizável');

  const post_type: 'video' | 'image' | 'carousel' =
    media.length > 1 ? 'carousel' : (media[0].kind === 'video' ? 'video' : 'image');

  const mediaOut: any[] = [];
  let mainVideoUrl: string | null = null;
  let mainThumbUrl: string | null = null;
  let mainBunnyPath: string | null = null;

  for (let i = 0; i < media.length; i++) {
    const m = media[i];
    const suffix = media.length > 1 ? `_${i + 1}` : '';
    const ext = m.kind === 'video' ? 'mp4' : 'jpg';
    const subdir = m.kind === 'video' ? 'videos' : 'posters';
    const path = `${BUNNY_ROOT}/${model.slug}/${subdir}/${shortcode}${suffix}.${ext}`;
    await streamToBunny(m.url, path);
    const cdn = `https://${BUNNY_PULL}/${path}`;

    let thumbCdn: string | undefined;
    if (m.kind === 'video' && m.thumb) {
      try {
        const tp = `${BUNNY_ROOT}/${model.slug}/posters/${shortcode}${suffix}.jpg`;
        await streamToBunny(m.thumb, tp);
        thumbCdn = `https://${BUNNY_PULL}/${tp}`;
      } catch (_) {}
    }

    mediaOut.push({
      kind: m.kind, url: cdn, thumb: thumbCdn ?? null,
      width: m.width ?? null, height: m.height ?? null, duration: m.duration ?? null,
    });

    if (!mainVideoUrl) {
      mainVideoUrl = cdn;
      mainThumbUrl = thumbCdn ?? (m.kind === 'image' ? cdn : null);
      mainBunnyPath = path;
    }
  }

  const mediaId = postNode?.id ? String(postNode.id) : postNode?.pk ? String(postNode.pk) : null;

  const { data: inserted, error: iErr } = await admin
    .from('ig_feed_videos')
    .insert({
      ig_model_id: model.id,
      ig_shortcode: shortcode,
      ig_media_id: mediaId,
      source_url: `https://www.instagram.com/p/${shortcode}/`,
      bunny_path: mainBunnyPath,
      video_url: mainVideoUrl,
      thumbnail_url: mainThumbUrl,
      caption: extractCaption(postNode) ?? null,
      duration_seconds: media[0]?.duration ?? null,
      width: media[0]?.width ?? null,
      height: media[0]?.height ?? null,
      visibility,
      post_type,
      media: mediaOut,
      imported_by: userId,
    })
    .select('id')
    .single();
  if (iErr) throw new Error(iErr.message);
  return { id: inserted.id, post_type, media_count: mediaOut.length };
}

// Extrai lista de posts + próximo maxId de qualquer shape que o instagram120 devolver.
function extractPostsPage(payload: any): { items: any[]; nextMaxId: string | null } {
  const items: any[] = [];
  const seen = new Set<string>();

  function walk(node: any, depth = 0) {
    if (!node || depth > 8 || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const n of node) walk(n, depth + 1); return; }
    // Um "post" tem code/shortcode + alguma mídia
    const code = node.code || node.shortcode;
    const hasMedia = node.video_url || node.video_versions || node.image_versions2 || node.display_url || node.carousel_media;
    if (typeof code === 'string' && hasMedia && !seen.has(code)) {
      seen.add(code);
      items.push(node);
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && (Array.isArray(v) || typeof v === 'object')) walk(v, depth + 1);
    }
  }
  walk(payload);

  const nextMaxId =
    payload?.next_max_id ??
    payload?.data?.next_max_id ??
    payload?.result?.next_max_id ??
    payload?.paging?.next_max_id ??
    payload?.maxId ??
    null;

  return { items, nextMaxId: nextMaxId ? String(nextMaxId) : null };
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
    const maxPages: number = Math.min(Math.max(parseInt(body?.maxPages ?? '1', 10) || 1, 1), 5);
    const rawList: string[] = Array.isArray(body?.urls) ? body.urls : (body?.url ? [body.url] : []);

    // Separa entradas em usernames e shortcodes soltos
    const usernames = new Set<string>();
    const looseShortcodes = new Set<string>();
    for (const raw of rawList) {
      const sc = extractShortcode(raw);
      if (sc) { looseShortcodes.add(sc); continue; }
      const un = extractUsername(raw);
      if (un) usernames.add(un);
    }

    const results: any[] = [];
    let imported = 0, skipped = 0, failed = 0;

    // ===== 1) Perfis (fluxo principal) =====
    for (const username of usernames) {
      try {
        // Só precisamos do model antes de iterar posts
        const model = await ensureModel(admin, username, {}, visibility);

        let maxId = '';
        let pagesDone = 0;
        while (pagesDone < maxPages) {
          const page = await fetchUserPosts(username, maxId);
          const { items, nextMaxId } = extractPostsPage(page);
          if (items.length === 0) break;

          // Dedup ANTES de baixar mídia (economiza banda; RapidAPI já foi paga na página)
          const codes = items.map((it) => it.code || it.shortcode).filter(Boolean);
          const { data: exist } = await admin
            .from('ig_feed_videos')
            .select('ig_shortcode')
            .in('ig_shortcode', codes);
          const existSet = new Set((exist ?? []).map((r: any) => r.ig_shortcode));

          for (const item of items) {
            const sc = item.code || item.shortcode;
            if (!sc) continue;
            if (existSet.has(sc)) {
              skipped++;
              results.push({ username, shortcode: sc, status: 'skipped' });
              continue;
            }
            try {
              const out = await persistPost(admin, model, sc, item, visibility, userId);
              imported++;
              results.push({ username, slug: model.slug, shortcode: sc, status: 'ok', ...out });
            } catch (e: any) {
              failed++;
              console.error('[ig-import] post', sc, e?.message ?? e);
              results.push({ username, shortcode: sc, status: 'error', error: e?.message ?? String(e) });
            }
          }

          pagesDone++;
          if (!nextMaxId) break;
          maxId = nextMaxId;
        }
      } catch (e: any) {
        failed++;
        console.error('[ig-import] username', username, e?.message ?? e);
        results.push({ username, status: 'error', error: e?.message ?? String(e) });
      }
    }

    // ===== 2) Shortcodes soltos (compatibilidade — mediaByShortcode) =====
    if (looseShortcodes.size > 0) {
      const scArr = Array.from(looseShortcodes);
      const { data: existRows } = await admin
        .from('ig_feed_videos')
        .select('ig_shortcode')
        .in('ig_shortcode', scArr);
      const existSet = new Set((existRows ?? []).map((r: any) => r.ig_shortcode));

      const modelCache = new Map<string, { id: string; slug: string }>();
      for (const sc of scArr) {
        if (existSet.has(sc)) {
          skipped++;
          results.push({ shortcode: sc, status: 'skipped' });
          continue;
        }
        try {
          const raw = await fetchMediaByShortcode(sc);
          const owner = extractOwner(raw);
          if (!owner.username) throw new Error('Não foi possível identificar o dono do post.');
          let model = modelCache.get(owner.username);
          if (!model) {
            model = await ensureModel(admin, owner.username, {
              full_name: owner.full_name, pic: owner.pic, pk: owner.pk,
            }, visibility);
            modelCache.set(owner.username, model);
          }
          // O payload do mediaByShortcode costuma ter items[0] ou shortcode_media como nó do post
          const d = raw?.data ?? raw;
          const postNode = d?.items?.[0] ?? d?.item ?? d?.shortcode_media ?? d?.media ?? d;
          const out = await persistPost(admin, model, sc, postNode, visibility, userId);
          imported++;
          results.push({ username: owner.username, slug: model.slug, shortcode: sc, status: 'ok', ...out });
        } catch (e: any) {
          failed++;
          console.error('[ig-import] loose', sc, e?.message ?? e);
          results.push({ shortcode: sc, status: 'error', error: e?.message ?? String(e) });
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        imported, skipped, failed,
        total: imported + skipped + failed,
        usernames: Array.from(usernames),
        results,
      }),
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
