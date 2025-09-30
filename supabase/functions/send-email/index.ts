import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

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
        from: "OnyTikTok <contato@onyfans.com.br>", // Use verified domain with professional sender
        to: [recipient],
        reply_to: "noreply@onyfans.com.br", // Separate reply address
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
              @media only screen and (max-width: 600px) {
                .email-container { width: 100% !important; }
                .email-content { padding: 20px !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; line-height: 1.6;">
            <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${subject}</h1>
              </div>
              
              <!-- Content -->
              <div class="email-content" style="padding: 40px 30px; color: #333; background-color: white;">
                <div style="font-size: 16px; line-height: 1.8;">
                  ${body.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8f9fa; padding: 25px 20px; text-align: center; border-top: 1px solid #e9ecef; border-radius: 0 0 8px 8px;">
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #6c757d;">
                  Este email foi enviado por <strong style="color: #495057;">OnyTikTok</strong>
                </p>
                <p style="margin: 0 0 15px 0; font-size: 12px; color: #6c757d;">
                  Se você não deseja mais receber nossos emails, 
                  <a href="mailto:contato@onyfans.com.br?subject=Descadastro" style="color: #667eea; text-decoration: none;">clique aqui para se descadastrar</a>
                </p>
                <div style="border-top: 1px solid #dee2e6; padding-top: 15px;">
                  <p style="margin: 0; font-size: 11px; color: #868e96;">
                    © ${new Date().getFullYear()} OnyTikTok. Todos os direitos reservados.<br>
                    <small>Este é um email automático, não responda diretamente.</small>
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Email tracking pixel (invisible) -->
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
                 alt="" width="1" height="1" style="display:none;">
          </body>
          </html>
        `,
        text: `${subject}\n\n${body}\n\n---\nEste email foi enviado por OnyTikTok\nSe não deseja mais receber, entre em contato: contato@onyfans.com.br\n© ${new Date().getFullYear()} OnyTikTok. Todos os direitos reservados.`,
        headers: {
          'X-Entity-Ref-ID': `onytiktok-${Date.now()}`,
          'List-Unsubscribe': '<mailto:contato@onyfans.com.br?subject=Descadastro>',
          'X-Mailer': 'OnyTikTok Email System v1.0',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
        },
        tags: [
          {
            name: 'category',
            value: 'marketing'
          },
          {
            name: 'source',
            value: 'admin_panel'
          }
        ]
      });

      console.log("Resend email response:", emailResponse);

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
        throw logError;
      }

      // Update integration last used
      await supabase
        .from('integrations')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', integration.id);

      console.log("Email sent successfully:", emailLog.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sent successfully",
          email_log_id: emailLog.id,
          external_id: emailResponse.data?.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } catch (resendError: any) {
      console.error("Resend error:", resendError);
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