import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StrongSMSRequest {
  name: string;
  phones: string[];
  message: string;
  sendDate?: string;
}

interface StrongAuthResponse {
  token: string;
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
    const { name, phones, message, sendDate }: StrongSMSRequest = await req.json();

    console.log("Starting Strong Expert SMS campaign:", { name, phoneCount: phones.length });

    // Step 1: Authenticate with Strong Expert API
    const authResponse = await fetch("https://api.strong.expert/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "me@icarotavares.com",
        password: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.status}`);
    }

    const authData: StrongAuthResponse = await authResponse.json();
    console.log("Authentication successful");

    // Step 2: Create SMS campaign
    const campaignData = {
      name: name || `SMS Campaign ${new Date().toISOString()}`,
      sendDate: sendDate || new Date().toISOString(),
      typeSms: 1,
      hasInteraction: true,
      smsTemplateId: 3085, // Template ID provided
      phones: phones,
      isIndividual: true
    };

    const campaignResponse = await fetch("https://api.strong.expert/api/v1/campaign-sms", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(campaignData),
    });

    if (!campaignResponse.ok) {
      throw new Error(`Campaign creation failed: ${campaignResponse.status}`);
    }

    const campaignResult = await campaignResponse.json();
    console.log("SMS campaign created successfully:", campaignResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS campaign created successfully",
        campaignId: campaignResult.id,
        phoneCount: phones.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error creating SMS campaign:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create SMS campaign",
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