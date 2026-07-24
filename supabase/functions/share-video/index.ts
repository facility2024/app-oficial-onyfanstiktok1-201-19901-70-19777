import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview|redditbot|Googlebot|bingbot|Applebot|iframely|vkShare/i;
const APP_ORIGIN = "https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const videoId = parts[parts.length - 1] ?? "";
  const ua = req.headers.get("user-agent") ?? "";

  if (!UUID_RE.test(videoId)) {
    return Response.redirect(`${APP_ORIGIN}/app`, 302);
  }

  const target = `${APP_ORIGIN}/app?video=${videoId}`;

  // Humano → redireciona direto pro app
  if (!BOT_UA.test(ua)) {
    return Response.redirect(target, 302);
  }

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: video } = await supa
      .from("videos")
      .select("id, title, description, thumbnail_url, creator_id, model_id")
      .eq("id", videoId)
      .maybeSingle();

    let name = "CocoNudi";
    let avatar = `${APP_ORIGIN}/default-avatar.svg`;

    if (video?.creator_id) {
      const { data: p } = await supa
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", video.creator_id)
        .maybeSingle();
      name = p?.full_name || p?.username || name;
      avatar = p?.avatar_url || avatar;
    } else if (video?.model_id) {
      const { data: m } = await supa
        .from("models")
        .select("name, avatar_url")
        .eq("id", video.model_id)
        .maybeSingle();
      name = m?.name || name;
      avatar = m?.avatar_url || avatar;
    }

    const title = `${name} no CocoNudi 🔥`;
    const desc = video?.title || video?.description || "Assista agora no CocoNudi";
    const image = video?.thumbnail_url || avatar;

    const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${target}">
<meta property="og:type" content="video.other">
<meta property="og:site_name" content="CocoNudi">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1080">
<meta property="og:image:height" content="1920">
<meta property="og:url" content="${target}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<meta http-equiv="refresh" content="0; url=${target}">
</head><body><a href="${target}">Abrir no CocoNudi</a></body></html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("share-video error:", err);
    return Response.redirect(target, 302);
  }
});
