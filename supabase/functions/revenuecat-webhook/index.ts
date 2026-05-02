import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    console.log("RevenueCat Webhook received:", JSON.stringify(body, null, 2));

    const event = body.event;
    if (!event) {
      return new Response(JSON.stringify({ error: "No event found in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, app_user_id, expiration_at_ms, entitlement_ids } = event;

    if (!app_user_id) {
      console.error("Missing app_user_id in RevenueCat event");
      return new Response(JSON.stringify({ error: "Missing app_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine subscription status and tier
    // Types: INITIAL_PURCHASE, RENEWAL, EXPIRATION, CANCELLATION, BILLING_ISSUE, PRODUCT_CHANGE, etc.
    let status = "inactive";
    let tier = "free";
    let subEnd = null;

    if (expiration_at_ms) {
      subEnd = new Date(expiration_at_ms).toISOString();
      const now = new Date();
      if (new Date(expiration_at_ms) > now) {
        status = "active";
        // Check if our premium entitlement is present
        if (entitlement_ids && entitlement_ids.includes("IDAPPS Premium")) {
          tier = "pro";
        }
      }
    }

    // Special handling for expiration
    if (type === "EXPIRATION") {
      status = "inactive";
      tier = "free";
    }

    console.log(`Updating profile for user ${app_user_id}: status=${status}, tier=${tier}, end=${subEnd}`);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        revenuecat_status: status,
        subscription_tier: tier,
        subscription_end: subEnd,
        // We update the general subscription_tier as well so components can check it easily
        // If a user has Stripe active, it might have been set to pro already. 
        // Here we synchronize RevenueCat's state.
      })
      .eq("user_id", app_user_id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing RevenueCat webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
