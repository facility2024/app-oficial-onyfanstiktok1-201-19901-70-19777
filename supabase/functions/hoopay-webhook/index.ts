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

// Função para normalizar telefone (remove tudo que não é número)
function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

// Função genérica para buscar campo recursivamente
function findField(obj: any, fieldNames: string[]): any {
  if (!obj || typeof obj !== 'object') return null;
  
  for (const fieldName of fieldNames) {
    // Busca direta
    if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {
      return obj[fieldName];
    }
  }
  
  // Busca em objetos aninhados comuns
  const nestedObjects = ['data', 'customer', 'buyer', 'payer', 'client', 'user', 'sale', 'transaction', 'payment'];
  for (const nested of nestedObjects) {
    if (obj[nested] && typeof obj[nested] === 'object') {
      for (const fieldName of fieldNames) {
        if (obj[nested][fieldName] !== undefined && obj[nested][fieldName] !== null && obj[nested][fieldName] !== '') {
          return obj[nested][fieldName];
        }
      }
    }
  }
  
  return null;
}

// Função para extrair email do payload (tenta múltiplos campos)
function extractEmail(payload: any): string | null {
  const emailFields = [
    'email', 'buyer_email', 'payer_email', 'customer_email', 'user_email', 
    'client_email', 'Email', 'EMAIL', 'e-mail', 'mail'
  ];
  
  const email = findField(payload, emailFields);
  
  if (email && typeof email === 'string' && email.includes('@') && !email.includes('@hoopay')) {
    return email.toLowerCase().trim();
  }
  
  // Fallback: qualquer email
  if (email && typeof email === 'string' && email.includes('@')) {
    return email.toLowerCase().trim();
  }
  
  return null;
}

// Função para extrair telefone do payload (tenta múltiplos campos)
function extractPhone(payload: any): string {
  const phoneFields = [
    'phone', 'cellphone', 'mobile', 'whatsapp', 'telefone', 'celular',
    'Phone', 'Cellphone', 'Mobile', 'Whatsapp', 'Telefone', 'Celular',
    'fone', 'tel', 'numero', 'number'
  ];
  
  const phone = findField(payload, phoneFields);
  
  if (phone) {
    const normalized = normalizePhone(String(phone));
    if (normalized.length >= 10) {
      return normalized;
    }
  }
  
  return "";
}

// Função para extrair nome do payload
function extractName(payload: any): string {
  const nameFields = [
    'name', 'buyer_name', 'customer_name', 'full_name', 'fullName',
    'Name', 'NOME', 'nome', 'Nome', 'razao_social', 'razaoSocial'
  ];
  
  const name = findField(payload, nameFields);
  return name ? String(name) : "Assinante VIP";
}

// Função para extrair CPF do payload
function extractCPF(payload: any): string {
  const cpfFields = [
    'cpf', 'customer_cpf', 'buyer_cpf', 'document', 'documento',
    'CPF', 'Cpf', 'doc', 'Doc', 'cpf_cnpj', 'tax_id', 'taxId'
  ];
  
  const cpf = findField(payload, cpfFields);
  
  if (cpf) {
    const normalized = String(cpf).replace(/[^0-9]/g, "");
    if (normalized.length === 11) {
      return normalized;
    }
  }
  
  return "";
}

// Função para extrair status do pagamento
function extractStatus(payload: any): string {
  const statusFields = [
    'status', 'event', 'type', 'event_type', 'eventType',
    'Status', 'EVENT', 'state', 'State', 'situation', 'situacao'
  ];
  
  const status = findField(payload, statusFields);
  return status ? String(status).toLowerCase() : "";
}

// Função para extrair valor/amount
function extractAmount(payload: any): number {
  const amountFields = [
    'amount', 'value', 'total', 'price', 'valor', 'preco',
    'Amount', 'Value', 'Total', 'Price', 'Valor'
  ];
  
  const amount = findField(payload, amountFields);
  
  if (amount !== null) {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
    if (!isNaN(num)) {
      return num;
    }
  }
  
  return 0;
}

// Função para extrair product_id
function extractProductId(payload: any): string | null {
  const productFields = [
    'product_id', 'productId', 'product', 'plan_id', 'planId',
    'ProductId', 'Product_Id', 'sku', 'item_id', 'itemId'
  ];
  
  const productId = findField(payload, productFields);
  return productId ? String(productId) : null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let payload: any = null;
  let logId: string | null = null;

  try {
    // Parse do payload
    const rawBody = await req.text();
    console.log("📥 RAW BODY recebido:", rawBody);
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("❌ Erro ao fazer parse do JSON:", parseError);
      payload = { raw: rawBody };
    }
    
    console.log("📥 Webhook Hoopay recebido:", JSON.stringify(payload, null, 2));

    // SALVAR LOG IMEDIATAMENTE (antes de qualquer processamento)
    try {
      const { data: logData, error: logError } = await supabase
        .from("webhook_logs")
        .insert({
          webhook_type: "hoopay_payment",
          payload: payload,
          processed: false,
          email: null,
          plan_type: null,
          error_message: null,
        })
        .select('id')
        .single();
      
      if (logData) {
        logId = logData.id;
        console.log("📝 Log criado com ID:", logId);
      }
      if (logError) {
        console.log("⚠️ Erro ao criar log inicial:", logError.message);
      }
    } catch (logErr) {
      console.log("⚠️ Não foi possível salvar log inicial:", logErr);
    }

    // Extrair dados usando funções flexíveis
    const emailFromPayload = extractEmail(payload);
    const phone = extractPhone(payload);
    const name = extractName(payload);
    const cpf = extractCPF(payload);
    const status = extractStatus(payload);
    const amount = extractAmount(payload);
    const productId = extractProductId(payload);
    
    console.log("=== DADOS EXTRAÍDOS ===");
    console.log("📧 EMAIL:", emailFromPayload);
    console.log("📱 TELEFONE:", phone);
    console.log("👤 NOME:", name);
    console.log("🆔 CPF:", cpf);
    console.log("📊 STATUS:", status);
    console.log("💰 AMOUNT:", amount);
    console.log("📦 PRODUCT_ID:", productId);
    console.log("========================");

    // Buscar usuário por EMAIL ou TELEFONE
    let userEmail = emailFromPayload;
    let userId: string | null = null;

    // 1️⃣ PRIMEIRO: Buscar por EMAIL
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
        userEmail = profileByEmail.email || emailFromPayload;
        userId = profileByEmail.id;
      } else {
        console.log("❌ Nenhum usuário encontrado com este email");
      }
    }

    // 2️⃣ SEGUNDO: Se não encontrou por email, buscar por TELEFONE
    if (!userId && phone) {
      console.log(`🔍 [PRIORIDADE 2] Buscando usuário pelo TELEFONE: ${phone}`);
      
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
        userEmail = profileByPhone.email || userEmail;
        userId = profileByPhone.id;
      } else {
        console.log("❌ Nenhum usuário encontrado com este telefone");
        
        // Fallback: variações do telefone
        if (phone.length > 10) {
          const phoneVariations = [
            phone.slice(-11),
            phone.slice(-9),
            phone.slice(-8),
          ];
          
          for (const variation of phoneVariations) {
            const { data: profileAlt } = await supabase
              .from("profiles")
              .select("id, email, full_name")
              .ilike("phone", `%${variation}%`)
              .limit(1)
              .maybeSingle();
            
            if (profileAlt) {
              console.log(`✅ USUÁRIO ENCONTRADO COM VARIAÇÃO: ${variation}`);
              userEmail = profileAlt.email || userEmail;
              userId = profileAlt.id;
              break;
            }
          }
        }
      }
    }

    // Validar que temos pelo menos um identificador
    if (!userEmail && !userId) {
      const errorMsg = "Não foi possível identificar o usuário (sem email nem telefone válido)";
      console.error("❌", errorMsg);
      
      // Atualizar log com erro
      if (logId) {
        await supabase.from("webhook_logs").update({
          processed: false,
          error_message: errorMsg,
        }).eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é pagamento aprovado
    const approvedStatuses = ['paid', 'approved', 'payment.approved', 'completed', 'success', 'active', 'confirmed'];
    const isApproved = approvedStatuses.some(s => status.includes(s));

    if (!isApproved) {
      console.log(`⏭️ Evento ignorado (status: ${status})`);
      
      // Atualizar log
      if (logId) {
        await supabase.from("webhook_logs").update({
          processed: false,
          email: userEmail,
          error_message: `Status não aprovado: ${status}`,
        }).eq("id", logId);
      }
      
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
          email: userEmail,
          user_id: userId,
          whatsapp: phone || undefined,
          cpf: cpf || undefined,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: newEndDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("❌ Erro ao atualizar premium_users:", updateError);
        
        if (logId) {
          await supabase.from("webhook_logs").update({
            processed: false,
            email: userEmail,
            plan_type: planType,
            error_message: `Erro ao atualizar: ${updateError.message}`,
          }).eq("id", logId);
        }
        
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
          cpf: cpf || null,
          subscription_status: "active",
          subscription_type: planType,
          subscription_start: subscriptionStart.toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        });

      if (insertError) {
        console.error("❌ Erro ao inserir premium_users:", insertError);
        
        if (logId) {
          await supabase.from("webhook_logs").update({
            processed: false,
            email: userEmail,
            plan_type: planType,
            error_message: `Erro ao inserir: ${insertError.message}`,
          }).eq("id", logId);
        }
        
        throw insertError;
      }

      console.log(`🆕 Novo usuário VIP criado - Fim: ${subscriptionEnd.toISOString()}`);
    }

    // Atualizar log como processado com sucesso
    if (logId) {
      await supabase.from("webhook_logs").update({
        processed: true,
        email: userEmail,
        plan_type: planType,
        error_message: null,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `VIP ativado para ${userEmail}`,
        plan: planType,
        expires: subscriptionEnd.toISOString(),
        identifiedBy: userId ? "user_id" : "email"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no webhook Hoopay:", error);
    
    // Salvar erro no log se ainda não foi salvo
    if (logId) {
      await supabase.from("webhook_logs").update({
        processed: false,
        error_message: error.message || "Erro interno",
      }).eq("id", logId);
    } else if (payload) {
      // Criar log de erro se não existe
      try {
        await supabase.from("webhook_logs").insert({
          webhook_type: "hoopay_payment",
          payload: payload,
          processed: false,
          error_message: error.message || "Erro interno",
        });
      } catch (e) {
        console.log("⚠️ Não foi possível salvar log de erro");
      }
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
