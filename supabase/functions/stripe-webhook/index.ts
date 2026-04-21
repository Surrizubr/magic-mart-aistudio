import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Sem assinatura do Stripe");

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Evento recebido: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const userId = session.client_reference_id;

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            stripe_status: "active",
            stripe_customer_id: session.customer,
            subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("user_id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as any;
      const stripeCustomerId = subscription.customer;
      
      const status = subscription.status === "active" ? "active" : "inactive";
      
      await supabase
        .from("profiles")
        .update({
          stripe_status: status,
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_customer_id", stripeCustomerId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("ERRO NO WEBHOOK:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
