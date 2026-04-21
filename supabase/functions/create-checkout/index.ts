import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

const TEST_PRICE_ID = "price_1TMeFZRsLFesxj6XP8uecvEE";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem cabeçalho de autorização");

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }

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

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("ERRO NO CHECKOUT:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
