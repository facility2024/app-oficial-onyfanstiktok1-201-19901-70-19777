// Edge Function: bunny-video-upload
//
// MUDANÇA DE SEGURANÇA:
// A chave do Bunny não fica mais hardcoded no bundle do front.
// Esta função autentica o criador, cria o objeto de vídeo no Bunny
// e devolve o GUID + assinatura TUS de uso único (expira em 1h),
// para o cliente fazer upload resumable direto para o Bunny sem
// nunca enxergar a chave.
//
// Endpoints expostos (POST):
//   action: "create"  -> cria vídeo e retorna GUID + signature TUS
//
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FALLBACK_BUNNY_LIBRARY_ID = "558340"; // público (aparece nas URLs do CDN)
const FALLBACK_BUNNY_CDN_HOSTNAME = "vz-2342b018-2d3.b-cdn.net"; // público

function normalizeCdnHostname(value: string | undefined | null): string {
  const raw = (value || FALLBACK_BUNNY_CDN_HOSTNAME).trim();
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Bunny Stream usa uma chave por biblioteca. Priorize o secret específico
    // de Stream para não confundir com Storage Zone/API global.
    const BUNNY_API_KEY =
      Deno.env.get("BUNNY_STREAM_API_KEY") || Deno.env.get("BUNNY_API_KEY");
    const BUNNY_LIBRARY_ID =
      Deno.env.get("BUNNY_STREAM_LIBRARY_ID") || FALLBACK_BUNNY_LIBRARY_ID;
    const BUNNY_CDN_HOSTNAME = normalizeCdnHostname(
      Deno.env.get("BUNNY_STREAM_CDN_URL"),
    );
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!BUNNY_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[bunny-video-upload] Secrets ausentes");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ====== Auth: somente usuários autenticados podem solicitar upload ======
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // ====== Body ======
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = String(body.action || "create");
    const title = String(body.title || `video-${Date.now()}`).slice(0, 200);

    if (action !== "create") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ====== Coleção do criador (organiza vídeos por criador na Bunny) ======
    let collectionId: string | null = null;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("bunny_collection_id, username, full_name")
        .eq("id", userId)
        .maybeSingle();

      collectionId = (profile as any)?.bunny_collection_id || null;

      if (!collectionId) {
        const creatorName =
          (profile as any)?.username ||
          (profile as any)?.full_name ||
          userId.slice(0, 8);
        const colRes = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/collections`,
          {
            method: "POST",
            headers: {
              AccessKey: BUNNY_API_KEY,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ name: `creator-${creatorName}-${userId.slice(0, 8)}` }),
          },
        );
        if (colRes.ok) {
          const colJson = await colRes.json();
          collectionId = colJson?.guid || null;
          if (collectionId) {
            await supabase
              .from("profiles")
              .update({ bunny_collection_id: collectionId })
              .eq("id", userId);
          }
        } else {
          console.error("[bunny-video-upload] Falha ao criar coleção:", await colRes.text());
        }
      }
    } catch (e) {
      console.error("[bunny-video-upload] Erro na coleção:", (e as any)?.message || e);
    }

    // ====== Cria o vídeo no Bunny (dentro da coleção do criador) ======
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(collectionId ? { title, collectionId } : { title }),
      },
    );

    if (!createRes.ok) {
      const txt = await createRes.text();
      console.error("[bunny-video-upload] Falha ao criar vídeo:", txt);
      return new Response(
        JSON.stringify({
          error:
            createRes.status === 401
              ? "Chave Bunny Stream inválida para esta biblioteca"
              : "Falha ao criar vídeo no Bunny",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const created = await createRes.json();
    const videoGuid: string = created.guid;
    if (!videoGuid) {
      return new Response(
        JSON.stringify({ error: "GUID não retornado pelo Bunny" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ====== Assinatura TUS (expira em 1h) ======
    // Bunny TUS: sha256(libraryId + apiKey + expirationTime + videoId)
    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60;
    const signature = await sha256Hex(
      `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expirationTime}${videoGuid}`,
    );

    // Não devolva o playlist.m3u8 direto: quando "Direct Play" está desativado
    // na biblioteca Bunny, esse link retorna 403. O player oficial do Bunny
    // funciona mesmo com o CDN direto bloqueado.
    const videoUrl = `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoGuid}`;
    const thumbnailUrl = `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoGuid}`;

    console.log(
      `[bunny-video-upload] User ${userId} criou vídeo ${videoGuid} (${title})`,
    );

    return new Response(
      JSON.stringify({
        videoGuid,
        libraryId: BUNNY_LIBRARY_ID,
        tusEndpoint: "https://video.bunnycdn.com/tusupload",
        signature,
        expirationTime,
        videoUrl,
        thumbnailUrl,
        cdnPlaylistUrl: `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/playlist.m3u8`,
        cdnThumbnailUrl: `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/thumbnail.jpg`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[bunny-video-upload] Erro:", err?.message || err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
