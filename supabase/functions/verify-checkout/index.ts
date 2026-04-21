import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("ID da sessão não fornecido");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || !session.client_reference_id) throw new Error("Sessão não encontrada");

    // Garantir que o perfil está atualizado se o webhook falhou
    if (session.status === "complete" && session.payment_status === "paid") {
      await supabase
        .from("profiles")
        .update({
          stripe_status: "active",
          stripe_customer_id: session.customer as string,
          subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Fallback 1 ano
        })
        .eq("user_id", session.client_reference_id);
    }

    return new Response(JSON.stringify({ success: true, status: session.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("ERRO NA VERIFICAÇÃO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
