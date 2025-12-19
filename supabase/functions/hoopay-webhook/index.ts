import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs mapeados para tipos de plano e duração em dias
const PLAN_CONFIG: Record<string, { type: string; days: number }> = {
  "6ca7b341-2e5b-4153-82d3-f4d4d76fa2d1": { type: "mensal", days: 30 },
  "f488d9e1-3e79-4ea5-a9cc-4a108bb03c92": { type: "trimestral", days: 90 },
  "61207e4a-9455-4cb8-8207-9002a87c5fe6": { type: "anual", days: 365 },
};

interface HoopayWebhookPayload {
  event?: string;
  type?: string;
  data?: {
    email?: string;
    customer_email?: string;
    buyer_email?: string;
    payer_email?: string;
    user_email?: string;
    client_email?: string;
    name?: string;
    customer_name?: string;
    buyer_name?: string;
    phone?: string;
    whatsapp?: string;
    cellphone?: string;
    mobile?: string;
    telefone?: string;
    celular?: string;
    // Campos de CPF
    cpf?: string;
    customer_cpf?: string;
    buyer_cpf?: string;
    document?: string;
    documento?: string;
    product_id?: string;
    productId?: string;
    amount?: number;
    value?: number;
    status?: string;
    customer?: {
      email?: string;
      name?: string;
      phone?: string;
      cellphone?: string;
      cpf?: string;
      document?: string;
    };
    buyer?: {
      email?: string;
      name?: string;
      phone?: string;
      cellphone?: string;
      cpf?: string;
      document?: string;
    };
    payer?: {
      email?: string;
      name?: string;
      phone?: string;
      cellphone?: string;
      cpf?: string;
      document?: string;
    };
  };
  // Formato alternativo (payload direto)
  email?: string;
  customer_email?: string;
  buyer_email?: string;
  payer_email?: string;
  user_email?: string;
  client_email?: string;
  name?: string;
  customer_name?: string;
  buyer_name?: string;
  phone?: string;
  whatsapp?: string;
  cellphone?: string;
  mobile?: string;
  telefone?: string;
  celular?: string;
  // Campos de CPF direto
  cpf?: string;
  customer_cpf?: string;
  buyer_cpf?: string;
  document?: string;
  documento?: string;
  product_id?: string;
  productId?: string;
  status?: string;
  amount?: number;
  value?: number;
  customer?: {
    email?: string;
    name?: string;
    phone?: string;
    cellphone?: string;
    cpf?: string;
    document?: string;
  };
  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
    cellphone?: string;
    cpf?: string;
    document?: string;
  };
  payer?: {
    email?: string;
    name?: string;
    phone?: string;
    cellphone?: string;
    cpf?: string;
    document?: string;
  };
}

// Função para normalizar telefone (remove tudo que não é número)
function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

// Função para extrair telefone do payload (tenta múltiplos campos)
function extractPhone(payload: HoopayWebhookPayload): string {
  const data = payload.data || payload;
  
  // Lista de possíveis campos de telefone
  const phoneCandidates = [
    data.phone,
    data.cellphone,
    data.mobile,
    data.whatsapp,
    data.telefone,
    data.celular,
    data.customer?.phone,
    data.customer?.cellphone,
    data.buyer?.phone,
    data.buyer?.cellphone,
    data.payer?.phone,
    data.payer?.cellphone,
    payload.phone,
    payload.cellphone,
    payload.mobile,
    payload.whatsapp,
    payload.telefone,
    payload.celular,
    payload.customer?.phone,
    payload.buyer?.phone,
    payload.payer?.phone,
  ];
  
  for (const phone of phoneCandidates) {
    if (phone && typeof phone === 'string') {
      const normalized = normalizePhone(phone);
      if (normalized.length >= 10) { // Telefone brasileiro tem pelo menos 10 dígitos
        return normalized;
      }
    }
  }
  
  return "";
}

// Função para extrair email do payload (tenta múltiplos campos)
function extractEmail(payload: HoopayWebhookPayload): string | null {
  const data = payload.data || payload;
  
  const emailCandidates = [
    data.buyer_email,
    data.payer_email,
    data.customer_email,
    data.user_email,
    data.client_email,
    data.email,
    data.customer?.email,
    data.buyer?.email,
    data.payer?.email,
    payload.buyer_email,
    payload.payer_email,
    payload.customer_email,
    payload.user_email,
    payload.client_email,
    payload.email,
    payload.customer?.email,
    payload.buyer?.email,
    payload.payer?.email,
  ];
  
  // Retorna o primeiro email válido (não @hoopay)
  for (const email of emailCandidates) {
    if (email && typeof email === 'string' && email.includes('@') && !email.includes('@hoopay')) {
      return email.toLowerCase().trim();
    }
  }
  
  // Fallback: qualquer email
  for (const email of emailCandidates) {
    if (email && typeof email === 'string' && email.includes('@')) {
      return email.toLowerCase().trim();
    }
  }
  
  return null;
}

// Função para extrair nome do payload
function extractName(payload: HoopayWebhookPayload): string {
  const data = payload.data || payload;
  
  return data.buyer_name || 
         data.customer_name || 
         data.name || 
         data.customer?.name || 
         data.buyer?.name || 
         data.payer?.name || 
         payload.buyer_name || 
         payload.customer_name || 
         payload.name || 
         "Assinante VIP";
}

// Função para extrair CPF do payload
function extractCPF(payload: HoopayWebhookPayload): string {
  const data = payload.data || payload;
  
  const cpfCandidates = [
    data.cpf,
    data.customer_cpf,
    data.buyer_cpf,
    data.document,
    data.documento,
    data.customer?.cpf,
    data.customer?.document,
    data.buyer?.cpf,
    data.buyer?.document,
    data.payer?.cpf,
    data.payer?.document,
    payload.cpf,
    payload.customer_cpf,
    payload.buyer_cpf,
    payload.document,
    payload.documento,
    payload.customer?.cpf,
    payload.buyer?.cpf,
    payload.payer?.cpf,
  ];
  
  for (const cpf of cpfCandidates) {
    if (cpf && typeof cpf === 'string') {
      // Normalizar CPF (remover pontos e traços)
      const normalized = cpf.replace(/[^0-9]/g, "");
      if (normalized.length === 11) {
        return normalized;
      }
    }
  }
  
  return "";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: HoopayWebhookPayload = await req.json();
    
    console.log("📥 Webhook Hoopay recebido:", JSON.stringify(payload, null, 2));

    const data = payload.data || payload;
    
    // Extrair dados
    const phone = extractPhone(payload);
    const emailFromPayload = extractEmail(payload);
    const name = extractName(payload);
    const cpf = extractCPF(payload);
    const productId = data.product_id || data.productId;
    const status = data.status || payload.event;
    const amount = data.amount || data.value;
    
    console.log("📧 EMAIL EXTRAÍDO:", emailFromPayload);
    console.log("📱 TELEFONE EXTRAÍDO:", phone);
    console.log("🆔 CPF EXTRAÍDO:", cpf);
    console.log("👤 NOME:", name);

    // NOVA LÓGICA: PRIORIZAR EMAIL sobre telefone (mais confiável)
    let userEmail = emailFromPayload;
    let userId: string | null = null;

    // 1️⃣ PRIMEIRO: Buscar por EMAIL (prioridade máxima)
    if (emailFromPayload && !emailFromPayload.includes('@hoopay')) {
      console.log(`🔍 [PRIORIDADE 1] Buscando usuário pelo EMAIL: ${emailFromPayload}`);
      
      const { data: profileByEmail, error: emailError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", emailFromPayload.toLowerCase())
        .maybeSingle();
      
      if (emailError) {
        console.log("⚠️ Erro ao buscar por email:", emailError.message);
      }
      
      if (profileByEmail) {
        console.log(`✅ USUÁRIO ENCONTRADO PELO EMAIL!`);
        console.log(`   ID: ${profileByEmail.id}`);
        console.log(`   Email: ${profileByEmail.email}`);
        console.log(`   Nome: ${profileByEmail.full_name}`);
        
        userEmail = profileByEmail.email || emailFromPayload;
        userId = profileByEmail.id;
      } else {
        console.log("❌ Nenhum usuário encontrado com este email no profiles");
      }
    }

    // 2️⃣ SEGUNDO: Se não encontrou por email, buscar por TELEFONE
    if (!userId && phone) {
      console.log(`🔍 [PRIORIDADE 2] Buscando usuário pelo TELEFONE: ${phone}`);
      
      // Buscar na tabela profiles pelo telefone
      const { data: profileByPhone, error: phoneError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .or(`phone.eq.${phone},phone.ilike.%${phone}%`)
        .limit(1)
        .maybeSingle();
      
      if (phoneError) {
        console.log("⚠️ Erro ao buscar por telefone:", phoneError.message);
      }
      
      if (profileByPhone) {
        console.log(`✅ USUÁRIO ENCONTRADO PELO TELEFONE!`);
        console.log(`   ID: ${profileByPhone.id}`);
        console.log(`   Email: ${profileByPhone.email}`);
        console.log(`   Nome: ${profileByPhone.full_name}`);
        
        userEmail = profileByPhone.email || userEmail;
        userId = profileByPhone.id;
      } else {
        console.log("❌ Nenhum usuário encontrado com este telefone");
        
        // Fallback: tentar buscar removendo o DDD ou código do país
        if (phone.length > 10) {
          const phoneWithoutCountry = phone.slice(-11); // Últimos 11 dígitos (DDD + número)
          const phoneWithoutDDD = phone.slice(-9); // Últimos 9 dígitos (só número)
          
          console.log(`🔍 Tentando variações: ${phoneWithoutCountry}, ${phoneWithoutDDD}`);
          
          const { data: profileAlt } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .or(`phone.ilike.%${phoneWithoutCountry}%,phone.ilike.%${phoneWithoutDDD}%`)
            .limit(1)
            .maybeSingle();
          
          if (profileAlt) {
            console.log(`✅ USUÁRIO ENCONTRADO COM VARIAÇÃO DO TELEFONE!`);
            userEmail = profileAlt.email || userEmail;
            userId = profileAlt.id;
          }
        }
      }
    }

    // Validar que temos pelo menos um identificador
    if (!userEmail && !userId) {
      console.error("❌ Não foi possível identificar o usuário (sem email nem telefone válido)");
      return new Response(
        JSON.stringify({ error: "Não foi possível identificar o usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é pagamento aprovado
    const isApproved = 
      status === "paid" || 
      status === "approved" || 
      status === "payment.approved" ||
      status === "completed" ||
      status === "success";

    if (!isApproved) {
      console.log(`⏭️ Evento ignorado (status: ${status})`);
      return new Response(
        JSON.stringify({ message: "Evento ignorado", status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar tipo de plano e duração
    let planType = "mensal";
    let planDays = 30;

    if (productId && PLAN_CONFIG[productId]) {
      planType = PLAN_CONFIG[productId].type;
      planDays = PLAN_CONFIG[productId].days;
    } else if (amount) {
      if (amount >= 200) {
        planType = "anual";
        planDays = 365;
      } else if (amount >= 70) {
        planType = "trimestral";
        planDays = 90;
      }
    }

    // Calcular datas
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + planDays);

    console.log(`✅ Ativando VIP - Email: ${userEmail} | UserID: ${userId} | Plano: ${planType}`);

    // Verificar se já existe registro
    let existingUser = null;
    
    if (userId) {
      const { data } = await supabase
        .from("premium_users")
        .select("id, subscription_end")
        .eq("user_id", userId)
        .maybeSingle();
      existingUser = data;
    }
    
    if (!existingUser && userEmail) {
      const { data } = await supabase
        .from("premium_users")
        .select("id, subscription_end")
        .eq("email", userEmail)
        .maybeSingle();
      existingUser = data;
    }

    if (existingUser) {
      // Atualizar assinatura existente
      let newEndDate = subscriptionEnd;
      if (existingUser.subscription_end) {
        const currentEnd = new Date(existingUser.subscription_end);
        if (currentEnd > subscriptionStart) {
          newEndDate = new Date(currentEnd);
          newEndDate.setDate(newEndDate.getDate() + planDays);
        }
      }

      const { error: updateError } = await supabase
        .from("premium_users")
        .update({
          name,
          email: userEmail, // Garantir email correto
          user_id: userId, // Garantir user_id correto
          whatsapp: phone || undefined,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: newEndDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("❌ Erro ao atualizar premium_users:", updateError);
        throw updateError;
      }

      console.log(`🔄 Assinatura atualizada - Fim: ${newEndDate.toISOString()}`);
    } else {
      // Criar novo registro
      const { error: insertError } = await supabase
        .from("premium_users")
        .insert({
          email: userEmail,
          user_id: userId,
          name,
          whatsapp: phone,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        });

      if (insertError) {
        console.error("❌ Erro ao inserir premium_users:", insertError);
        throw insertError;
      }

      console.log(`🆕 Novo usuário VIP criado - Fim: ${subscriptionEnd.toISOString()}`);
    }

    // Log do webhook
    try {
      await supabase.from("webhook_logs").insert({
        webhook_type: "hoopay_payment",
        payload: payload,
        processed: true,
        email: userEmail,
        plan_type: planType,
      });
    } catch (logErr) {
      console.log("⚠️ Não foi possível salvar log:", logErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `VIP ativado para ${userEmail}`,
        plan: planType,
        expires: subscriptionEnd.toISOString(),
        identifiedBy: userId ? "phone" : "email"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no webhook Hoopay:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
