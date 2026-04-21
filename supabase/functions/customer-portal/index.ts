import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem cabeçalho de autorização");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (!user) throw new Error("Usuário não autenticado");

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_customer_id) throw new Error("Cliente Stripe não encontrado");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const origin = req.headers.get("origin") || "https://magic-mart-aistudio.vercel.app";

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: origin,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("ERRO NO PORTAL:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
