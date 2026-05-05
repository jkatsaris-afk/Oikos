import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function formBody(values: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      body.set(key, String(value));
    }
  });

  return body;
}

async function stripeRequest(secretKey: string, path: string, values: Record<string, string | number | boolean | undefined>) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody(values).toString(),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || "Stripe request failed.");
  }

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Missing Supabase function environment." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const body = await req.json();
    const accountId = String(body?.accountId || "");
    const batchId = String(body?.batchId || "");
    const invoiceRequests = Array.isArray(body?.invoiceRequests) ? body.invoiceRequests : [];
    const createDraftInvoices = body?.createDraftInvoices !== false;

    if (!accountId || !batchId || invoiceRequests.length === 0) {
      return jsonResponse({ error: "Missing tuition invoice payload." }, 400);
    }

    const { data: ownedAccount } = await userClient
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    let hasAccess = Boolean(ownedAccount?.id);

    if (!hasAccess) {
      const { data: membership } = await userClient
        .from("account_members")
        .select("account_id")
        .eq("account_id", accountId)
        .eq("user_id", user.id)
        .maybeSingle();

      hasAccess = Boolean(membership?.account_id);
    }

    if (!hasAccess) {
      return jsonResponse({ error: "You do not have access to this organization." }, 403);
    }

    const { data: account, error: accountError } = await adminClient
      .from("accounts")
      .select("id, name, integrations")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      return jsonResponse({ error: "Organization not found." }, 404);
    }

    const payments = account.integrations?.payments || {};
    const secretKey = String(payments.secretKey || "").trim();

    if (payments.enabled !== true || String(payments.provider || "stripe") !== "stripe" || !secretKey) {
      return jsonResponse({ error: "Stripe settings are incomplete." }, 400);
    }

    const results = [];

    for (const invoiceRequest of invoiceRequests) {
      const customerEmail = String(invoiceRequest?.customer?.email || "").trim();
      const customerName = String(invoiceRequest?.customer?.name || "Tuition Family").trim();
      const lineItems = Array.isArray(invoiceRequest?.lineItems) ? invoiceRequest.lineItems : [];

      if (!customerEmail || lineItems.length === 0) {
        results.push({
          studentId: invoiceRequest?.studentId || "",
          ok: false,
          error: "Missing customer email or invoice line items.",
        });
        continue;
      }

      try {
        const customer = await stripeRequest(secretKey, "customers", {
          name: customerName,
          email: customerEmail,
          phone: invoiceRequest?.customer?.phone || undefined,
          "metadata[accountId]": accountId,
          "metadata[studentId]": invoiceRequest?.studentId || "",
          "metadata[batchId]": batchId,
        });

        for (const item of lineItems) {
          await stripeRequest(secretKey, "invoiceitems", {
            customer: customer.id,
            amount: item.amount,
            currency: item.currency || "usd",
            description: item.description || "Tuition",
            "metadata[accountId]": accountId,
            "metadata[studentId]": invoiceRequest?.studentId || "",
            "metadata[batchId]": batchId,
            "metadata[billId]": item.id || "",
            "metadata[dueDate]": item.dueDate || "",
          });
        }

        const collectionMethod = invoiceRequest?.collectionMethod === "charge_automatically"
          ? "charge_automatically"
          : "send_invoice";
        const invoiceValues: Record<string, string | number | boolean | undefined> = {
          customer: customer.id,
          collection_method: collectionMethod,
          description: invoiceRequest?.statementDescriptor || "Campus Tuition",
          auto_advance: createDraftInvoices ? false : true,
          "metadata[accountId]": accountId,
          "metadata[studentId]": invoiceRequest?.studentId || "",
          "metadata[batchId]": batchId,
          "metadata[planId]": invoiceRequest?.metadata?.planId || "",
          "metadata[studentNumber]": invoiceRequest?.metadata?.studentNumber || "",
        };

        if (collectionMethod === "send_invoice") {
          invoiceValues.days_until_due = invoiceRequest?.daysUntilDue || 5;
        }

        const invoice = await stripeRequest(secretKey, "invoices", invoiceValues);

        const finalInvoice = createDraftInvoices
          ? invoice
          : await stripeRequest(secretKey, `invoices/${invoice.id}/finalize`, {});
        const sentInvoice =
          !createDraftInvoices && collectionMethod === "send_invoice"
            ? await stripeRequest(secretKey, `invoices/${finalInvoice.id}/send`, {})
            : finalInvoice;

        results.push({
          studentId: invoiceRequest?.studentId || "",
          ok: true,
          customerId: customer.id,
          invoiceId: sentInvoice.id,
          invoiceUrl: sentInvoice.hosted_invoice_url || "",
          status: sentInvoice.status || finalInvoice.status || invoice.status || "",
        });
      } catch (error) {
        results.push({
          studentId: invoiceRequest?.studentId || "",
          ok: false,
          error: error instanceof Error ? error.message : "Stripe invoice request failed.",
        });
      }
    }

    return jsonResponse({
      batchId,
      sentCount: results.filter((result) => result.ok).length,
      failedCount: results.filter((result) => !result.ok).length,
      results,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Could not send tuition invoices." },
      500
    );
  }
});
