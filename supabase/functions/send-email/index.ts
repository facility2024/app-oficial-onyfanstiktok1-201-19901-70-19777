import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface SendEmailRequest {
  recipient: string;
  subject: string;
  body: string;
  provider?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
    const { recipient, subject, body, provider = 'resend' }: SendEmailRequest = await req.json();

    console.log(`Sending email via ${provider}:`, { recipient, subject });

    // Get RESEND_API_KEY from environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured in environment variables');
    }

    // Get email integration configuration for sender email (get the most recent active one)
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('integration_type', 'gmail')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!integration) {
      throw new Error('Email integration not configured or inactive');
    }

    const config = integration.configuration;
    if (!config.email) {
      throw new Error('Sender email not configured in integration');
    }

    // Initialize Resend with API key from environment
    const resend = new Resend(resendApiKey);
    
    try {
      // Send email using Resend with anti-spam best practices
      const emailResponse = await resend.emails.send({
        from: "COCONUDI <contato@coconudi.com>",
        to: [recipient],
        reply_to: "noreply@coconudi.com",
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${subject}</h1>
              </div>
              <div style="padding: 40px 30px; color: #333; background-color: white;">
                <div style="font-size: 16px; line-height: 1.8;">
                  ${body.replace(/\n/g, '<br>')}
                </div>
              </div>
              <div style="background: #f8f9fa; padding: 25px 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; font-size: 13px; color: #6c757d;">
                  Este email foi enviado por <strong>COCONUDI</strong>
                </p>
                <p style="margin: 8px 0 0 0; font-size: 11px; color: #868e96;">
                  © ${new Date().getFullYear()} COCONUDI. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `${subject}\n\n${body}`,
        headers: {
          'X-Entity-Ref-ID': `coconudi-${Date.now()}`,
        },
      });

      console.log("Resend email response:", emailResponse);

      // CRITICAL: Check for Resend errors before reporting success
      if (emailResponse.error) {
        console.error("Resend send error:", emailResponse.error);
        throw new Error(`Resend error: ${emailResponse.error.message || JSON.stringify(emailResponse.error)}`);
      }

      // Log email attempt
      const { data: emailLog, error: logError } = await supabase
        .from('email_logs')
        .insert({
          integration_id: integration.id,
          recipient_email: recipient,
          subject,
          body,
          status: 'sent',
          provider: 'resend',
          external_id: emailResponse.data?.id || `email_${Date.now()}`,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) {
        console.error("Error logging email:", logError);
        // Don't throw here - email was sent successfully, just logging failed
      }

      // Update integration last used
      await supabase
        .from('integrations')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', integration.id);

      console.log("Email sent successfully:", emailLog?.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sent successfully",
          email_log_id: emailLog?.id,
          external_id: emailResponse.data?.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (resendError: any) {
      console.error("Resend error:", resendError);
      
      // Log failed attempt
      try {
        await supabase.from('email_logs').insert({
          integration_id: integration.id,
          recipient_email: recipient,
          subject,
          body,
          status: 'failed',
          provider: 'resend',
          external_id: `failed_${Date.now()}`,
          sent_at: new Date().toISOString(),
        });
      } catch (_) { /* ignore logging errors */ }

      throw new Error(`Failed to send email via Resend: ${resendError.message}`);
    }

  } catch (error: any) {
    console.error("Error sending email:", error);
    
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