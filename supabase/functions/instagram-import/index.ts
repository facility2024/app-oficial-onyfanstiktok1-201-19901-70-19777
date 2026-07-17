// Edge Function: instagram-import
// Provider: instagram120 (RapidAPI) — POST em todos os endpoints.
// Regra de cobrança: 1 requisição por link, para sempre.
//   - Antes de chamar mediaByShortcode: checa ig_feed_videos.ig_shortcode
//   - Antes de chamar userInfo: checa ig_models.ig_username
// Se já existe, retorna dados salvos (Bunny CDN) sem cobrar RapidAPI.
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
  if (/^[A-Za-z0-9_-]{5,20}$/.test(s) && !s.includes('/')) return s;
  const m = s.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

function extractUsername(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
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

// Extrai recursivamente URLs .mp4 e imagens HD do objeto do post.
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

  function walk(node: any, ctx: any = {}) {
    if (!node) return;
    if (Array.isArray(node)) { for (const n of node) walk(n, ctx); return; }
    if (typeof node !== 'object') return;

    // Vídeo
    const vurl = node.video_url
      || node.video_versions?.[0]?.url
      || (Array.isArray(node.video_versions) ? node.video_versions[0]?.url : undefined);
    if (vurl && typeof vurl === 'string') {
      const thumb = node.thumbnail_url
        || node.display_url
        || node.image_versions2?.candidates?.[0]?.url
        || node.thumbnail_src;
      pushVideo(vurl, thumb, node.original_width || node.width, node.original_height || node.height, node.video_duration || node.duration);
    }

    // Imagem HD (só quando NÃO é nó de vídeo)
    if (!vurl) {
      const iurl = node.display_url
        || node.image_versions2?.candidates?.[0]?.url
        || node.thumbnail_src;
      if (iurl && typeof iurl === 'string' && /^https?:/.test(iurl)) {
        // evita coletar avatares dentro do objeto
        if (!/profile_pic|s150x150|s320x320/i.test(iurl)) {
          pushImage(iurl, node.original_width || node.width, node.original_height || node.height);
        }
      }
    }

    // Percorre filhos comuns
    for (const key of ['carousel_media', 'carousel_media_v2', 'edge_sidecar_to_children', 'edges', 'node', 'items', 'item', 'data', 'media', 'shortcode_media']) {
      if (node[key]) walk(node[key], ctx);
    }
    // fallback: percorre todas as chaves objeto/array
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && (Array.isArray(v) || typeof v === 'object')) walk(v, ctx);
    }
  }

  walk(root);
  return out;
}

function extractOwner(root: any): { username: string; full_name?: string; pic?: string; pk?: string } {
  const candidates: any[] = [];
  const d = root?.data ?? root;
  const item = d?.items?.[0] ?? d?.item ?? d?.shortcode_media ?? d?.media ?? d;
  candidates.push(item?.user, item?.owner, item?.caption?.user, d?.user, d?.owner, root?.user, root?.owner);

  // Deep search fallback: procura qualquer objeto com username
  function findUser(node: any, depth = 0): any {
    if (!node || depth > 6 || typeof node !== 'object') return null;
    if (typeof node.username === 'string' && node.username.length > 0 && (node.profile_pic_url || node.pk || node.id || node.full_name !== undefined)) {
      return node;
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && typeof v === 'object') {
        const found = findUser(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  let u: any = candidates.find((c) => c && typeof c.username === 'string' && c.username);
  if (!u) u = findUser(root);
  u = u ?? {};

  return {
    username: (u?.username || '').toLowerCase(),
    full_name: u?.full_name,
    pic: u?.profile_pic_url_hd || u?.profile_pic_url,
    pk: u?.pk ? String(u.pk) : u?.id ? String(u.id) : undefined,
  };
}

function extractCaption(root: any): string {
  const d = root?.data ?? root;
  const item = d?.items?.[0] ?? d?.item ?? d?.shortcode_media ?? d;
  return item?.caption?.text
    ?? (typeof item?.caption === 'string' ? item.caption : '')
    ?? item?.edge_media_to_caption?.edges?.[0]?.node?.text
    ?? '';
}

function extractMediaId(root: any): string | undefined {
  const d = root?.data ?? root;
  const item = d?.items?.[0] ?? d?.item ?? d?.shortcode_media ?? d;
  return item?.id ? String(item.id) : item?.pk ? String(item.pk) : undefined;
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

// Garante ig_models: só chama userInfo na PRIMEIRA vez que o username aparece.
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
    // Preenche buracos sem chamar RapidAPI de novo
    const patch: any = {};
    if (!existing.slug) patch.slug = slug;
    if (!existing.display_name && hint.full_name) patch.display_name = hint.full_name;
    if (!existing.ig_user_id && hint.pk) patch.ig_user_id = hint.pk;
    if (Object.keys(patch).length) await admin.from('ig_models').update(patch).eq('id', existing.id);
    return { id: existing.id, slug: existing.slug || slug };
  }

  // PRIMEIRA vez → 1 chamada userInfo (só se ainda não temos avatar HD).
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
    console.warn('[ig-import] userInfo falhou, seguindo com dados do post:', (e as Error).message);
  }

  // Baixa avatar HD para Bunny (best-effort)
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
    const providedUsername = extractUsername(body?.username ?? '');

    if (!providedUsername) {
      return new Response(JSON.stringify({ error: 'Campo "username" da modelo é obrigatório (o instagram120/mediaByShortcode não retorna o dono).' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Só extrai shortcodes dos links.
    const shortcodes: string[] = [];
    for (const raw of rawList) {
      const sc = extractShortcode(raw);
      if (sc) shortcodes.push(sc);
    }
    const uniqSc = Array.from(new Set(shortcodes));

    const results: any[] = [];
    let imported = 0, skipped = 0, failed = 0;

    // 1) Garante o perfil da modelo (1 chamada userInfo só na primeira vez).
    let model: { id: string; slug: string };
    try {
      model = await ensureModel(admin, providedUsername, {}, visibility);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `Falha ao preparar perfil @${providedUsername}: ${e?.message ?? e}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (uniqSc.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, imported: 0, skipped: 0, failed: 0, total: 0, results: [{ username: providedUsername, status: 'model_ready', model_id: model.id, slug: model.slug }] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2) Shortcodes — dedup ANTES de chamar RapidAPI.
    {
      const { data: existingRows } = await admin
        .from('ig_feed_videos')
        .select('ig_shortcode')
        .in('ig_shortcode', uniqSc);
      const existingSet = new Set((existingRows ?? []).map((r: any) => r.ig_shortcode));

      for (const sc of uniqSc) {
        if (existingSet.has(sc)) {
          skipped++;
          results.push({ shortcode: sc, status: 'skipped' });
          continue;
        }
        try {
          const raw = await fetchMediaByShortcode(sc);
          const media = collectMedia(raw);
          if (media.length === 0) throw new Error('Post sem mídia utilizável');

          // Usa o `model` garantido antes do loop (evita nova chamada userInfo).
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
            const path = `${BUNNY_ROOT}/${model.slug}/${subdir}/${sc}${suffix}.${ext}`;
            await streamToBunny(m.url, path);
            const cdn = `https://${BUNNY_PULL}/${path}`;

            let thumbCdn: string | undefined;
            if (m.kind === 'video' && m.thumb) {
              try {
                const tp = `${BUNNY_ROOT}/${model.slug}/posters/${sc}${suffix}.jpg`;
                await streamToBunny(m.thumb, tp);
                thumbCdn = `https://${BUNNY_PULL}/${tp}`;
              } catch (_) { /* best-effort */ }
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

          const { data: inserted, error: iErr } = await admin
            .from('ig_feed_videos')
            .insert({
              ig_model_id: model.id,
              ig_shortcode: sc,
              ig_media_id: extractMediaId(raw) ?? null,
              source_url: `https://www.instagram.com/p/${sc}/`,
              bunny_path: mainBunnyPath,
              video_url: mainVideoUrl,
              thumbnail_url: mainThumbUrl,
              caption: extractCaption(raw) ?? null,
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
          imported++;
          results.push({
            shortcode: sc, status: 'ok', id: inserted.id,
            username: providedUsername, slug: model.slug, post_type, media_count: mediaOut.length,
          });
        } catch (e: any) {
          failed++;
          console.error('[ig-import]', sc, e?.message ?? e);
          results.push({ shortcode: sc, status: 'error', error: e?.message ?? String(e) });
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, imported, skipped, failed, total: uniqSc.length, username: providedUsername, slug: model.slug, results }),
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
