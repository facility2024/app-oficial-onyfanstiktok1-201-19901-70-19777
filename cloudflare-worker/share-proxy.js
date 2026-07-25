/**
 * Cloudflare Worker — Proxy de compartilhamento CocoNudi
 *
 * Objetivo: esconder a URL feia do Supabase nos links do WhatsApp/Instagram.
 *
 * Rotas:
 *   https://share.coconudi.com/v/:videoId   → share-video edge function
 *   https://share.coconudi.com/p/:identifier → share-profile edge function
 *   https://share.coconudi.com/              → redireciona para o app
 *
 * Como funciona:
 *   - Bots (WhatsApp, Facebook, Twitter, etc) recebem HTML com Open Graph tags
 *     (título, imagem, descrição) buscadas pela edge function.
 *   - Humanos são redirecionados para o app (302).
 *   - A URL visível no card do WhatsApp fica bonita: share.coconudi.com/v/xxx
 */

const SUPABASE_PROJECT = "tnzvhwapfhkhqjgyiomk";
const SUPABASE_BASE = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1`;
const APP_ORIGIN = "https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    // Raiz → manda pro app
    if (parts.length === 0) {
      return Response.redirect(`${APP_ORIGIN}/app`, 302);
    }

    const [prefix, id] = parts;
    let targetFn = null;

    if (prefix === "v" && id) targetFn = "share-video";
    else if (prefix === "p" && id) targetFn = "share-profile";

    if (!targetFn) {
      return Response.redirect(`${APP_ORIGIN}/app`, 302);
    }

    // Proxy pra edge function preservando User-Agent (bot detection depende disso)
    const upstream = `${SUPABASE_BASE}/${targetFn}/${id}`;
    const proxied = await fetch(upstream, {
      method: "GET",
      headers: {
        "User-Agent": request.headers.get("user-agent") ?? "",
        "Accept": request.headers.get("accept") ?? "*/*",
      },
      redirect: "manual", // preservar 302 pro app
    });

    // Se veio redirect (humano), reencaminha
    if (proxied.status >= 300 && proxied.status < 400) {
      const loc = proxied.headers.get("location");
      if (loc) return Response.redirect(loc, 302);
    }

    // Bot: devolve HTML com OG tags (força text/html e remove CSP/sandbox)
    const body = await proxied.text();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'self' https: data:; img-src * data: https:; style-src 'unsafe-inline' *;",
      },
    });
  },
};
