import { createClient } from "npm:@supabase/supabase-js@2"

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution.technocode.site";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "8GJGnDzDfDYQiMFabMWA3e8kFup8LkJY";
const INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME") || "Dona Nega";

const getSupabaseService = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

async function sendWhatsApp(
  phone: string,
  fullName: string,
  customMessage: string,
  mediaUrl?: string | null,
  mediaType?: string | null,
  fileName?: string | null
) {
  const cleanPhone = phone.replace(/\D/g, "");
  let waNumber = cleanPhone;
  if (!waNumber.startsWith("55") && waNumber.length >= 10) {
    waNumber = "55" + waNumber;
  }

  const firstName = fullName.split(' ')[0];
  let message = customMessage;

  if (message) {
    message = message
      .replace(/\{nome\}/gi, firstName)
      .replace(/\{nome_completo\}/gi, fullName);
  }

  let payload: any;
  let endpoint = "";

  if (mediaUrl) {
    payload = {
      number: waNumber,
      options: {
        delay: 1200,
        presence: "composing"
      },
      mediatype: mediaType || "document",
      media: mediaUrl,
      caption: message || undefined,
      fileName: fileName || "arquivo"
    };
    endpoint = "sendMedia";
  } else {
    payload = {
      number: waNumber,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      },
      text: message
    };
    endpoint = "sendText";
  }

  const url = `${EVOLUTION_API_URL}/message/${endpoint}/${encodeURIComponent(INSTANCE_NAME)}`;
  
  console.log(`Sending WhatsApp message to Evolution API: ${url} for number ${waNumber}`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error sending WA to ${waNumber}:`, errorText);
    throw new Error(`Evolution API Error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, fullName, personId, message, tableName, mediaUrl, mediaType, fileName } = await req.json();
    
    if (!phone || !fullName) {
      throw new Error("Missing parameters: phone and fullName are required.");
    }
    
    // Auth Validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Allow service_role key or validate standard logged user token
    if (token !== serviceRoleKey) {
      const supabaseUserClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
      if (authError || !user) throw new Error("Unauthorized");
    }

    const supabaseService = getSupabaseService();
    let res = null;
    let logDescription = "";
    let logAction = "";

    try {
      res = await sendWhatsApp(phone, fullName, message, mediaUrl, mediaType, fileName);
      logAction = 'WHATSAPP_CUSTOM_ENVIO';
      logDescription = mediaUrl 
        ? `Mensagem com anexo enviada via WhatsApp para ${fullName}` 
        : `Mensagem em lote enviada via WhatsApp para ${fullName}`;
      
      // Salvar log de sucesso
      await supabaseService.from('activity_logs').insert({
        action: logAction,
        table_name: tableName || 'pessoa',
        record_id: personId || null,
        description: logDescription,
        metadata: { phone, media_url: mediaUrl, media_type: mediaType, file_name: fileName, evolution_response: res }
      });

      return new Response(JSON.stringify({ success: true, result: res }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (err: any) {
      logAction = 'WHATSAPP_CUSTOM_FALHA';
      logDescription = mediaUrl 
        ? `Falha ao enviar mensagem com anexo via WhatsApp para ${fullName}`
        : `Falha ao enviar mensagem em lote via WhatsApp para ${fullName}`;
      
      // Salvar log de falha
      await supabaseService.from('activity_logs').insert({
        action: logAction,
        table_name: tableName || 'pessoa',
        record_id: personId || null,
        description: logDescription,
        metadata: { phone, media_url: mediaUrl, media_type: mediaType, error: err.message }
      });
      
      throw err;
    }

  } catch (error: any) {
    console.error("HTTP Error in send-custom-wpp:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
