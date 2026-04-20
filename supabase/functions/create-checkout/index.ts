import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PRICE_ID = "price_1TMeFZRsLFesxj6XP8uecvEE";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("--- Diagnóstico de Checkout Iniciado ---");
  
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    
    console.log("Supabase URL na Função:", supabaseUrl);
    console.log("Stripe Key presente:", !!stripeKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem cabeçalho de autorização");

    const token = authHeader.replace("Bearer ", "");
    
    // Tentar ler o usuário usando a chave anônima primeiro (padrão)
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Erro de Autenticação Supabase:", authError?.message);
      // Se falhar aqui, o problema é que o Token não serve para este projeto
      throw new Error(`O Supabase não reconheceu seu login (Erro: ${authError?.message}). Tente limpar o cache do navegador.`);
    }

    console.log("Usuário autenticado com sucesso:", user.email);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const origin = req.headers.get("origin") || "https://magic-mart-aistudio.vercel.app";

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: TEST_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    console.log("Sessão Stripe criada com sucesso!");
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("ERRO CRÍTICO NO CHECKOUT:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Retornamos 200 com o objeto de erro para evitar que o navegador bloqueie por CORS
    });
  }
});
