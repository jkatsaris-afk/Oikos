import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";
import { getTileSettings, saveTileSetting } from "../../../core/settings/localSettingsService";

const CAMPUS_STUDENTS_TABLE = "campus_students";
const CAMPUS_STUDENT_PHOTO_BUCKET = "campus-student-photos";
const STUDENTS_TILE_ID = "students";
const DEFAULT_STUDENT_ID_PREFIX = "STU-";
const DEFAULT_STUDENT_ID_NEXT_NUMBER = 1000;
const DEFAULT_STUDENT_ID_PAD_LENGTH = 4;

function sanitizeFileName(name = "photo") {
  const cleaned = String(name || "photo")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "photo";
}

function createAvatarDataUrl(name = "Student") {
  const initials = String(name || "Student")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f766e" />
          <stop offset="100%" stop-color="#164e63" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="32" fill="url(#bg)" />
      <circle cx="160" cy="124" r="68" fill="rgba(255,255,255,0.18)" />
      <path d="M74 276c16-45 51-72 86-72s70 27 86 72" fill="rgba(255,255,255,0.18)" />
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="86" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST205" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("does not exist"))
  );
}

function extractMissingColumnName(error) {
  const message = String(error?.message || "");
  const matched =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column\s+["']?([^"'\s]+)["']?\s+does not exist/i);

  return matched?.[1] || "";
}

function stripMissingColumnFromPayload(payload, error) {
  const missingColumn = extractMissingColumnName(error);

  if (!missingColumn || !(missingColumn in payload)) {
    return null;
  }

  const nextPayload = { ...payload };
  delete nextPayload[missingColumn];
  return nextPayload;
}

function isUniqueViolation(error) {
  return (
    error?.code === "23505" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("duplicate key"))
  );
}

function normalizePositiveInteger(value, fallback) {
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function buildStudentNumber(prefix, nextNumber, padLength) {
  return `${prefix}${String(nextNumber).padStart(padLength, "0")}`;
}

function normalizeStudent(row = {}) {
  const legalName = [row.legal_first_name, row.legal_middle_name, row.legal_last_name]
    .filter(Boolean)
    .join(" ");
  const preferredName = [row.preferred_first_name, row.preferred_last_name]
    .filter(Boolean)
    .join(" ");
  const displayName = row.display_name || preferredName || legalName || "Unnamed Student";

  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    studentNumber: row.student_number || "",
    stateId: row.state_id || "",
    localId: row.local_id || "",
    campusPersonId: row.campus_person_id || "",
    legalFirstName: row.legal_first_name || "",
    legalMiddleName: row.legal_middle_name || "",
    legalLastName: row.legal_last_name || "",
    legalSuffix: row.legal_suffix || "",
    preferredFirstName: row.preferred_first_name || "",
    preferredLastName: row.preferred_last_name || "",
    displayName,
    dateOfBirth: row.date_of_birth || "",
    gender: row.gender || "",
    sex: row.sex || "",
    gradeLevel: row.grade_level || "",
    schoolName: row.school_name || "",
    campusName: row.campus_name || "",
    homeroomTeacher: row.homeroom_teacher || "",
    counselorName: row.counselor_name || "",
    enrollmentStatus: row.enrollment_status || "",
    currentEnrollmentStatus: row.current_enrollment_status || row.enrollment_status || "",
    enrollmentStartDate: row.enrollment_start_date || "",
    enrollmentEndDate: row.enrollment_end_date || "",
    graduationYear: row.graduation_year || "",
    tuitionPaymentStatus: row.tuition_payment_status || "",
    tuitionBalanceCents: Number(row.tuition_balance_cents || 0) || 0,
    primaryLanguage: row.primary_language || "",
    homeLanguage: row.home_language || "",
    ethnicity: row.ethnicity || "",
    raceEthnicity: Array.isArray(row.race_ethnicity) ? row.race_ethnicity : [],
    photoUrl: row.photo_url || "",
    photoPath: row.photo_path || "",
    householdName: row.household_name || "",
    primaryPhone: row.primary_phone || "",
    primaryEmail: row.primary_email || "",
    streetAddress1: row.street_address_1 || "",
    streetAddress2: row.street_address_2 || "",
    city: row.city || "",
    state: row.state || "",
    postalCode: row.postal_code || "",
    demographics: row.demographics || {},
    guardians: Array.isArray(row.guardians) ? row.guardians : [],
    emergencyContacts: Array.isArray(row.emergency_contacts) ? row.emergency_contacts : [],
    medical: row.medical || {},
    disciplinary: Array.isArray(row.disciplinary) ? row.disciplinary : [],
    parentContactLog: Array.isArray(row.parent_contact_log) ? row.parent_contact_log : [],
    enrollment: row.enrollment || {},
    programParticipation: row.program_participation || {},
    tags: Array.isArray(row.tags) ? row.tags : [],
    customFields: row.custom_fields || {},
    isActive: row.is_active !== false,
  };
}

async function signPhotoUrls(students = []) {
  const photoStudents = students.filter((student) => student.photoPath && !student.photoUrl);

  if (photoStudents.length === 0) {
    return students.map((student) => ({
      ...student,
      photoUrl: student.photoUrl || createAvatarDataUrl(student.displayName),
    }));
  }

  const uniquePaths = Array.from(new Set(photoStudents.map((student) => student.photoPath)));
  const { data, error } = await supabase.storage
    .from(CAMPUS_STUDENT_PHOTO_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60 * 24 * 30);

  if (error) {
    console.error("Campus student photo signing error:", error);
    return students.map((student) => ({
      ...student,
      photoUrl: student.photoUrl || createAvatarDataUrl(student.displayName),
    }));
  }

  const signedMap = new Map();
  (data || []).forEach((entry, index) => {
    if (entry?.signedUrl) {
      signedMap.set(uniquePaths[index], entry.signedUrl);
    }
  });

  return students.map((student) => ({
    ...student,
    photoUrl:
      student.photoUrl ||
      signedMap.get(student.photoPath) ||
      createAvatarDataUrl(student.displayName),
  }));
}

async function getCampusAccountId(userId) {
  const access = await fetchOrganizationAccess(userId, "campus");
  return access?.account?.id || null;
}

async function createStudentPhotoSignedUrl(path) {
  if (!path) {
    return "";
  }

  const { data, error } = await supabase.storage
    .from(CAMPUS_STUDENT_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  if (error) {
    console.error("Campus student photo signed URL error:", error);
    return "";
  }

  return data?.signedUrl || "";
}

export function getCampusStudentIdDefaults() {
  if (typeof window === "undefined") {
    return {
      prefix: DEFAULT_STUDENT_ID_PREFIX,
      nextNumber: DEFAULT_STUDENT_ID_NEXT_NUMBER,
      padLength: DEFAULT_STUDENT_ID_PAD_LENGTH,
    };
  }

  const settings = getTileSettings(STUDENTS_TILE_ID);
  const storedDefaults = settings?.studentIdDefaults || {};

  return {
    prefix:
      typeof storedDefaults.prefix === "string" && storedDefaults.prefix.trim()
        ? storedDefaults.prefix.trim()
        : DEFAULT_STUDENT_ID_PREFIX,
    nextNumber: normalizePositiveInteger(
      storedDefaults.nextNumber,
      DEFAULT_STUDENT_ID_NEXT_NUMBER
    ),
    padLength: normalizePositiveInteger(
      storedDefaults.padLength,
      DEFAULT_STUDENT_ID_PAD_LENGTH
    ),
  };
}

export function saveCampusStudentIdDefaults(defaults = {}) {
  const normalized = {
    prefix:
      typeof defaults.prefix === "string" && defaults.prefix.trim()
        ? defaults.prefix.trim()
        : DEFAULT_STUDENT_ID_PREFIX,
    nextNumber: normalizePositiveInteger(
      defaults.nextNumber,
      DEFAULT_STUDENT_ID_NEXT_NUMBER
    ),
    padLength: normalizePositiveInteger(
      defaults.padLength,
      DEFAULT_STUDENT_ID_PAD_LENGTH
    ),
  };

  saveTileSetting(STUDENTS_TILE_ID, "studentIdDefaults", normalized);
  return normalized;
}

export async function loadCampusStudents(userId) {
  if (!userId) {
    return [];
  }

  try {
    const accountId = await getCampusAccountId(userId);

    if (!accountId) {
      return [];
    }

    const { data, error } = await supabase
      .from(CAMPUS_STUDENTS_TABLE)
      .select("*")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .order("grade_level", { ascending: true })
      .order("legal_last_name", { ascending: true })
      .order("legal_first_name", { ascending: true });

    if (error) {
      throw error;
    }

    const students = Array.isArray(data) ? data.map((row) => normalizeStudent(row)) : [];

    return signPhotoUrls(students);
  } catch (error) {
    console.error("Campus students load error:", error);
    return [];
  }
}

export function searchCampusStudents(students = [], query = "") {
  const normalized = String(query || "").trim().toLowerCase();

  if (!normalized) {
    return students;
  }

  return students.filter((student) =>
    [
      student.displayName,
      student.studentNumber,
      student.stateId,
      student.localId,
      student.gradeLevel,
      student.schoolName,
      student.homeroomTeacher,
      student.currentEnrollmentStatus,
      student.tuitionPaymentStatus,
      student.primaryEmail,
      student.primaryPhone,
      ...(student.tags || []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized))
  );
}

export function getCampusStudentsWidgetStats(students = []) {
  const activeStudents = students.filter((student) => student.isActive);
  const gradeLabels = new Set(activeStudents.map((student) => student.gradeLevel).filter(Boolean));

  return {
    totalStudents: activeStudents.length,
    activeStudents: activeStudents.length,
    gradesRepresented: gradeLabels.size,
    latestStudent: activeStudents[0]?.displayName || "No students",
  };
}

export async function createCampusStudent(userId) {
  if (!userId) {
    throw new Error("Missing campus user.");
  }

  const accountId = await getCampusAccountId(userId);

  if (!accountId) {
    throw new Error("Missing campus organization.");
  }

  const defaults = getCampusStudentIdDefaults();
  let data = null;
  let createdStudentNumber = "";
  let nextNumberToPersist = defaults.nextNumber;

  for (let offset = 0; offset < 25; offset += 1) {
    const candidateNumber = defaults.nextNumber + offset;
    const uniqueSuffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    const payload = {
      account_id: accountId,
      created_by: userId,
      display_name: "New Student",
      student_number: buildStudentNumber(
        defaults.prefix,
        candidateNumber,
        defaults.padLength
      ),
      state_id: `TEMP-${uniqueSuffix}`,
      enrollment_status: "Active",
      current_enrollment_status: "Currently Enrolled",
      tuition_balance_cents: 0,
      is_active: true,
    };

    let nextPayload = payload;

    while (true) {
      const result = await supabase
        .from(CAMPUS_STUDENTS_TABLE)
        .insert(nextPayload)
        .select("*")
        .single();

      if (!result.error) {
        data = result.data;
        createdStudentNumber = payload.student_number;
        nextNumberToPersist = candidateNumber + 1;
        break;
      }

      const strippedPayload = stripMissingColumnFromPayload(nextPayload, result.error);
      if (strippedPayload) {
        nextPayload = strippedPayload;
        continue;
      }

      if (isUniqueViolation(result.error)) {
        break;
      }

      throw result.error;
    }

    if (data) {
      break;
    }
  }

  if (!data) {
    throw new Error("Could not create a unique student ID from the current default settings.");
  }

  if (createdStudentNumber) {
    saveCampusStudentIdDefaults({
      ...defaults,
      nextNumber: nextNumberToPersist,
    });
  }

  const [signed] = await signPhotoUrls([normalizeStudent(data)]);
  return signed;
}

function buildStudentPayload(student = {}) {
  return {
    legal_first_name: student.legalFirstName || "",
    legal_middle_name: student.legalMiddleName || "",
    legal_last_name: student.legalLastName || "",
    legal_suffix: student.legalSuffix || "",
    preferred_first_name: student.preferredFirstName || "",
    preferred_last_name: student.preferredLastName || "",
    display_name: student.displayName || "",
    student_number: student.studentNumber || "",
    state_id: student.stateId || "",
    local_id: student.localId || "",
    campus_person_id: student.campusPersonId || "",
    date_of_birth: student.dateOfBirth || null,
    gender: student.gender || "",
    sex: student.sex || "",
    grade_level: student.gradeLevel || "",
    school_name: student.schoolName || "",
    campus_name: student.campusName || "",
    homeroom_teacher: student.homeroomTeacher || "",
    counselor_name: student.counselorName || "",
    enrollment_status: student.enrollmentStatus || "",
    current_enrollment_status: student.currentEnrollmentStatus || "",
    enrollment_start_date: student.enrollmentStartDate || null,
    enrollment_end_date: student.enrollmentEndDate || null,
    graduation_year: student.graduationYear ? Number(student.graduationYear) : null,
    tuition_payment_status: student.tuitionPaymentStatus || "",
    tuition_balance_cents: Number(student.tuitionBalanceCents || 0) || 0,
    primary_language: student.primaryLanguage || "",
    home_language: student.homeLanguage || "",
    ethnicity: student.ethnicity || "",
    race_ethnicity: Array.isArray(student.raceEthnicity) ? student.raceEthnicity : [],
    photo_path: student.photoPath || "",
    photo_url:
      student.photoPath || student.photoUrl?.startsWith("data:image/svg+xml")
        ? ""
        : student.photoUrl || "",
    household_name: student.householdName || "",
    primary_phone: student.primaryPhone || "",
    primary_email: student.primaryEmail || "",
    street_address_1: student.streetAddress1 || "",
    street_address_2: student.streetAddress2 || "",
    city: student.city || "",
    state: student.state || "",
    postal_code: student.postalCode || "",
    demographics: student.demographics || {},
    guardians: Array.isArray(student.guardians) ? student.guardians : [],
    emergency_contacts: Array.isArray(student.emergencyContacts)
      ? student.emergencyContacts
      : [],
    medical: student.medical || {},
    disciplinary: Array.isArray(student.disciplinary) ? student.disciplinary : [],
    parent_contact_log: Array.isArray(student.parentContactLog) ? student.parentContactLog : [],
    enrollment: student.enrollment || {},
    program_participation: student.programParticipation || {},
    tags: Array.isArray(student.tags) ? student.tags : [],
    custom_fields: student.customFields || {},
    is_active: student.isActive !== false,
  };
}

export async function updateCampusStudent(userId, student = {}) {
  let payload = buildStudentPayload(student);

  try {
    const accountId = await getCampusAccountId(userId);

    if (!accountId || !student?.id) {
      throw new Error("Missing campus account or student.");
    }

    while (true) {
      const { data, error } = await supabase
        .from(CAMPUS_STUDENTS_TABLE)
        .update(payload)
        .eq("id", student.id)
        .eq("account_id", accountId)
        .select("*")
        .single();

      if (!error) {
        const [signed] = await signPhotoUrls([normalizeStudent(data)]);
        return signed;
      }

      const strippedPayload = stripMissingColumnFromPayload(payload, error);
      if (strippedPayload) {
        payload = strippedPayload;
        continue;
      }

      if (!isMissingRelationError(error)) {
        throw error;
      }

      throw error;
    }
  } catch (error) {
    console.error("Campus student update error:", error);
    throw error;
  }
}

export async function uploadCampusStudentPhoto(userId, studentId, file) {
  if (!userId || !studentId) {
    throw new Error("Missing campus user or student record.");
  }

  if (!(file instanceof File)) {
    throw new Error("Please choose an image file to upload.");
  }

  const accountId = await getCampusAccountId(userId);

  if (!accountId) {
    throw new Error("Missing campus organization.");
  }

  const fileName = sanitizeFileName(file.name);
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const storagePath = `${accountId}/${studentId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CAMPUS_STUDENT_PHOTO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await supabase
    .from(CAMPUS_STUDENTS_TABLE)
    .update({
      photo_path: storagePath,
      photo_url: "",
    })
    .eq("id", studentId)
    .eq("account_id", accountId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const normalized = normalizeStudent(data);
  const signedUrl = await createStudentPhotoSignedUrl(normalized.photoPath);

  return {
    ...normalized,
    photoUrl: signedUrl || createAvatarDataUrl(normalized.displayName),
  };
}
