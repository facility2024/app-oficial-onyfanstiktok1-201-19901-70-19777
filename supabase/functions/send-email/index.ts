import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  recipient: string;
  subject: string;
  body: string;
  provider?: string;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { recipient, subject, body }: SendEmailRequest = await req.json();

    // 1. Validate recipient
    if (!recipient || typeof recipient !== "string") {
      throw new Error("Campo 'recipient' é obrigatório");
    }
    const normalizedRecipient = normalizeEmail(recipient);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient)) {
      throw new Error(`Email inválido: ${normalizedRecipient}`);
    }

    // 2. Validate subject & body
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      throw new Error("Campo 'subject' é obrigatório");
    }
    if (!body || typeof body !== "string" || !body.trim()) {
      throw new Error("Campo 'body' é obrigatório");
    }

    console.log(`[send-email] Preparando envio para: ${normalizedRecipient} | Assunto: ${subject}`);

    // 3. Get API key — fail fast with clear message
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada nas secrets do projeto");
    }

    const resend = new Resend(resendApiKey);

    // 4. Build plain-text fallback (strip HTML)
    const plainTextBody = body
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // 5. Build HTML template
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f4;line-height:1.6;">
<div style="max-width:600px;margin:0 auto;background-color:#ffffff;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<div style="background:linear-gradient(135deg,#8B5CF6,#EC4899);padding:30px 20px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">${subject}</h1>
</div>
<div style="padding:40px 30px;color:#333333;background-color:#ffffff;">
<div style="font-size:16px;line-height:1.8;">
${body}
</div>
</div>
<div style="background:#f8f9fa;padding:25px 20px;text-align:center;border-top:1px solid #e9ecef;">
<p style="margin:0;font-size:13px;color:#6c757d;">Este email foi enviado por <strong>COCONUDI</strong></p>
<p style="margin:8px 0 0 0;font-size:11px;color:#868e96;">&copy; ${new Date().getFullYear()} COCONUDI. Todos os direitos reservados.</p>
</div>
</div>
</body>
</html>`;

    // 6. Send with retry (3 attempts, exponential backoff)
    const MAX_RETRIES = 3;
    let lastError: any = null;
    let resendId: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[send-email] Tentativa ${attempt}/${MAX_RETRIES} para ${normalizedRecipient}`);

        const emailResponse = await resend.emails.send({
          from: "COCONUDI <contato@coconudi.com>",
          to: [normalizedRecipient],
          reply_to: "noreply@coconudi.com",
          subject: subject,
          html: htmlContent,
          text: `${subject}\n\n${plainTextBody}`,
          headers: {
            "X-Entity-Ref-ID": `coconudi-${Date.now()}-${attempt}`,
          },
        });

        // Check for Resend-level errors
        if (emailResponse.error) {
          throw new Error(
            `Resend API error: ${emailResponse.error.message || JSON.stringify(emailResponse.error)}`
          );
        }

        resendId = emailResponse.data?.id || null;
        console.log(`[send-email] ✅ Enviado com sucesso na tentativa ${attempt}! ID: ${resendId}`);
        lastError = null;
        break; // Success — exit retry loop
      } catch (retryErr: any) {
        lastError = retryErr;
        console.error(`[send-email] ❌ Tentativa ${attempt} falhou: ${retryErr.message}`);

        // Don't retry on validation errors (4xx)
        if (
          retryErr.message?.includes("validation") ||
          retryErr.message?.includes("invalid") ||
          retryErr.message?.includes("not authorized") ||
          retryErr.message?.includes("Missing")
        ) {
          console.error(`[send-email] Erro de validação — não faz sentido retry`);
          break;
        }

        if (attempt < MAX_RETRIES) {
          const delay = attempt * 2000; // 2s, 4s
          console.log(`[send-email] Aguardando ${delay}ms antes do retry...`);
          await sleep(delay);
        }
      }
    }

    // 7. If all retries failed, throw
    if (lastError) {
      // Log the failure
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabase.from("email_logs").insert({
          recipient_email: normalizedRecipient,
          subject,
          body,
          status: "failed",
          provider: "resend",
          external_id: `failed_${Date.now()}`,
          sent_at: new Date().toISOString(),
        });
      } catch (_) {
        /* ignore log errors */
      }
      throw new Error(`Falha após ${MAX_RETRIES} tentativas: ${lastError.message}`);
    }

    // 8. Log success (non-blocking)
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supabase.from("email_logs").insert({
        recipient_email: normalizedRecipient,
        subject,
        body,
        status: "sent",
        provider: "resend",
        external_id: resendId || `email_${Date.now()}`,
        sent_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn("[send-email] Falha ao registrar log (email foi enviado):", logErr);
    }

    console.log(`[send-email] ✅ Concluído com sucesso para ${normalizedRecipient}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        external_id: resendId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[send-email] ❌ ERRO FINAL:", error.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send email",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
