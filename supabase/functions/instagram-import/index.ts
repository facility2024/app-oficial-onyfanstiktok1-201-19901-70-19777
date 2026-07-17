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
    signal: AbortSignal.timeout(20000),
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

  function firstUrl(value: any): string | undefined {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = firstUrl(item);
        if (found) return found;
      }
    }
    if (value && typeof value === 'object') {
      for (const key of ['url', 'src', 'uri', 'download_url', 'downloadUrl']) {
        const found = firstUrl(value[key]);
        if (found) return found;
      }
    }
    return undefined;
  }

  function walk(node: any, parentKey = '') {
    if (!node) return;
    if (Array.isArray(node)) { for (const n of node) walk(n, parentKey); return; }
    if (typeof node !== 'object') return;

    const vurl = node.video_url
      || node.videoUrl
      || node.video_uri
      || node.videoUri
      || node.play_url
      || node.playUrl
      || node.download_url
      || node.downloadUrl
      || firstUrl(node.video_versions)
      || firstUrl(node.videoVersions)
      || ((node.media_type === 2 || node.mediaType === 2 || node.type === 'video') ? firstUrl(node.url ?? node.src ?? node.uri) : undefined);
    if (vurl && typeof vurl === 'string') {
      const thumb = node.thumbnail_url
        || node.thumbnailUrl
        || node.display_url
        || node.displayUrl
        || node.cover_url
        || node.coverUrl
        || node.image_versions2?.candidates?.[0]?.url
        || node.imageVersions2?.candidates?.[0]?.url
        || node.thumbnail_src;
      pushVideo(vurl, thumb, node.original_width || node.width, node.original_height || node.height, node.video_duration || node.duration);
    }

    if (!vurl) {
      const iurl = node.display_url
        || node.displayUrl
        || node.image_url
        || node.imageUrl
        || node.thumbnail_url
        || node.thumbnailUrl
        || node.image_versions2?.candidates?.[0]?.url
        || node.imageVersions2?.candidates?.[0]?.url
        || firstUrl(node.images)
        || node.thumbnail_src;
      if (iurl && typeof iurl === 'string' && /^https?:/.test(iurl)) {
        if (!/profile_pic|s150x150|s320x320/i.test(iurl)) {
          pushImage(iurl, node.original_width || node.width, node.original_height || node.height);
        }
      }
    }

    for (const k of Object.keys(node)) {
      const v = node[k];
      const normalizedKey = k.replace(/[^a-z]/gi, '').toLowerCase();
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
        if (/video|play|download/.test(normalizedKey) || (/url|src|uri/.test(normalizedKey) && /video|clips?|reels?/.test(parentKey))) {
          pushVideo(v);
        } else if (/image|display|thumbnail|cover|photo/.test(normalizedKey) && !/profile|avatar/.test(normalizedKey)) {
          pushImage(v);
        }
      } else if (v && (Array.isArray(v) || typeof v === 'object')) {
        walk(v, `${parentKey}.${normalizedKey}`);
      }
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

// O instagram120 muda o envelope entre versões. Nunca selecionar `media`
// quando ele for apenas uma string (ex.: "video"), pois isso descartava o
// objeto real que contém video_versions/image_versions2.
function extractPostNode(payload: any): any {
  const candidates = [
    payload?.data?.xdt_shortcode_media,
    payload?.data?.shortcode_media,
    payload?.data?.items?.[0],
    payload?.data?.item,
    payload?.data?.media,
    payload?.result?.xdt_shortcode_media,
    payload?.result?.shortcode_media,
    payload?.result?.items?.[0],
    payload?.items?.[0],
    payload?.item,
    payload?.shortcode_media,
    payload?.media,
  ];
  return candidates.find((candidate) => candidate && typeof candidate === 'object') ?? payload;
}

function findPostByShortcode(payload: any, shortcode: string): any | null {
  let match: any = null;
  function walk(node: any, depth = 0) {
    if (match || !node || depth > 10 || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    const code = node.code ?? node.shortcode;
    if (code === shortcode) {
      match = node;
      return;
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') walk(value, depth + 1);
    }
  }
  walk(payload);
  return match;
}

// ============ Bunny ============
async function streamToBunny(sourceUrl: string, bunnyPath: string): Promise<void> {
  const src = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
  if (!src.ok || !src.body) throw new Error(`fetch media ${src.status}`);
  const put = await fetch(`https://${BUNNY_HOST}/${BUNNY_ZONE}/${bunnyPath}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'application/octet-stream' },
    body: src.body,
    signal: AbortSignal.timeout(30000),
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

// ============ Vincula ig_model a um models (feed do app) ============
async function ensureAppModel(
  admin: any,
  igModel: { id: string; slug: string },
  hint: { ig_username: string; display_name?: string | null; avatar_url?: string | null },
): Promise<string | null> {
  // 1) já existe vínculo salvo no metadata?
  const { data: current } = await admin
    .from('ig_models')
    .select('metadata, display_name, avatar_url, ig_username')
    .eq('id', igModel.id)
    .maybeSingle();

  const linkedId = current?.metadata?.linked_model_id;
  if (linkedId) {
    // mantém avatar/nome sincronizados
    await admin.from('models').update({
      avatar_url: current?.avatar_url ?? hint.avatar_url ?? null,
      name: current?.display_name || hint.display_name || hint.ig_username,
      updated_at: new Date().toISOString(),
    }).eq('id', linkedId);
    return linkedId;
  }

  // 2) tenta achar um models existente com o mesmo username (ig_<slug>)
  const appUsername = `ig_${igModel.slug}`.slice(0, 40);
  const displayName = current?.display_name || hint.display_name || hint.ig_username;
  const avatar = current?.avatar_url || hint.avatar_url || null;

  let modelRow: any = null;
  const { data: found } = await admin
    .from('models')
    .select('id')
    .eq('username', appUsername)
    .maybeSingle();
  if (found) {
    modelRow = found;
  } else {
    const { data: created, error } = await admin
      .from('models')
      .insert({
        name: displayName,
        username: appUsername,
        avatar_url: avatar,
        bio: current?.bio ?? null,
        category: 'Instagram',
        is_active: true,
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[ig-import] models insert falhou:', error.message);
      return null;
    }
    modelRow = created;
  }

  // 3) grava o vínculo em ig_models.metadata para não repetir lookup
  const meta = { ...(current?.metadata ?? {}), linked_model_id: modelRow.id };
  await admin.from('ig_models').update({ metadata: meta }).eq('id', igModel.id);

  return modelRow.id as string;
}

async function pushToAppFeed(
  admin: any,
  appModelId: string,
  shortcode: string,
  videoUrl: string,
  thumbUrl: string | null,
  caption: string | null,
  durationSec: number | null,
  width: number | null,
  height: number | null,
  visibility: 'public' | 'private',
) {
  // evita duplicar se já postamos esse shortcode antes
  const { data: dup } = await admin
    .from('videos')
    .select('id')
    .eq('model_id', appModelId)
    .eq('upload_source', 'instagram')
    .ilike('description', `%${shortcode}%`)
    .maybeSingle();
  if (dup) return dup.id;

  const title = (caption || '').replace(/\s+/g, ' ').trim().slice(0, 80) || `Instagram · ${shortcode}`;
  const dur = durationSec && durationSec > 0
    ? `${Math.floor(durationSec / 60)}:${String(Math.round(durationSec % 60)).padStart(2, '0')}`
    : '0:15';

  const { data: v, error } = await admin
    .from('videos')
    .insert({
      model_id: appModelId,
      title,
      description: `[ig:${shortcode}] ${caption ?? ''}`.trim(),
      thumbnail_url: thumbUrl || videoUrl,
      video_url: videoUrl,
      duration: dur,
      aspect_ratio: '9:16',
      is_active: true,
      is_premium: visibility === 'private',
      visibility: visibility === 'private' ? 'private' : 'public',
      category: 'Instagram',
      upload_source: 'instagram',
    })
    .select('id')
    .single();
  if (error) {
    console.warn('[ig-import] videos insert falhou:', error.message);
    return null;
  }
  return v.id as string;
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

  // Espelha no feed principal do app (tabela videos) — só vídeos
  if (post_type === 'video' && mainVideoUrl) {
    try {
      const appModelId = await ensureAppModel(admin, model, {
        ig_username: (postNode?.owner?.username || model.slug),
        display_name: postNode?.owner?.full_name ?? null,
        avatar_url: postNode?.owner?.profile_pic_url ?? null,
      });
      if (appModelId) {
        await pushToAppFeed(
          admin,
          appModelId,
          shortcode,
          mainVideoUrl,
          mainThumbUrl,
          extractCaption(postNode) ?? null,
          media[0]?.duration ?? null,
          media[0]?.width ?? null,
          media[0]?.height ?? null,
          visibility,
        );
      }
    } catch (e) {
      console.warn('[ig-import] espelhar no feed falhou:', (e as Error).message);
    }
  }

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

async function refreshJobTotals(admin: any, jobId: string) {
  const { data: items } = await admin
    .from('ig_import_items')
    .select('status')
    .eq('job_id', jobId);
  const rows = items ?? [];
  const imported = rows.filter((x: any) => x.status === 'imported').length;
  const skipped = rows.filter((x: any) => x.status === 'skipped').length;
  const failed = rows.filter((x: any) => x.status === 'failed').length;
  const processed = imported + skipped + failed;
  const pending = rows.some((x: any) => ['pending', 'retry', 'processing'].includes(x.status));
  await admin.from('ig_import_jobs').update({
    total_items: rows.length,
    processed_items: processed,
    imported_items: imported,
    skipped_items: skipped,
    failed_items: failed,
    status: pending ? 'processing' : (failed > 0 ? 'completed_with_errors' : 'completed'),
    finished_at: pending ? null : new Date().toISOString(),
  }).eq('id', jobId);
  return pending;
}

async function dispatchWorker(jobId: string, delayMs = 500) {
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  const response = await fetch(`${SUPABASE_URL}/functions/v1/instagram-import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'x-instagram-worker': 'internal',
    },
    body: JSON.stringify({ action: 'process', jobId }),
  });
  await response.text();
}

async function processNextItem(admin: any, jobId: string) {
  const now = new Date().toISOString();
  const { data: job } = await admin.from('ig_import_jobs').select('*').eq('id', jobId).maybeSingle();
  if (!job || ['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(job.status)) return false;

  const { data: item } = await admin
    .from('ig_import_items')
    .select('*')
    .eq('job_id', jobId)
    .in('status', ['pending', 'retry'])
    .lte('next_attempt_at', now)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!item) {
    const pending = await refreshJobTotals(admin, jobId);
    if (pending) EdgeRuntime.waitUntil(dispatchWorker(jobId, 11000));
    return false;
  }

  await admin.from('ig_import_items').update({
    status: 'processing', locked_at: now, attempts: item.attempts + 1,
  }).eq('id', item.id).in('status', ['pending', 'retry']);
  await admin.from('ig_import_jobs').update({ status: 'processing', started_at: job.started_at ?? now }).eq('id', jobId);

  try {
    const { data: duplicate } = await admin.from('ig_feed_videos').select('id').eq('ig_shortcode', item.shortcode).maybeSingle();
    if (duplicate) {
      await admin.from('ig_import_items').update({ status: 'skipped', result_video_id: duplicate.id, last_error: null }).eq('id', item.id);
    } else {
      let model: { id: string; slug: string } | null = null;
      if (item.ig_model_id) {
        const { data } = await admin.from('ig_models').select('id, slug').eq('id', item.ig_model_id).maybeSingle();
        model = data;
      }
      if (!model && item.username) model = await ensureModel(admin, item.username, {}, item.visibility);
      if (!model) throw new Error('Modelo não encontrada para o post');
      const out = await persistPost(admin, model, item.shortcode, item.source_payload, item.visibility, job.requested_by);
      await admin.from('ig_import_items').update({ status: 'imported', result_video_id: out.id, last_error: null }).eq('id', item.id);
    }
  } catch (error: any) {
    const attempts = item.attempts + 1;
    const retry = attempts < item.max_attempts;
    await admin.from('ig_import_items').update({
      status: retry ? 'retry' : 'failed',
      next_attempt_at: new Date(Date.now() + Math.min(60_000, 5000 * (2 ** (attempts - 1)))).toISOString(),
      last_error: error?.message ?? String(error),
      locked_at: null,
    }).eq('id', item.id);
  }

  const pending = await refreshJobTotals(admin, jobId);
  if (pending) EdgeRuntime.waitUntil(dispatchWorker(jobId, 5500));
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json();
    const isInternal = req.headers.get('x-instagram-worker') === 'internal'
      && authHeader === `Bearer ${SERVICE_ROLE}`;
    if (isInternal && body?.action === 'process' && typeof body?.jobId === 'string') {
      await processNextItem(admin, body.jobId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    const { data: job, error: jobError } = await admin.from('ig_import_jobs').insert({
      requested_by: userId,
      inputs: rawList,
      visibility,
      max_pages: maxPages,
      status: 'discovering',
      started_at: new Date().toISOString(),
    }).select('id').single();
    if (jobError) throw new Error(`Fila: ${jobError.message}`);

    const queued: any[] = [];
    const directInserts: any[] = [];
    let skipped = 0, failed = 0, imported = 0;

    function buildDirectRow(model: { id: string }, shortcode: string, postNode: any) {
      const media = collectMedia(postNode);
      if (media.length === 0) return null;
      const post_type: 'video' | 'image' | 'carousel' =
        media.length > 1 ? 'carousel' : (media[0].kind === 'video' ? 'video' : 'image');
      const first = media[0];
      const mediaOut = media.map((m) => ({
        kind: m.kind, url: m.url, thumb: m.thumb ?? null,
        width: m.width ?? null, height: m.height ?? null, duration: m.duration ?? null,
      }));
      return {
        ig_model_id: model.id,
        ig_shortcode: shortcode,
        ig_media_id: postNode?.id ? String(postNode.id) : postNode?.pk ? String(postNode.pk) : null,
        source_url: `https://www.instagram.com/p/${shortcode}/`,
        bunny_path: null,
        video_url: first.url,
        thumbnail_url: first.thumb ?? (first.kind === 'image' ? first.url : null),
        caption: extractCaption(postNode) ?? null,
        duration_seconds: first.duration ?? null,
        width: first.width ?? null,
        height: first.height ?? null,
        visibility,
        post_type,
        media: mediaOut,
        imported_by: userId,
      };
    }

    // ===== 1) Perfis (fluxo principal) =====
    for (const username of usernames) {
      try {
        const model = await ensureModel(admin, username, {}, visibility);

        let maxId = '';
        let pagesDone = 0;
        while (pagesDone < maxPages) {
          const page = await fetchUserPosts(username, maxId);
          const { items, nextMaxId } = extractPostsPage(page);
          if (items.length === 0) break;

          const codes = items.map((it) => it.code || it.shortcode).filter(Boolean);
          const { data: exist } = await admin
            .from('ig_feed_videos')
            .select('ig_shortcode')
            .in('ig_shortcode', codes);
          const existSet = new Set((exist ?? []).map((r: any) => r.ig_shortcode));

          for (const item of items) {
            const sc = item.code || item.shortcode;
            if (!sc) continue;
            if (existSet.has(sc)) { skipped++; continue; }
            const row = buildDirectRow(model, sc, item);
            if (row) directInserts.push(row);
            else failed++;
          }

          pagesDone++;
          if (!nextMaxId) break;
          maxId = nextMaxId;
        }
      } catch (e: any) {
        failed++;
        console.error('[ig-import] username', username, e?.message ?? e);
      }
    }

    // ===== 2) Shortcodes soltos =====
    if (looseShortcodes.size > 0) {
      const scArr = Array.from(looseShortcodes);
      const { data: existRows } = await admin
        .from('ig_feed_videos')
        .select('ig_shortcode')
        .in('ig_shortcode', scArr);
      const existSet = new Set((existRows ?? []).map((r: any) => r.ig_shortcode));

      const modelCache = new Map<string, { id: string; slug: string }>();
      for (const sc of scArr) {
        if (existSet.has(sc)) { skipped++; continue; }
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
          let postNode = extractPostNode(raw);
          if (collectMedia(postNode).length === 0) {
            const postsPayload = await fetchUserPosts(owner.username, '');
            postNode = findPostByShortcode(postsPayload, sc) ?? extractPostNode(postsPayload);
          }
          const row = buildDirectRow(model, sc, postNode);
          if (row) directInserts.push(row);
          else { failed++; console.error('[ig-import] loose sem mídia', sc); }
        } catch (e: any) {
          failed++;
          console.error('[ig-import] loose', sc, e?.message ?? e);
        }
      }
    }

    // Insert direto — vídeos aparecem imediatamente
    if (directInserts.length > 0) {
      const { data: ins, error: insErr } = await admin
        .from('ig_feed_videos')
        .insert(directInserts)
        .select('id');
      if (insErr) {
        console.error('[ig-import] direct insert', insErr.message);
        failed += directInserts.length;
      } else {
        imported = ins?.length ?? directInserts.length;
      }
    }

    await admin.from('ig_import_jobs').update({
      status: failed > 0 ? 'completed_with_errors' : 'completed',
      total_items: imported + skipped + failed,
      imported_items: imported,
      skipped_items: skipped,
      failed_items: failed,
      processed_items: imported + skipped + failed,
      finished_at: new Date().toISOString(),
    }).eq('id', job.id);


    return new Response(
      JSON.stringify({
        ok: true, queued: 0, imported, skipped, failed, jobId: job.id,
        total: imported + skipped + failed,
        usernames: Array.from(usernames),
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
