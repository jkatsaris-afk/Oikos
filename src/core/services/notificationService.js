import { supabase } from "../../auth/supabaseClient";

export async function sendUserNotification({
  accountId,
  to,
  recipients,
  subject,
  text,
  body,
  html = "",
  replyTo = "",
  type = "general",
  metadata = {},
}) {
  if (!accountId) {
    throw new Error("Missing organization account.");
  }

  const destination = recipients || to;
  const hasRecipients = Array.isArray(destination)
    ? destination.length > 0
    : String(destination || "").trim() !== "";

  if (!hasRecipients) {
    throw new Error("Add at least one notification recipient.");
  }

  if (!String(subject || "").trim()) {
    throw new Error("Notification subject is required.");
  }

  if (!String(text || body || "").trim()) {
    throw new Error("Notification message is required.");
  }

  const { data, error } = await supabase.functions.invoke("send-user-notification", {
    body: {
      accountId,
      recipients: destination,
      subject,
      text: text || body,
      html,
      replyTo,
      type,
      metadata,
    },
  });

  if (error) {
    const message = String(error?.message || "");
    if (
      message.includes("Failed to send a request to the Edge Function") ||
      message.includes("Failed to fetch")
    ) {
      throw new Error(
        "The notification function is not reachable yet. Deploy the `send-user-notification` Supabase Edge Function, then try again."
      );
    }

    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data || { ok: true };
}
