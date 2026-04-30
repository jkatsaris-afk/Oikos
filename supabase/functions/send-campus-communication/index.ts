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

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
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
    const channel = String(body?.channel || "text");
    const accountId = String(body?.accountId || "");
    const communicationId = String(body?.communicationId || "");
    const subject = String(body?.subject || "").trim();
    const messageBody = String(body?.messageBody || "").trim();
    const recipients = Array.isArray(body?.recipients) ? body.recipients : [];

    if (!accountId || !messageBody || recipients.length === 0) {
      return jsonResponse({ error: "Missing message payload." }, 400);
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
      .select("id, integrations")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      return jsonResponse({ error: "Organization not found." }, 404);
    }

    let summary: Record<string, unknown>;

    if (channel === "email") {
      const email = account.integrations?.email || {};
      if (email.enabled !== true) {
        return jsonResponse({ error: "Email is not enabled for this organization." }, 400);
      }

      const provider = String(email.provider || "resend").trim().toLowerCase();
      const fromName = String(email.fromName || "").trim();
      const fromEmail = String(email.fromEmail || "").trim();
      const replyToEmail = String(email.replyToEmail || "").trim();

      if (!fromEmail) {
        return jsonResponse({ error: "Email settings are incomplete." }, 400);
      }

      const to = recipients
        .map((recipient: any) => String(recipient.destination || "").trim())
        .filter(Boolean);
      const emailSubject = subject || "Campus Message";
      const htmlBody = `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap;">${escapeHtml(messageBody)}</div>`;
      const fromValue = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      if (provider === "sendgrid") {
        const apiKey = String(email.sendgridApiKey || "").trim();
        if (!apiKey) {
          return jsonResponse({ error: "SendGrid settings are incomplete." }, 400);
        }

        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: to.map((address) => ({ email: address })) }],
            from: { email: fromEmail, name: fromName || undefined },
            subject: emailSubject,
            content: [
              { type: "text/plain", value: messageBody },
              { type: "text/html", value: htmlBody },
            ],
            reply_to: replyToEmail ? { email: replyToEmail } : undefined,
          }),
        });

        if (!response.ok) {
          const payload = await response.json();
          const providerError =
            Array.isArray(payload?.errors) && payload.errors[0]?.message
              ? payload.errors[0].message
              : payload?.message || "SendGrid request failed.";
          return jsonResponse({ error: providerError }, 400);
        }

        summary = {
          sentCount: to.length,
          failedCount: 0,
          emailId: "",
          results: to.map((destination) => ({
            destination,
            ok: true,
          })),
        };
      } else if (provider === "mailgun") {
        const apiKey = String(email.mailgunApiKey || "").trim();
        const domain = String(email.mailgunDomain || "").trim();
        const region = String(email.mailgunRegion || "us").trim().toLowerCase();
        if (!apiKey || !domain) {
          return jsonResponse({ error: "Mailgun settings are incomplete." }, 400);
        }

        const endpointBase =
          region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
        const body = new URLSearchParams();
        body.set("from", fromValue);
        body.set("to", to.join(","));
        body.set("subject", emailSubject);
        body.set("text", messageBody);
        body.set("html", htmlBody);
        if (replyToEmail) {
          body.set("h:Reply-To", replyToEmail);
        }

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
          return jsonResponse(
            { error: payload?.message || payload?.error || "Mailgun request failed." },
            400
          );
        }

        summary = {
          sentCount: to.length,
          failedCount: 0,
          emailId: payload?.id || "",
          results: to.map((destination) => ({
            destination,
            ok: true,
            id: payload?.id || "",
          })),
        };
      } else if (provider === "postmark") {
        const serverToken = String(email.postmarkServerToken || "").trim();
        const messageStream = String(email.postmarkMessageStream || "outbound").trim();
        if (!serverToken) {
          return jsonResponse({ error: "Postmark settings are incomplete." }, 400);
        }

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
            Subject: emailSubject,
            TextBody: messageBody,
            HtmlBody: htmlBody,
            ReplyTo: replyToEmail || undefined,
            MessageStream: messageStream || "outbound",
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          return jsonResponse(
            { error: payload?.Message || payload?.ErrorCode || "Postmark request failed." },
            400
          );
        }

        summary = {
          sentCount: to.length,
          failedCount: 0,
          emailId: payload?.MessageID || "",
          results: to.map((destination) => ({
            destination,
            ok: true,
            id: payload?.MessageID || "",
          })),
        };
      } else {
        const apiKey = String(email.resendApiKey || "").trim();
        if (!apiKey) {
          return jsonResponse({ error: "Resend settings are incomplete." }, 400);
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromValue,
            to,
            subject: emailSubject,
            text: messageBody,
            html: htmlBody,
            reply_to: replyToEmail || undefined,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          return jsonResponse(
            { error: payload?.message || payload?.error || "Email request failed." },
            400
          );
        }

        summary = {
          sentCount: to.length,
          failedCount: 0,
          emailId: payload?.id || "",
          results: to.map((destination) => ({
            destination,
            ok: true,
            id: payload?.id || "",
          })),
        };
      }
    } else {
      const twilio = account.integrations?.twilio || {};
      if (twilio.enabled !== true) {
        return jsonResponse({ error: "Twilio is not enabled for this organization." }, 400);
      }

      const accountSid = String(twilio.accountSid || "").trim();
      const authToken = String(twilio.authToken || "").trim();
      const fromNumber = String(twilio.phoneNumber || "").trim();
      const messagingServiceSid = String(twilio.messagingServiceSid || "").trim();

      if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
        return jsonResponse({ error: "Twilio credentials are incomplete." }, 400);
      }

      const authValue = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
      const results = await Promise.all(
        recipients.map(async (recipient: any) => {
          const params = new URLSearchParams();
          params.set("To", String(recipient.destination || "").trim());
          params.set("Body", messageBody);
          if (messagingServiceSid) {
            params.set("MessagingServiceSid", messagingServiceSid);
          } else {
            params.set("From", fromNumber);
          }

          try {
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: authValue,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
              }
            );

            const payload = await response.json();
            if (!response.ok) {
              return {
                destination: recipient.destination,
                ok: false,
                error: payload?.message || "Twilio request failed.",
              };
            }

            return {
              destination: recipient.destination,
              ok: true,
              sid: payload?.sid || "",
              status: payload?.status || "queued",
            };
          } catch (error) {
            return {
              destination: recipient.destination,
              ok: false,
              error: error instanceof Error ? error.message : "Unknown send error.",
            };
          }
        })
      );

      const sentItems = results.filter((item) => item.ok);
      const failedItems = results.filter((item) => !item.ok);
      summary = {
        sentCount: sentItems.length,
        failedCount: failedItems.length,
        messageSids: sentItems.map((item) => item.sid).filter(Boolean),
        results,
      };
    }

    if (communicationId) {
      await adminClient
        .from("campus_communications")
        .update({
          status: Number(summary.failedCount || 0) > 0 ? "partial" : "sent",
          external_reference: String(summary.emailId || (summary.messageSids as string[] | undefined)?.[0] || ""),
          metadata: {
            deliveryResults: summary.results || [],
          },
          sent_at: new Date().toISOString(),
        })
        .eq("id", communicationId)
        .eq("account_id", accountId);
    }

    return jsonResponse(summary, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected function error.";
    return jsonResponse({ error: message }, 500);
  }
});
