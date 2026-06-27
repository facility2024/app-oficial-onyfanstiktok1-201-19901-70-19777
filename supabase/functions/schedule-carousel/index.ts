import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type ScheduleCarouselBody = {
  model_search?: string;
  selected_model_id?: string | null;
  avatar_url?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  imagens?: string[];
  audio_url?: string | null;
  data_agendamento?: string;
  enviar_tela_principal?: boolean;
  enviar_perfil_modelo?: boolean;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanUrl = (value?: string | null) => (value || "").trim();

const normalizeUsername = (value: string) => {
  const raw = value.trim().replace(/^@/, "");
  const username = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return {
    raw: raw || username || `modelo_${Date.now()}`,
    username: username || `modelo_${Date.now()}`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Método não permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return json({ success: false, error: "Login obrigatório" }, 401);
    }

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;

    if (userError || !user) {
      return json({ success: false, error: "Sessão inválida" }, 401);
    }

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const { data: isCreator } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "creator",
    });

    if (!isAdmin && !isCreator) {
      return json({ success: false, error: "Acesso negado" }, 403);
    }

    const creatorMode = !isAdmin && isCreator;

    const body = (await req.json()) as ScheduleCarouselBody;
    const imagens = (body.imagens || []).map(cleanUrl).filter(Boolean);
    const scheduledAt = body.data_agendamento ? new Date(body.data_agendamento) : null;

    if (!body.selected_model_id && !cleanUrl(body.model_search)) {
      return json({ success: false, error: "Informe a modelo" }, 400);
    }

    if (imagens.length === 0) {
      return json({ success: false, error: "Adicione pelo menos uma imagem" }, 400);
    }

    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return json({ success: false, error: "Data e hora inválidas" }, 400);
    }

    let currentModel: { id: string; username: string; name: string } | null = null;

    if (body.selected_model_id) {
      const { data: existingModel, error: modelError } = await admin
        .from("models")
        .select("id, username, name")
        .eq("id", body.selected_model_id)
        .maybeSingle();

      if (modelError) throw modelError;
      if (!existingModel) {
        return json({ success: false, error: "Modelo selecionada não encontrada" }, 404);
      }

      currentModel = existingModel;
    } else {
      const { raw, username } = normalizeUsername(body.model_search || "");

      const { data: existingModel, error: existingError } = await admin
        .from("models")
        .select("id, username, name")
        .ilike("username", username)
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingModel) {
        currentModel = existingModel;
      } else {
        const { data: createdModel, error: createError } = await admin
          .from("models")
          .insert({
            username,
            name: raw || username,
            avatar_url: cleanUrl(body.avatar_url) || null,
            is_active: true,
          })
          .select("id, username, name")
          .single();

        if (createError) throw createError;
        currentModel = createdModel;
      }
    }

    if (!currentModel) {
      return json({ success: false, error: "Não foi possível definir a modelo" }, 500);
    }

    if (cleanUrl(body.avatar_url)) {
      const { error: avatarError } = await admin
        .from("models")
        .update({ avatar_url: cleanUrl(body.avatar_url) })
        .eq("id", currentModel.id);

      if (avatarError) throw avatarError;
    }

    const { data: post, error: postError } = await admin
      .from("posts_agendados")
      .insert({
        modelo_id: currentModel.id,
        modelo_username: currentModel.username,
        titulo: cleanUrl(body.titulo) || "Galeria",
        descricao: body.descricao || "",
        conteudo_url: imagens[0],
        imagens,
        audio_url: cleanUrl(body.audio_url) || null,
        tipo_conteudo: "carrossel",
        data_agendamento: scheduledAt.toISOString(),
        status: "agendado",
        enviar_tela_principal: body.enviar_tela_principal !== false,
        enviar_perfil_modelo: body.enviar_perfil_modelo !== false,
      })
      .select("id, modelo_id, modelo_username, titulo, status, data_agendamento")
      .single();

    if (postError) throw postError;

    return json({ success: true, post, model: currentModel });
  } catch (error) {
    console.error("Erro em schedule-carousel:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao agendar carrossel",
      },
      500,
    );
  }
});