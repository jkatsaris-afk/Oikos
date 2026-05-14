import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Recipient = {
  email: string;
  name?: string;
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

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRecipients(value: unknown): Recipient[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((email) => ({ email: email.trim().toLowerCase() }))
      .filter((recipient) => recipient.email);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((recipient) => {
      if (typeof recipient === "string") {
        return { email: recipient.trim().toLowerCase() };
      }

      return {
        email: String((recipient as { email?: string })?.email || "").trim().toLowerCase(),
        name: String((recipient as { name?: string })?.name || "").trim(),
      };
    })
    .filter((recipient) => recipient.email);
}

function getProviderError(payload: any, fallback: string) {
  if (Array.isArray(payload?.errors) && payload.errors[0]?.message) {
    return payload.errors[0].message;
  }

  return payload?.message || payload?.error || payload?.Message || payload?.ErrorCode || fallback;
}

function getSystemEmailSettings() {
  return {
    provider: Deno.env.get("OIKOS_SYSTEM_EMAIL_PROVIDER") || "resend",
    fromName: Deno.env.get("OIKOS_SYSTEM_EMAIL_FROM_NAME") || "Oikos",
    fromEmail: Deno.env.get("OIKOS_SYSTEM_EMAIL_FROM_EMAIL") || "",
    replyToEmail: Deno.env.get("OIKOS_SYSTEM_EMAIL_REPLY_TO") || "",
    resendApiKey: Deno.env.get("OIKOS_RESEND_API_KEY") || "",
    sendgridApiKey: Deno.env.get("OIKOS_SENDGRID_API_KEY") || "",
    mailgunApiKey: Deno.env.get("OIKOS_MAILGUN_API_KEY") || "",
    mailgunDomain: Deno.env.get("OIKOS_MAILGUN_DOMAIN") || "",
    mailgunRegion: Deno.env.get("OIKOS_MAILGUN_REGION") || "us",
    postmarkServerToken: Deno.env.get("OIKOS_POSTMARK_SERVER_TOKEN") || "",
    postmarkMessageStream: Deno.env.get("OIKOS_POSTMARK_MESSAGE_STREAM") || "outbound",
  };
}

async function sendEmail({
  emailSettings,
  recipients,
  subject,
  text,
  html,
  replyTo,
}: {
  emailSettings: any;
  recipients: Recipient[];
  subject: string;
  text: string;
  html: string;
  replyTo: string;
}) {
  const provider = String(emailSettings.provider || "resend").trim().toLowerCase();
  const fromName = String(emailSettings.fromName || "").trim();
  const fromEmail = String(emailSettings.fromEmail || "").trim();
  const replyToEmail = replyTo || String(emailSettings.replyToEmail || "").trim();
  const to = recipients.map((recipient) => recipient.email);
  const fromValue = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  if (!fromEmail) {
    throw new Error("Email settings are incomplete.");
  }

  if (provider === "sendgrid") {
    const apiKey = String(emailSettings.sendgridApiKey || "").trim();
    if (!apiKey) throw new Error("SendGrid settings are incomplete.");

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: to.map((address) => ({ email: address })) }],
        from: { email: fromEmail, name: fromName || undefined },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
        reply_to: replyToEmail ? { email: replyToEmail } : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(getProviderError(await response.json(), "SendGrid request failed."));
    }

    return { emailId: "", provider };
  }

  if (provider === "mailgun") {
    const apiKey = String(emailSettings.mailgunApiKey || "").trim();
    const domain = String(emailSettings.mailgunDomain || "").trim();
    const region = String(emailSettings.mailgunRegion || "us").trim().toLowerCase();
    if (!apiKey || !domain) throw new Error("Mailgun settings are incomplete.");

    const endpointBase = region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
    const body = new URLSearchParams();
    body.set("from", fromValue);
    body.set("to", to.join(","));
    body.set("subject", subject);
    body.set("text", text);
    body.set("html", html);
    if (replyToEmail) body.set("h:Reply-To", replyToEmail);

    const response = await fetch(`${endpointBase}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(getProviderError(payload, "Mailgun request failed."));
    }

    return { emailId: payload?.id || "", provider };
  }

  if (provider === "postmark") {
    const serverToken = String(emailSettings.postmarkServerToken || "").trim();
    const messageStream = String(emailSettings.postmarkMessageStream || "outbound").trim();
    if (!serverToken) throw new Error("Postmark settings are incomplete.");

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": serverToken,
      },
      body: JSON.stringify({
        From: fromValue,
        To: to.join(","),
        Subject: subject,
        TextBody: text,
        HtmlBody: html,
        ReplyTo: replyToEmail || undefined,
        MessageStream: messageStream || "outbound",
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(getProviderError(payload, "Postmark request failed."));
    }

    return { emailId: payload?.MessageID || "", provider };
  }

  const apiKey = String(emailSettings.resendApiKey || "").trim();
  if (!apiKey) throw new Error("Resend settings are incomplete.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromValue,
      to,
      subject,
      text,
      html,
      reply_to: replyToEmail || undefined,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getProviderError(payload, "Email request failed."));
  }

  return { emailId: payload?.id || "", provider };
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
    const accountId = String(body?.accountId || "").trim();
    const recipients = normalizeRecipients(body?.recipients || body?.to);
    const subject = String(body?.subject || "").trim();
    const text = String(body?.text || body?.body || "").trim();
    const html = String(body?.html || "").trim() || `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
    const replyTo = String(body?.replyTo || "").trim();
    const notificationType = String(body?.type || "general").trim();
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!accountId || recipients.length === 0 || !subject || !text) {
      return jsonResponse({ error: "Missing notification payload." }, 400);
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
        .eq("status", "active")
        .maybeSingle();

      hasAccess = Boolean(membership?.account_id);
    }

    if (!hasAccess) {
      return jsonResponse({ error: "You do not have access to this organization." }, 403);
    }

    const { data: account, error: accountError } = await adminClient
      .from("accounts")
      .select("id, name")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      return jsonResponse({ error: "Organization not found." }, 404);
    }

    const emailSettings = getSystemEmailSettings();

    const delivery = await sendEmail({
      emailSettings,
      recipients,
      subject,
      text,
      html,
      replyTo,
    });

    return jsonResponse({
      ok: true,
      type: notificationType,
      provider: delivery.provider,
      emailId: delivery.emailId,
      sentCount: recipients.length,
      failedCount: 0,
      results: recipients.map((recipient) => ({
        destination: recipient.email,
        name: recipient.name || "",
        ok: true,
        id: delivery.emailId,
      })),
      metadata,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Could not send notification." },
      500,
    );
  }
});
