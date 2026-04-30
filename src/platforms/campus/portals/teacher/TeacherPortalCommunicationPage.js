import { Mail, MessagesSquare, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../auth/useAuth";
import {
  createCampusCommunication,
  loadCampusCommunicationsDashboard,
  sendCampusEmailCommunication,
  sendCampusTextCommunication,
  updateCampusCommunication,
} from "../../services/communicationService";

function formatDateTime(value) {
  if (!value) return "Not sent";

  try {
    return new Date(value).toLocaleString();
  } catch (_error) {
    return value;
  }
}

export default function TeacherPortalCommunicationPage({ students = [] }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dashboard, setDashboard] = useState({ account: null, communications: [], contacts: [] });
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [form, setForm] = useState({
    channel: "text",
    subject: "",
    messageBody: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        const nextDashboard = await loadCampusCommunicationsDashboard(user?.id);
        if (!mounted) return;
        setDashboard(nextDashboard);
      } catch (loadError) {
        console.error("Teacher communication load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "Could not load teacher communication tools.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const studentIds = useMemo(() => new Set(students.map((student) => student.id)), [students]);
  const orderedStudents = useMemo(
    () =>
      [...students].sort((left, right) =>
        String(left.displayName || "").localeCompare(String(right.displayName || ""))
      ),
    [students]
  );

  useEffect(() => {
    if (orderedStudents.some((student) => student.id === selectedStudentId)) {
      return;
    }

    setSelectedStudentId(orderedStudents[0]?.id || "");
  }, [orderedStudents, selectedStudentId]);

  const contacts = useMemo(() => {
    return (dashboard.contacts || []).filter((contact) => {
      if (!studentIds.has(contact.sourceId)) {
        return false;
      }

      if (contact.sourceType !== "guardian") {
        return false;
      }

      if (selectedStudentId && contact.sourceId !== selectedStudentId) {
        return false;
      }

      if (form.channel === "email") {
        return contact.channel === "email";
      }

      return contact.channel === "text";
    });
  }, [dashboard.contacts, form.channel, selectedStudentId, studentIds]);

  const selectedRecipients = useMemo(() => {
    const idSet = new Set(selectedRecipientIds);
    return contacts.filter((contact) => idSet.has(contact.id));
  }, [contacts, selectedRecipientIds]);

  const visibleCommunications = useMemo(() => {
    return (dashboard.communications || []).filter((item) =>
      (item.recipients || []).some(
        (recipient) =>
          recipient.sourceType === "guardian" &&
          studentIds.has(recipient.sourceId) &&
          (!selectedStudentId || recipient.sourceId === selectedStudentId)
      )
    );
  }, [dashboard.communications, selectedStudentId, studentIds]);

  const twilioEnabled = dashboard.account?.integrations?.twilio?.enabled === true;
  const emailEnabled = dashboard.account?.integrations?.email?.enabled === true;
  const allVisibleRecipientIds = useMemo(() => contacts.map((contact) => contact.id), [contacts]);

  function toggleRecipient(recipientId) {
    setSelectedRecipientIds((current) =>
      current.includes(recipientId)
        ? current.filter((value) => value !== recipientId)
        : [...current, recipientId]
    );
  }

  function handleSelectAllParents() {
    setSelectedRecipientIds(allVisibleRecipientIds);
  }

  function handleClearRecipients() {
    setSelectedRecipientIds([]);
  }

  async function refreshDashboard() {
    const nextDashboard = await loadCampusCommunicationsDashboard(user?.id);
    setDashboard(nextDashboard);
  }

  async function handleSend() {
    if (!dashboard.account?.id) {
      setError("Create or join a campus organization first.");
      return;
    }

    if (!selectedRecipients.length) {
      setError("Choose at least one parent or guardian contact.");
      return;
    }

    if (!form.messageBody.trim()) {
      setError("Enter a message before sending.");
      return;
    }

    try {
      setSending(true);
      setError("");
      setNotice("");

      const communication = await createCampusCommunication(user?.id, {
        channel: form.channel,
        status: "sending",
        deliveryProvider: form.channel === "email" ? "email" : "twilio",
        subject: form.subject.trim(),
        messageBody: form.messageBody.trim(),
        recipients: selectedRecipients,
        metadata: { requestedFromTeacherPortal: true },
      });

      if (form.channel === "email") {
        if (!emailEnabled) {
          throw new Error("Email is not enabled for this campus organization yet.");
        }

        const result = await sendCampusEmailCommunication({
          accountId: dashboard.account.id,
          communicationId: communication.id,
          recipients: selectedRecipients,
          subject: form.subject.trim(),
          messageBody: form.messageBody.trim(),
        });

        await updateCampusCommunication(user?.id, communication.id, {
          ...communication,
          status: result.failedCount > 0 ? "partial" : "sent",
          sentAt: new Date().toISOString(),
          externalReference: result.emailId || "",
          metadata: {
            ...communication.metadata,
            deliveryResult: result,
          },
        });
      } else {
        if (!twilioEnabled) {
          throw new Error("Twilio is not enabled for this campus organization yet.");
        }

        const result = await sendCampusTextCommunication({
          accountId: dashboard.account.id,
          communicationId: communication.id,
          recipients: selectedRecipients,
          messageBody: form.messageBody.trim(),
        });

        await updateCampusCommunication(user?.id, communication.id, {
          ...communication,
          status: result.failedCount > 0 ? "partial" : "sent",
          sentAt: new Date().toISOString(),
          externalReference: result.messageSids?.[0] || "",
          metadata: {
            ...communication.metadata,
            deliveryResult: result,
          },
        });
      }

      await refreshDashboard();
      setNotice("Communication sent.");
      setSelectedRecipientIds([]);
      setForm((current) => ({
        ...current,
        subject: "",
        messageBody: "",
      }));
    } catch (sendError) {
      console.error("Teacher communication send error:", sendError);
      setError(sendError?.message || "Could not send communication.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div style={styles.empty}>Loading communication tools...</div>;
  }

  return (
    <div style={styles.stack}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Communication</div>
          <h2 style={styles.title}>Reach families from the teacher portal</h2>
          <p style={styles.copy}>
            Pick a student, then message that student's parents or guardians from the same place you grade and write reports.
          </p>
        </div>

        <div style={styles.channelTabs}>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, channel: "text" }))}
            style={{
              ...styles.channelTab,
              ...(form.channel === "text" ? styles.channelTabActive : {}),
            }}
          >
            <MessagesSquare size={16} />
            Text
          </button>
          <button
            type="button"
            onClick={() => setForm((current) => ({ ...current, channel: "email" }))}
            style={{
              ...styles.channelTab,
              ...(form.channel === "email" ? styles.channelTabActive : {}),
            }}
          >
            <Mail size={16} />
            Email
          </button>
        </div>
      </section>

      <div style={styles.warning}>
        Parent replies to Twilio texts are not visible in the teacher portal yet. The current setup supports outbound texting only until an inbound Twilio webhook and reply log are added.
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <div style={styles.layout}>
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>Recipients</div>
            <div style={styles.parentActions}>
              <button type="button" style={styles.secondaryButton} onClick={handleSelectAllParents}>
                All Parents
              </button>
              <button type="button" style={styles.secondaryButton} onClick={handleClearRecipients}>
                Clear
              </button>
            </div>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>Student</span>
            <select
              value={selectedStudentId}
              onChange={(event) => {
                setSelectedStudentId(event.target.value);
                setSelectedRecipientIds([]);
              }}
              style={styles.input}
            >
              {orderedStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.displayName || "Unnamed Student"}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.recipientList}>
            {contacts.length === 0 ? (
              <div style={styles.emptyInline}>No parent or guardian contacts are available for this student on this channel.</div>
            ) : (
              contacts.map((contact) => {
                const checked = selectedRecipientIds.includes(contact.id);
                return (
                  <label key={contact.id} style={styles.recipientCard}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecipient(contact.id)}
                    />
                    <div>
                      <div style={styles.recipientName}>{contact.name}</div>
                      <div style={styles.recipientMeta}>
                        {contact.relation} • {contact.destination}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.panelTitle}>Compose</div>
          {form.channel === "email" ? (
            <label style={styles.field}>
              <span style={styles.label}>Subject</span>
              <input
                type="text"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                style={styles.input}
              />
            </label>
          ) : null}

          <label style={styles.field}>
            <span style={styles.label}>Message</span>
            <textarea
              value={form.messageBody}
              onChange={(event) => setForm((current) => ({ ...current, messageBody: event.target.value }))}
              style={styles.textarea}
              rows={8}
            />
          </label>

          <div style={styles.selectionSummary}>
            {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? "" : "s"} selected
          </div>

          <button type="button" style={styles.sendButton} onClick={handleSend} disabled={sending}>
            <Send size={16} />
            {sending ? "Sending..." : `Send ${form.channel === "email" ? "Email" : "Text"}`}
          </button>
        </section>
      </div>

      <section style={styles.panel}>
        <div style={styles.panelTitle}>Recent Communication</div>
        {visibleCommunications.length === 0 ? (
          <div style={styles.emptyInline}>No teacher communication history yet.</div>
        ) : (
          <div style={styles.historyList}>
            {visibleCommunications.slice(0, 10).map((item) => (
              <article key={item.id} style={styles.historyCard}>
                <div style={styles.historyHeader}>
                  <div style={styles.historyChannel}>
                    {item.channel === "email" ? "Email" : "Text"} • {item.status}
                  </div>
                  <div style={styles.historyDate}>{formatDateTime(item.sentAt || item.createdAt)}</div>
                </div>
                {item.subject ? <div style={styles.historySubject}>{item.subject}</div> : null}
                <div style={styles.historyBody}>{item.messageBody}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  stack: { display: "flex", flexDirection: "column", gap: 18 },
  hero: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 24,
    display: "flex",
    gap: 18,
    justifyContent: "space-between",
    padding: 24,
  },
  eyebrow: { color: "#0f766e", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" },
  title: { fontSize: 30, fontWeight: 900, margin: "10px 0 0" },
  copy: { color: "#475569", fontSize: 14, lineHeight: 1.7, margin: "12px 0 0", maxWidth: 680 },
  channelTabs: { display: "flex", gap: 10 },
  channelTab: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    color: "#334155",
    cursor: "pointer",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
  },
  channelTabActive: { background: "#0f172a", borderColor: "#0f172a", color: "#ffffff" },
  warning: { background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 16, color: "#9a3412", fontSize: 14, fontWeight: 700, padding: "14px 16px" },
  error: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 16, color: "#b91c1c", fontSize: 14, fontWeight: 700, padding: "14px 16px" },
  notice: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, color: "#166534", fontSize: 14, fontWeight: 700, padding: "14px 16px" },
  layout: { display: "grid", gap: 18, gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)" },
  panel: { background: "#ffffff", border: "1px solid #dbe4ea", borderRadius: 22, display: "flex", flexDirection: "column", gap: 14, padding: 22 },
  panelHeader: { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" },
  panelTitle: { fontSize: 18, fontWeight: 900 },
  parentActions: { display: "flex", gap: 8 },
  secondaryButton: { background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, color: "#334155", cursor: "pointer", fontSize: 12, fontWeight: 800, padding: "10px 12px" },
  recipientList: { display: "grid", gap: 12, maxHeight: 420, overflowY: "auto" },
  recipientCard: { alignItems: "flex-start", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 18, cursor: "pointer", display: "flex", gap: 12, padding: 14 },
  recipientName: { color: "#0f172a", fontSize: 14, fontWeight: 800 },
  recipientMeta: { color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 6 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { color: "#334155", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" },
  input: { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 14, fontSize: 14, outline: "none", padding: "12px 14px" },
  textarea: { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 14, fontSize: 14, lineHeight: 1.6, outline: "none", padding: "12px 14px", resize: "vertical" },
  selectionSummary: { color: "#64748b", fontSize: 13, fontWeight: 700 },
  sendButton: { alignItems: "center", alignSelf: "flex-start", background: "#0f172a", border: "none", borderRadius: 14, color: "#ffffff", cursor: "pointer", display: "flex", fontSize: 14, fontWeight: 800, gap: 8, padding: "12px 16px" },
  historyList: { display: "grid", gap: 12 },
  historyCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 18, padding: 16 },
  historyHeader: { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" },
  historyChannel: { color: "#0f172a", fontSize: 13, fontWeight: 800 },
  historyDate: { color: "#64748b", fontSize: 12 },
  historySubject: { color: "#0f172a", fontSize: 14, fontWeight: 800, marginTop: 10 },
  historyBody: { color: "#475569", fontSize: 13, lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-wrap" },
  empty: { background: "#ffffff", border: "1px solid #dbe4ea", borderRadius: 22, color: "#64748b", fontSize: 14, lineHeight: 1.6, padding: 22 },
  emptyInline: { color: "#64748b", fontSize: 13, lineHeight: 1.6 },
};
