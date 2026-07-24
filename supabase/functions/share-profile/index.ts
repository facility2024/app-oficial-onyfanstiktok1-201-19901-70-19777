import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview|redditbot|Googlebot|bingbot|Applebot|iframely|vkShare/i;
const APP_ORIGIN = "https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idOrSlug = decodeURIComponent(parts[parts.length - 1] ?? "");
  const ua = req.headers.get("user-agent") ?? "";

  if (!idOrSlug) {
    return Response.redirect(`${APP_ORIGIN}/app`, 302);
  }

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let name = "CocoNudi";
    let avatar = `${APP_ORIGIN}/default-avatar.svg`;
    let bio = "Confira este perfil no CocoNudi";
    let username = "";

    const isUuid = UUID_RE.test(idOrSlug);

    if (isUuid) {
      const { data: m } = await supa
        .from("models")
        .select("name, username, avatar_url, bio")
        .eq("id", idOrSlug)
        .maybeSingle();
      if (m) {
        name = m.name || name;
        username = m.username || slugify(name);
        avatar = m.avatar_url || avatar;
        bio = m.bio || bio;
      } else {
        const { data: p } = await supa
          .from("profiles")
          .select("full_name, username, avatar_url, bio")
          .eq("id", idOrSlug)
          .maybeSingle();
        if (p) {
          name = p.full_name || p.username || name;
          username = p.username || slugify(name);
          avatar = p.avatar_url || avatar;
          bio = p.bio || bio;
        }
      }
    } else {
      const slug = idOrSlug.toLowerCase();
      const { data: m } = await supa
        .from("models")
        .select("name, username, avatar_url, bio")
        .ilike("username", slug)
        .maybeSingle();
      if (m) {
        name = m.name || name;
        username = m.username || slug;
        avatar = m.avatar_url || avatar;
        bio = m.bio || bio;
      } else {
        const { data: p } = await supa
          .from("profiles")
          .select("full_name, username, avatar_url, bio")
          .ilike("username", slug)
          .maybeSingle();
        if (p) {
          name = p.full_name || p.username || name;
          username = p.username || slug;
          avatar = p.avatar_url || avatar;
          bio = p.bio || bio;
        }
      }
    }

    const target = username ? `${APP_ORIGIN}/${username}` : `${APP_ORIGIN}/app`;

    if (!BOT_UA.test(ua)) {
      return Response.redirect(target, 302);
    }

    const title = `${name} no CocoNudi 🔥`;
    const desc = bio;
    // Normaliza host pra minúsculas (WhatsApp/OG scrapers falham com hostname em CAIXA ALTA)
    let image = avatar;
    try {
      const u = new URL(avatar);
      u.hostname = u.hostname.toLowerCase();
      image = u.toString();
    } catch { /* mantém original */ }
    const imageType = /\.png($|\?)/i.test(image) ? "image/png" : "image/jpeg";

    const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${target}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CocoNudi">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:type" content="${imageType}">
<meta property="og:image:width" content="1080">
<meta property="og:image:height" content="1080">
<meta property="og:image:alt" content="${escapeHtml(title)}">
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
    console.error("share-profile error:", err);
    return Response.redirect(`${APP_ORIGIN}/app`, 302);
  }
});
