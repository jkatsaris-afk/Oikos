import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";
import { loadCampusStaffDashboard } from "./staffService";
import { loadCampusStudents } from "./studentService";

const CAMPUS_COMMUNICATIONS_TABLE = "campus_communications";

function normalizeRecipients(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeCommunication(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    channel: row.channel || "email",
    status: row.status || "draft",
    deliveryProvider: row.delivery_provider || "",
    subject: row.subject || "",
    messageBody: row.message_body || "",
    recipients: normalizeRecipients(row.recipients),
    recipientCount: Number(row.recipient_count || 0) || 0,
    externalReference: row.external_reference || "",
    metadata: row.metadata || {},
    sentAt: row.sent_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

async function getCampusAccess(userId) {
  const access = await fetchOrganizationAccess(userId, "campus");
  return { account: access?.account || null };
}

function createStudentContacts(students = []) {
  return students.flatMap((student) => {
    const contacts = [];

    if (student.primaryEmail) {
      contacts.push({
        id: `student-${student.id}-email`,
        sourceType: "student",
        sourceId: student.id,
        channel: "email",
        destination: student.primaryEmail,
        name: student.displayName,
        studentName: student.displayName,
        relation: "Student Email",
      });
    }

    if (student.primaryPhone) {
      contacts.push({
        id: `student-${student.id}-phone`,
        sourceType: "student",
        sourceId: student.id,
        channel: "text",
        destination: student.primaryPhone,
        name: student.displayName,
        studentName: student.displayName,
        relation: "Student Phone",
      });
    }

    (student.guardians || []).forEach((guardian, index) => {
      if (guardian.email) {
        contacts.push({
          id: `student-${student.id}-guardian-${index}-email`,
          sourceType: "guardian",
          sourceId: student.id,
          channel: "email",
          destination: guardian.email,
          name: guardian.name || `Guardian ${index + 1}`,
          studentName: student.displayName,
          relation: guardian.relationship || "Guardian",
        });
      }

      if (guardian.phone) {
        contacts.push({
          id: `student-${student.id}-guardian-${index}-phone`,
          sourceType: "guardian",
          sourceId: student.id,
          channel: "text",
          destination: guardian.phone,
          name: guardian.name || `Guardian ${index + 1}`,
          studentName: student.displayName,
          relation: guardian.relationship || "Guardian",
        });
      }
    });

    return contacts;
  });
}

function createStaffContacts(staff = []) {
  return staff.flatMap((member) => {
    const contacts = [];

    if (member.email) {
      contacts.push({
        id: `staff-${member.id}-email`,
        sourceType: "staff",
        sourceId: member.id,
        channel: "email",
        destination: member.email,
        name: member.displayName,
        studentName: "",
        relation: member.staffType || "Staff",
      });
    }

    if (member.phone) {
      contacts.push({
        id: `staff-${member.id}-phone`,
        sourceType: "staff",
        sourceId: member.id,
        channel: "text",
        destination: member.phone,
        name: member.displayName,
        studentName: "",
        relation: member.staffType || "Staff",
      });
    }

    return contacts;
  });
}

function sortContacts(contacts = []) {
  return [...contacts].sort((left, right) => {
    const nameCompare = String(left.name || "").localeCompare(String(right.name || ""));
    if (nameCompare !== 0) return nameCompare;
    return String(left.destination || "").localeCompare(String(right.destination || ""));
  });
}

export async function loadCampusCommunicationsDashboard(userId) {
  if (!userId) {
    return { account: null, communications: [], contacts: [] };
  }

  const access = await getCampusAccess(userId);
  if (!access.account?.id) {
    return { account: null, communications: [], contacts: [] };
  }

  const [students, staffDashboard, communicationResult] = await Promise.all([
    loadCampusStudents(userId),
    loadCampusStaffDashboard(userId),
    supabase
      .from(CAMPUS_COMMUNICATIONS_TABLE)
      .select("*")
      .eq("account_id", access.account.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (communicationResult.error) {
    throw communicationResult.error;
  }

  const contacts = sortContacts([
    ...createStudentContacts(students),
    ...createStaffContacts(staffDashboard.staff || []),
  ]);

  return {
    account: access.account,
    communications: (communicationResult.data || []).map((row) => normalizeCommunication(row)),
    contacts,
  };
}

function buildCommunicationPayload(communication = {}) {
  const recipients = normalizeRecipients(communication.recipients);
  return {
    channel: communication.channel || "email",
    status: communication.status || "draft",
    delivery_provider: communication.deliveryProvider || "",
    subject: communication.subject || "",
    message_body: communication.messageBody || "",
    recipients,
    recipient_count: recipients.length,
    external_reference: communication.externalReference || "",
    metadata: communication.metadata || {},
    sent_at: communication.sentAt || null,
  };
}

export async function createCampusCommunication(userId, communication = {}) {
  const access = await getCampusAccess(userId);
  if (!access.account?.id) {
    throw new Error("Missing campus organization.");
  }

  const payload = {
    account_id: access.account.id,
    created_by: userId,
    ...buildCommunicationPayload(communication),
  };

  const { data, error } = await supabase
    .from(CAMPUS_COMMUNICATIONS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeCommunication(data);
}

export async function updateCampusCommunication(userId, communicationId, updates = {}) {
  const access = await getCampusAccess(userId);
  if (!access.account?.id || !communicationId) {
    throw new Error("Missing campus organization or communication record.");
  }

  const { data, error } = await supabase
    .from(CAMPUS_COMMUNICATIONS_TABLE)
    .update(buildCommunicationPayload(updates))
    .eq("id", communicationId)
    .eq("account_id", access.account.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeCommunication(data);
}

export async function sendCampusTextCommunication({
  accountId,
  communicationId,
  recipients,
  messageBody,
}) {
  const { data, error } = await supabase.functions.invoke("send-campus-communication", {
    body: {
      accountId,
      communicationId,
      recipients,
      messageBody,
    },
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export async function sendCampusEmailCommunication({
  accountId,
  communicationId,
  recipients,
  subject,
  messageBody,
}) {
  const { data, error } = await supabase.functions.invoke("send-campus-communication", {
    body: {
      channel: "email",
      accountId,
      communicationId,
      recipients,
      subject,
      messageBody,
    },
  });

  if (error) {
    throw error;
  }

  return data || {};
}

export function getCampusCommunicationsWidgetStats(communications = []) {
  const sentItems = communications.filter((item) => item.status === "sent");
  const lastItem = communications[0] || null;

  return {
    total: communications.length,
    sent: sentItems.length,
    lastChannel: lastItem?.channel || "none",
    lastStatus: lastItem?.status || "No history",
  };
}
