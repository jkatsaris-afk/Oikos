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

function isAlreadyRegisteredError(error: unknown) {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return (
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already registered")
  );
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
    const accountId = String(body?.accountId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const recipientName = String(body?.recipientName || "").trim();
    const redirectTo = String(body?.redirectTo || "").trim();
    const staffId = String(body?.staffId || "").trim();

    if (!accountId || !email) {
      return jsonResponse({ error: "Missing account or invite email." }, 400);
    }

    const { data: ownerAccount } = await userClient
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    let hasOwnerAccess = Boolean(ownerAccount?.id);

    if (!hasOwnerAccess) {
      const { data: ownerMembership } = await userClient
        .from("account_members")
        .select("account_id")
        .eq("account_id", accountId)
        .eq("user_id", user.id)
        .eq("role", "owner")
        .eq("status", "active")
        .maybeSingle();

      hasOwnerAccess = Boolean(ownerMembership?.account_id);
    }

    if (!hasOwnerAccess) {
      return jsonResponse({ error: "Only organization owners can send invites." }, 403);
    }

    const { data: account, error: accountError } = await adminClient
      .from("accounts")
      .select("id, name, type, invite_code")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      return jsonResponse({ error: "Organization not found." }, 404);
    }

    let invitedUserId = "";
    let delivery = "sent";
    let message = `Invite email sent to ${email}.`;

    const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
      data: {
        full_name: recipientName,
        organization_name: account.name || "",
        organization_type: account.type || "",
        invite_code: account.invite_code || "",
        invited_account_id: account.id,
      },
    });

    if (inviteResult.error) {
      if (!isAlreadyRegisteredError(inviteResult.error)) {
        return jsonResponse({ error: inviteResult.error.message || "Could not send invite." }, 400);
      }

      delivery = "existing_user";
      message = `${email} already has an Oikos account. Membership access was updated instead of sending a new invite email.`;
    } else {
      invitedUserId = inviteResult.data.user?.id || "";
    }

    if (!invitedUserId) {
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id, full_name")
        .eq("email", email)
        .maybeSingle();

      invitedUserId = existingProfile?.id || "";
    }

    if (invitedUserId) {
      await adminClient.from("profiles").upsert(
        {
          id: invitedUserId,
          email,
          full_name: recipientName || null,
        },
        {
          onConflict: "id",
        }
      );

      await adminClient.from("account_members").upsert(
        {
          account_id: accountId,
          user_id: invitedUserId,
          role: "member",
          status: "pending",
        },
        {
          onConflict: "account_id,user_id",
        }
      );

      if (staffId) {
        await adminClient
          .from("campus_staff")
          .update({ linked_user_id: invitedUserId })
          .eq("id", staffId)
          .eq("account_id", accountId);
      }
    }

    return jsonResponse({
      ok: true,
      delivery,
      invitedUserId,
      message,
    });
  } catch (error) {
    console.error("send-organization-invite error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected invite error.",
      },
      500
    );
  }
});
