import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POLICY_SCOPE = "https://www.googleapis.com/auth/chrome.management.policy";
const ORGUNIT_SCOPE = "https://www.googleapis.com/auth/admin.directory.orgunit.readonly";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CHROME_POLICY_URL = "https://chromepolicy.googleapis.com/v1";
const DIRECTORY_URL = "https://admin.googleapis.com/admin/directory/v1";
const DEFAULT_EXTENSION_UPDATE_URL = "https://clients2.google.com/service/update2/crx";
const GOOGLE_SIGN_IN_ALLOWED_HOSTS = [
  "accounts.google.com",
  "accounts.gstatic.com",
  "calendar.google.com",
  "classroom.google.com",
  "clients1.google.com",
  "clients2.google.com",
  "clients3.google.com",
  "clients4.google.com",
  "clients5.google.com",
  "clients6.google.com",
  "content.googleapis.com",
  "docs.google.com",
  "drive.google.com",
  "google.com",
  "myaccount.google.com",
  "mail.google.com",
  "ogs.google.com",
  "oauth2.googleapis.com",
  "apis.google.com",
  "ssl.gstatic.com",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
  "gstatic.com",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToBytes(pem: string) {
  const clean = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function createGoogleAccessToken(subjectOverride = "") {
  const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY") || "";
  const subject = String(subjectOverride || Deno.env.get("GOOGLE_ADMIN_SUBJECT") || "").trim();

  if (!clientEmail || !privateKey) {
    throw new Error("Google service account secrets are missing.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim: Record<string, unknown> = {
    iss: clientEmail,
    scope: `${POLICY_SCOPE} ${ORGUNIT_SCOPE}`,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  if (subject) {
    claim.sub = subject;
  }

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "Could not authorize Google Chrome Policy API.");
  }

  return String(payload.access_token || "");
}

function normalizeExtensionId(value = "") {
  return String(value || "")
    .trim()
    .replace(/^chrome:/i, "")
    .toLowerCase();
}

function normalizeHost(value = "") {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "";
  if (clean.startsWith("*.")) return clean;

  try {
    return new URL(/^https?:\/\//i.test(clean) ? clean : `https://${clean}`).hostname.replace(/^www\./, "");
  } catch (_error) {
    return clean.replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

async function googleJson(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error_description || "Google API request failed.");
  }

  return payload;
}

async function resolveOrgUnitResource(customerId: string, orgUnitPath: string, accessToken: string) {
  const clean = String(orgUnitPath || "").trim();
  if (!clean) {
    throw new Error("Google Org Unit Path or ID is required.");
  }
  if (clean.startsWith("orgunits/")) return clean;
  if (clean.startsWith("id:")) return `orgunits/${clean.slice(3)}`;
  if (!clean.startsWith("/")) return `orgunits/${clean}`;

  if (clean === "/") {
    throw new Error("Use the root Org Unit ID for the top-level organization.");
  }

  const path = clean.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  const url = `${DIRECTORY_URL}/customer/${encodeURIComponent(customerId)}/orgunits/${path}`;
  const orgUnit = await googleJson(url, accessToken);
  if (!orgUnit?.orgUnitId) {
    throw new Error(`Google Org Unit was not found: ${clean}`);
  }

  return `orgunits/${orgUnit.orgUnitId}`;
}

function buildManagedConfiguration(settings: Record<string, unknown>, appHosts: string[]) {
  const homeUrl = String(settings.oikosHomeUrl || "").trim();
  const allowedHosts = Array.from(
    new Set([
      normalizeHost(homeUrl),
      ...GOOGLE_SIGN_IN_ALLOWED_HOSTS,
      ...((Array.isArray(settings.allowedHosts) ? settings.allowedHosts : []) as string[]).map(normalizeHost),
      ...appHosts.map(normalizeHost),
    ].filter(Boolean)),
  );

  return {
    oikosHomeUrl: homeUrl,
    allowedHosts,
    blockUnknownHosts: settings.blockUnknownHosts !== false,
    overlayEnabled: settings.overlayEnabled !== false,
  };
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
    if (!accountId) {
      return jsonResponse({ error: "Missing Edu organization." }, 400);
    }

    const { data: account, error: accountError } = await adminClient
      .from("accounts")
      .select("id, name, type, owner_user_id, integrations")
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

    const settings = account.integrations?.eduStudentDevice?.chromeExtension || {};
    const customerId = String(settings.googleCustomerId || "").trim();
    const googleAdminEmail = String(settings.googleAdminEmail || "").trim();
    const orgUnitPath = String(settings.googleOrgUnitPath || "").trim();
    const extensionId = normalizeExtensionId(String(settings.extensionId || ""));
    const extensionUpdateUrl = String(settings.extensionUpdateUrl || DEFAULT_EXTENSION_UPDATE_URL).trim();

    if (!customerId) throw new Error("Google Customer ID is required.");
    if (!googleAdminEmail) throw new Error("Google Admin Email is required.");
    if (!extensionId) throw new Error("Chrome Extension ID is required.");
    if (!String(settings.oikosHomeUrl || "").trim()) throw new Error("Student Home URL is required.");

    const { data: apps, error: appsError } = await adminClient
      .from("edu_student_device_apps")
      .select("url")
      .eq("account_id", accountId)
      .eq("is_active", true);

    if (appsError) {
      throw appsError;
    }

    const { data: systemApps, error: systemAppsError } = await adminClient
      .from("edu_student_device_system_apps")
      .select("url")
      .eq("is_globally_enabled", true);

    if (systemAppsError) {
      throw systemAppsError;
    }

    const accessToken = await createGoogleAccessToken(googleAdminEmail);
    const targetResource = await resolveOrgUnitResource(customerId, orgUnitPath, accessToken);
    const appId = `chrome:${extensionId}`;
    const managedConfiguration = buildManagedConfiguration(
      settings,
      [
        ...(apps || []).map((app: { url?: string }) => app.url || ""),
        ...(systemApps || []).map((app: { url?: string }) => app.url || ""),
      ],
    );

    const requests: Array<Record<string, unknown>> = [
      {
        policyTargetKey: {
          targetResource,
          additionalTargetKeys: {
            app_id: appId,
          },
        },
        policyValue: {
          policySchema: "chrome.users.apps.InstallType",
          value: {
            appInstallType: "FORCED",
          },
        },
        updateMask: "appInstallType",
      },
      {
        policyTargetKey: {
          targetResource,
          additionalTargetKeys: {
            app_id: appId,
          },
        },
        policyValue: {
          policySchema: "chrome.users.apps.ManagedConfiguration",
          value: {
            managedConfiguration: JSON.stringify(managedConfiguration),
          },
        },
        updateMask: "managedConfiguration",
      },
    ];

    if (extensionUpdateUrl && extensionUpdateUrl !== DEFAULT_EXTENSION_UPDATE_URL) {
      requests.push(
        {
          policyTargetKey: {
            targetResource,
            additionalTargetKeys: {
              app_id: appId,
            },
          },
          policyValue: {
            policySchema: "chrome.users.apps.AppInstallationUrl",
            value: {
              installationUrl: extensionUpdateUrl,
            },
          },
          updateMask: "installationUrl",
        },
        {
          policyTargetKey: {
            targetResource,
            additionalTargetKeys: {
              app_id: appId,
            },
          },
          policyValue: {
            policySchema: "chrome.users.apps.OverrideInstallationUrl",
            value: {
              overrideInstallationUrl: true,
            },
          },
          updateMask: "overrideInstallationUrl",
        },
      );
    }

    await googleJson(`${CHROME_POLICY_URL}/customers/${encodeURIComponent(customerId)}/policies/orgunits:batchModify`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });

    const nextIntegrations = {
      ...(account.integrations || {}),
      eduStudentDevice: {
        ...(account.integrations?.eduStudentDevice || {}),
        chromeExtension: {
          ...settings,
          lastPolicySyncAt: new Date().toISOString(),
          lastPolicySyncTarget: targetResource,
        },
      },
    };

    await adminClient
      .from("accounts")
      .update({ integrations: nextIntegrations })
      .eq("id", accountId);

    return jsonResponse({
      ok: true,
      message: "Chrome policy pushed to Google.",
      targetResource,
      managedConfiguration,
    });
  } catch (error) {
    console.error("sync-edu-chrome-policy error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected Chrome policy sync error.",
      },
      500,
    );
  }
});
