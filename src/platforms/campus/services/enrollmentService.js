import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";

const CAMPUS_ENROLLMENT_SETTINGS_TABLE = "campus_enrollment_settings";
const CAMPUS_ENROLLMENT_SUBMISSIONS_TABLE = "campus_enrollment_submissions";
const DEFAULT_ACCENT = "#134e4a";

function createPublicCode() {
  return `campus-${Math.random().toString(36).slice(2, 10)}`;
}

function toIsoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

export function isEnrollmentCurrentlyOpen(settings = {}, now = new Date()) {
  if (!settings?.isActive) {
    return false;
  }

  if (settings.isManualOpen) {
    return true;
  }

  if (!settings.autoScheduleEnabled || !settings.autoOpenAt || !settings.autoCloseAt) {
    return false;
  }

  const current = now.getTime();
  const startsAt = new Date(settings.autoOpenAt).getTime();
  const closesAt = new Date(settings.autoCloseAt).getTime();

  return current >= startsAt && current <= closesAt;
}

function normalizeSettings(row = {}, account = null) {
  return {
    id: row.id || "",
    accountId: row.account_id || account?.id || "",
    publicCode: row.public_code || "",
    isActive: row.is_active !== false,
    isManualOpen: row.is_manual_open === true,
    autoScheduleEnabled: row.auto_schedule_enabled === true,
    autoOpenAt: row.auto_open_at || "",
    autoCloseAt: row.auto_close_at || "",
    schoolNameOverride: row.school_name_override || "",
    accentColor: row.accent_color || DEFAULT_ACCENT,
    formTitle: row.form_title || `${account?.name || "Campus"} Enrollment Application`,
    formIntro:
      row.form_intro ||
      "Complete this form to begin the enrollment process. A staff member will review your submission and follow up.",
    successMessage:
      row.success_message || "Your enrollment form has been received.",
    confirmationEmail: row.confirmation_email || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    organizationName: account?.name || "",
    organizationLogoUrl: account?.logo_url || "",
  };
}

function normalizeSubmission(row = {}) {
  const submissionData = row.submission_data || {};

  return {
    id: row.id || "",
    accountId: row.account_id || "",
    settingsId: row.settings_id || "",
    publicCode: row.public_code || "",
    status: row.status || "new",
    studentFirstName: row.student_first_name || "",
    studentLastName: row.student_last_name || "",
    preferredName: row.preferred_name || "",
    dateOfBirth: row.date_of_birth || "",
    gradeApplyingFor: row.grade_applying_for || "",
    schoolYear: row.school_year || "",
    currentSchool: row.current_school || "",
    guardianName: row.guardian_name || "",
    guardianEmail: row.guardian_email || "",
    guardianPhone: row.guardian_phone || "",
    submittedAt: row.submitted_at || row.created_at || "",
    internalNotes: row.internal_notes || "",
    submissionData,
  };
}

async function getCampusAccount(userId) {
  const access = await fetchOrganizationAccess(userId, "campus");
  return access?.account || null;
}

async function ensureSettingsForAccount(account, userId) {
  const { data: existing, error: lookupError } = await supabase
    .from(CAMPUS_ENROLLMENT_SETTINGS_TABLE)
    .select("*")
    .eq("account_id", account.id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    return normalizeSettings(existing, account);
  }

  const payload = {
    account_id: account.id,
    created_by: userId,
    public_code: createPublicCode(),
    school_name_override: account.name || "",
    accent_color: DEFAULT_ACCENT,
    form_title: `${account.name || "Campus"} Enrollment Application`,
    form_intro:
      "Complete this form to begin the enrollment process. A staff member will review your submission and follow up.",
    success_message: "Your enrollment form has been received.",
  };

  const { data: created, error: createError } = await supabase
    .from(CAMPUS_ENROLLMENT_SETTINGS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return normalizeSettings(created, account);
}

export async function loadCampusEnrollmentDashboard(userId) {
  if (!userId) {
    return { account: null, settings: null, submissions: [] };
  }

  const account = await getCampusAccount(userId);

  if (!account?.id) {
    return { account: null, settings: null, submissions: [] };
  }

  const settings = await ensureSettingsForAccount(account, userId);

  const { data: submissionRows, error: submissionsError } = await supabase
    .from(CAMPUS_ENROLLMENT_SUBMISSIONS_TABLE)
    .select("*")
    .eq("account_id", account.id)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (submissionsError) {
    throw submissionsError;
  }

  return {
    account,
    settings,
    submissions: Array.isArray(submissionRows)
      ? submissionRows.map((row) => normalizeSubmission(row))
      : [],
  };
}

export async function saveCampusEnrollmentSettings(userId, updates = {}) {
  const account = await getCampusAccount(userId);

  if (!account?.id) {
    throw new Error("Missing campus organization.");
  }

  const current = await ensureSettingsForAccount(account, userId);
  const payload = {
    is_active: updates.isActive ?? current.isActive,
    is_manual_open: updates.isManualOpen ?? current.isManualOpen,
    auto_schedule_enabled:
      updates.autoScheduleEnabled ?? current.autoScheduleEnabled,
    public_code: updates.publicCode ?? current.publicCode,
    auto_open_at:
      updates.autoOpenAt !== undefined
        ? toIsoOrNull(updates.autoOpenAt)
        : toIsoOrNull(current.autoOpenAt),
    auto_close_at:
      updates.autoCloseAt !== undefined
        ? toIsoOrNull(updates.autoCloseAt)
        : toIsoOrNull(current.autoCloseAt),
    school_name_override:
      updates.schoolNameOverride ?? current.schoolNameOverride,
    accent_color: updates.accentColor ?? current.accentColor,
    form_title: updates.formTitle ?? current.formTitle,
    form_intro: updates.formIntro ?? current.formIntro,
    success_message: updates.successMessage ?? current.successMessage,
    confirmation_email:
      updates.confirmationEmail ?? current.confirmationEmail,
  };

  const { data, error } = await supabase
    .from(CAMPUS_ENROLLMENT_SETTINGS_TABLE)
    .update(payload)
    .eq("account_id", account.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeSettings(data, account);
}

export async function regenerateCampusEnrollmentPublicCode(userId) {
  return saveCampusEnrollmentSettings(userId, {
    publicCode: createPublicCode(),
  });
}

export async function updateCampusEnrollmentSubmission(userId, submissionId, updates = {}) {
  const account = await getCampusAccount(userId);

  if (!account?.id || !submissionId) {
    throw new Error("Missing campus organization or submission.");
  }

  const payload = {};

  if (typeof updates.status === "string") {
    payload.status = updates.status.trim() || "new";
  }

  if (typeof updates.internalNotes === "string") {
    payload.internal_notes = updates.internalNotes;
  }

  const { data, error } = await supabase
    .from(CAMPUS_ENROLLMENT_SUBMISSIONS_TABLE)
    .update(payload)
    .eq("id", submissionId)
    .eq("account_id", account.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeSubmission(data);
}

export async function loadCampusEnrollmentPublicView(publicCode) {
  const { data, error } = await supabase.rpc("get_campus_enrollment_public_view", {
    target_code: publicCode,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return null;
  }

  return {
    settingsId: row.settings_id || "",
    accountId: row.account_id || "",
    publicCode: row.public_code || publicCode,
    schoolName: row.school_name || "Campus Enrollment",
    schoolLogoUrl: row.school_logo_url || "",
    accentColor: row.accent_color || DEFAULT_ACCENT,
    formTitle: row.form_title || "Enrollment Application",
    formIntro: row.form_intro || "",
    successMessage: row.success_message || "Your enrollment form has been received.",
    isOpen: row.is_open === true,
    autoOpenAt: row.auto_open_at || "",
    autoCloseAt: row.auto_close_at || "",
  };
}

export async function submitCampusEnrollment(publicCode, formData = {}) {
  const { data, error } = await supabase.rpc("submit_campus_enrollment", {
    target_code: publicCode,
    submission: formData,
  });

  if (error) {
    throw error;
  }

  return data;
}

export function getCampusEnrollmentWidgetStats(settings, submissions = []) {
  const open = isEnrollmentCurrentlyOpen(settings);
  const newCount = submissions.filter((item) => item.status === "new").length;

  return {
    isOpen: open,
    totalSubmissions: submissions.length,
    newSubmissions: newCount,
    latestName:
      submissions[0]
        ? `${submissions[0].studentFirstName} ${submissions[0].studentLastName}`.trim()
        : "No submissions",
  };
}
