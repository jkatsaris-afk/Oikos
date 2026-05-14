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
    const teacherId = String(body?.teacherId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const teacherName = String(body?.teacherName || "").trim();
    const redirectTo = String(body?.redirectTo || "").trim();

    if (!accountId || !teacherId || !email) {
      return jsonResponse({ error: "Missing teacher account invite details." }, 400);
    }

    const { data: account, error: accountError } = await adminClient
      .from("accounts")
      .select("id, name, type, owner_user_id")
      .eq("id", accountId)
      .eq("type", "edu")
      .single();

    if (accountError || !account) {
      return jsonResponse({ error: "Edu organization not found." }, 404);
    }

    const { data: membership } = await adminClient
      .from("account_members")
      .select("account_id, role, status")
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const canManage = account.owner_user_id === user.id || Boolean(membership?.account_id);

    if (!canManage) {
      return jsonResponse({ error: "You do not have access to this Edu organization." }, 403);
    }

    const { data: teacher, error: teacherError } = await adminClient
      .from("edu_teachers")
      .select("id, account_id, display_name, email")
      .eq("id", teacherId)
      .eq("account_id", accountId)
      .single();

    if (teacherError || !teacher) {
      return jsonResponse({ error: "Teacher record not found." }, 404);
    }

    let invitedUserId = "";
    let delivery = "sent";
    let message = `Teacher setup email sent to ${email}.`;
    const displayName = teacherName || teacher.display_name || email;

    const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
      data: {
        full_name: displayName,
        organization_name: account.name || "",
        organization_type: "edu",
        teacher_id: teacher.id,
        invited_account_id: account.id,
        portal: "edu_teacher",
      },
    });

    if (inviteResult.error) {
      if (!isAlreadyRegisteredError(inviteResult.error)) {
        return jsonResponse({ error: inviteResult.error.message || "Could not send teacher invite." }, 400);
      }

      const resetResult = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || undefined,
      });

      if (resetResult.error) {
        return jsonResponse(
          { error: resetResult.error.message || "Could not send teacher setup email." },
          400,
        );
      }

      delivery = "existing_user_email_sent";
      message = `${email} already has an Oikos account. A setup email was sent and teacher portal access was updated.`;
    } else {
      invitedUserId = inviteResult.data.user?.id || "";
    }

    if (!invitedUserId) {
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      invitedUserId = existingProfile?.id || "";
    }

    if (!invitedUserId) {
      return jsonResponse({
        ok: true,
        delivery,
        invitedUserId,
        message,
      });
    }

    await adminClient.from("profiles").upsert(
      {
        id: invitedUserId,
        email,
        full_name: displayName,
        is_approved: true,
        metadata: {
          approval_status: "approved",
          edu_teacher_id: teacher.id,
          edu_account_id: account.id,
        },
      },
      {
        onConflict: "id",
      },
    );

    await adminClient.from("account_members").upsert(
      {
        account_id: accountId,
        user_id: invitedUserId,
        role: "member",
        status: "active",
      },
      {
        onConflict: "account_id,user_id",
      },
    );

    const { data: existingAccess } = await adminClient
      .from("user_access")
      .select("id")
      .eq("user_id", invitedUserId)
      .eq("platform", "edu")
      .eq("mode", "teacher_portal")
      .limit(1);

    if (existingAccess?.[0]?.id) {
      await adminClient
        .from("user_access")
        .update({ has_access: true })
        .eq("id", existingAccess[0].id);
    } else {
      await adminClient.from("user_access").insert(
      {
        user_id: invitedUserId,
        platform: "edu",
        mode: "teacher_portal",
        has_access: true,
      },
      );
    }

    await adminClient
      .from("edu_teachers")
      .update({
        linked_user_id: invitedUserId,
        email,
      })
      .eq("id", teacher.id)
      .eq("account_id", accountId);

    return jsonResponse({
      ok: true,
      delivery,
      invitedUserId,
      message,
    });
  } catch (error) {
    console.error("send-edu-teacher-invite error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected teacher invite error.",
      },
      500,
    );
  }
});
