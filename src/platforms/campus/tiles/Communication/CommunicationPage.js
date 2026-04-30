import { Mail, MessagesSquare, Phone, Save, Search } from "lucide-react";
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

export default function CommunicationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dashboard, setDashboard] = useState({
    account: null,
    communications: [],
    contacts: [],
  });
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
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
        setError("");
        const nextDashboard = await loadCampusCommunicationsDashboard(user?.id);
        if (!mounted) return;
        setDashboard(nextDashboard);
      } catch (loadError) {
        console.error("Campus communication load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "Could not load communication records.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredContacts = useMemo(() => {
    const normalized = String(query || "").trim().toLowerCase();
    return (dashboard.contacts || []).filter((contact) => {
      const scopeMatches =
        scope === "all" ||
        (scope === "guardians" && contact.sourceType === "guardian") ||
        (scope === "students" && contact.sourceType === "student") ||
        (scope === "staff" && contact.sourceType === "staff");

      const channelMatches = contact.channel === form.channel;
      const queryMatches =
        !normalized ||
        [contact.name, contact.studentName, contact.relation, contact.destination]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));

      return scopeMatches && channelMatches && queryMatches;
    });
  }, [dashboard.contacts, form.channel, query, scope]);

  const selectedRecipients = useMemo(() => {
    const idSet = new Set(selectedRecipientIds);
    return (dashboard.contacts || []).filter((contact) => idSet.has(contact.id));
  }, [dashboard.contacts, selectedRecipientIds]);

  const twilioEnabled = dashboard.account?.integrations?.twilio?.enabled === true;
  const emailEnabled = dashboard.account?.integrations?.email?.enabled === true;

  function toggleRecipient(recipientId) {
    setSelectedRecipientIds((current) =>
      current.includes(recipientId)
        ? current.filter((value) => value !== recipientId)
        : [...current, recipientId]
    );
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
      setError("Choose at least one recipient.");
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

      if (form.channel === "email") {
        if (!form.subject.trim()) {
          throw new Error("Enter an email subject before sending.");
        }

        if (!emailEnabled) {
          throw new Error("Email is not enabled for this campus organization yet.");
        }

        const recipients = selectedRecipients.filter((item) => item.channel === "email");
        const communication = await createCampusCommunication(user?.id, {
          channel: "email",
          status: "sending",
          deliveryProvider: "resend",
          subject: form.subject.trim(),
          messageBody: form.messageBody.trim(),
          recipients,
          metadata: { requestedFromTile: true },
        });

        try {
          const result = await sendCampusEmailCommunication({
            accountId: dashboard.account.id,
            communicationId: communication.id,
            recipients,
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

          await refreshDashboard();
          setNotice(`Email sent to ${result.sentCount || 0} recipient${result.sentCount === 1 ? "" : "s"}.`);
          setForm((current) => ({ ...current, subject: "", messageBody: "" }));
          setSelectedRecipientIds([]);
          return;
        } catch (sendError) {
          await updateCampusCommunication(user?.id, communication.id, {
            ...communication,
            status: "failed",
            metadata: {
              ...communication.metadata,
              error: sendError?.message || "Could not send email.",
            },
          });
          throw sendError;
        }
      }

      if (!twilioEnabled) {
        throw new Error("Twilio is not enabled for this campus organization yet.");
      }

      const recipients = selectedRecipients.filter((item) => item.channel === "text");
      const communication = await createCampusCommunication(user?.id, {
        channel: "text",
        status: "sending",
        deliveryProvider: "twilio",
        subject: "",
        messageBody: form.messageBody.trim(),
        recipients,
        metadata: { requestedFromTile: true },
      });

      try {
        const result = await sendCampusTextCommunication({
          accountId: dashboard.account.id,
          communicationId: communication.id,
          recipients,
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

        await refreshDashboard();
        setNotice(`Text sent to ${result.sentCount || 0} recipient${result.sentCount === 1 ? "" : "s"}.`);
        setForm((current) => ({ ...current, messageBody: "" }));
        setSelectedRecipientIds([]);
      } catch (sendError) {
        await updateCampusCommunication(user?.id, communication.id, {
          ...communication,
          status: "failed",
          metadata: {
            ...communication.metadata,
            error: sendError?.message || "Could not send text.",
          },
        });
        throw sendError;
      }
    } catch (sendError) {
      console.error("Campus communication send error:", sendError);
      setError(sendError?.message || "Could not send communication.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading communication center...</div>;
  }

  if (!dashboard.account) {
    return (
      <div style={styles.emptyState}>
        Create or join a campus organization before sending communications.
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Communication</div>
          <h1 style={styles.title}>Send email or text and keep a visible record below</h1>
          <p style={styles.subtitle}>
            Use Twilio for campus texting, hand off email drafts from one place, and keep
            message history right in the tile so staff can see what has already gone out.
          </p>
        </div>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <div style={styles.layout}>
        <section style={styles.composeCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Compose</div>
            <div style={styles.channelRow}>
              <button
                type="button"
                style={form.channel === "text" ? styles.channelButtonActive : styles.channelButton}
                onClick={() => setForm((current) => ({ ...current, channel: "text" }))}
              >
                <Phone size={15} />
                Text
              </button>
              <button
                type="button"
                style={form.channel === "email" ? styles.channelButtonActive : styles.channelButton}
                onClick={() => setForm((current) => ({ ...current, channel: "email" }))}
              >
                <Mail size={15} />
                Email
              </button>
            </div>
          </div>

          <div style={styles.helper}>
            {form.channel === "text"
              ? twilioEnabled
                ? "Twilio is enabled for texting."
                : "Twilio is not enabled yet. Turn it on in Campus Settings -> Integrations."
              : emailEnabled
                ? "Email is enabled and will send from your campus integration."
                : "Email is not enabled yet. Turn it on in Campus Settings -> Integrations."}
          </div>

          <div style={styles.recipientTools}>
            <label style={styles.searchWrap}>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${form.channel} recipients`}
                style={styles.searchInput}
              />
            </label>

            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              style={styles.select}
            >
              <option value="all">All contacts</option>
              <option value="guardians">Guardians</option>
              <option value="students">Students</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div style={styles.recipientsList}>
            {filteredContacts.map((contact) => {
              const selected = selectedRecipientIds.includes(contact.id);
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => toggleRecipient(contact.id)}
                  style={selected ? styles.recipientCardActive : styles.recipientCard}
                >
                  <div style={styles.recipientName}>{contact.name}</div>
                  <div style={styles.recipientMeta}>
                    {contact.studentName ? `${contact.studentName} • ` : ""}
                    {contact.relation || "Contact"} • {contact.destination}
                  </div>
                </button>
              );
            })}
            {filteredContacts.length === 0 ? (
              <div style={styles.emptySmall}>No matching contacts for this channel yet.</div>
            ) : null}
          </div>

          <div style={styles.helper}>
            {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? "" : "s"} selected
          </div>

          {form.channel === "email" ? (
            <label style={styles.field}>
              <span style={styles.label}>Subject</span>
              <input
                type="text"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                style={styles.input}
                placeholder="Subject line"
              />
            </label>
          ) : null}

          <label style={styles.field}>
            <span style={styles.label}>Message</span>
            <textarea
              value={form.messageBody}
              onChange={(event) => setForm((current) => ({ ...current, messageBody: event.target.value }))}
              style={styles.textarea}
              placeholder={form.channel === "text" ? "Type your text message" : "Type your email message"}
            />
          </label>

          <div style={styles.actions}>
            <button type="button" style={styles.sendButton} onClick={handleSend} disabled={sending}>
              <Save size={16} />
              {sending ? "Sending..." : form.channel === "text" ? "Send Text" : "Send Email"}
            </button>
          </div>
        </section>

        <section style={styles.historyCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Message History</div>
            <div style={styles.historyBadge}>
              <MessagesSquare size={15} />
              {dashboard.communications.length}
            </div>
          </div>

          <div style={styles.historyList}>
            {dashboard.communications.map((item) => (
              <div key={item.id} style={styles.historyItem}>
                <div style={styles.historyTopRow}>
                  <div style={styles.historyChannel}>
                    {item.channel === "text" ? "Text" : "Email"} • {item.status}
                  </div>
                  <div style={styles.historyDate}>{formatDateTime(item.sentAt || item.createdAt)}</div>
                </div>
                {item.subject ? <div style={styles.historySubject}>{item.subject}</div> : null}
                <div style={styles.historyBody}>{item.messageBody || "No message body."}</div>
                <div style={styles.historyMeta}>
                  {item.recipientCount} recipient{item.recipientCount === 1 ? "" : "s"} • {item.deliveryProvider || "manual"}
                </div>
              </div>
            ))}
            {dashboard.communications.length === 0 ? (
              <div style={styles.emptySmall}>No messages recorded yet.</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: { color: "#0f172a", display: "flex", flexDirection: "column", gap: 20 },
  loading: { color: "#475569", padding: 24 },
  emptyState: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    color: "#475569",
    padding: 24,
  },
  hero: {
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, #ffffff 92%), color-mix(in srgb, var(--color-primary) 16%, #ffffff 84%))",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 28,
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
    padding: 28,
  },
  eyebrow: { color: "var(--color-primary)", fontSize: 12, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" },
  title: { fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.05, margin: "10px 0 8px" },
  subtitle: { color: "#475569", lineHeight: 1.6, margin: 0, maxWidth: 760 },
  error: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    fontSize: 14,
    lineHeight: 1.6,
    padding: 12,
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 14,
    color: "#166534",
    fontSize: 14,
    lineHeight: 1.6,
    padding: 12,
  },
  layout: {
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
  },
  composeCard: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
  },
  historyCard: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
  },
  sectionHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  channelRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  channelButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
  },
  channelButtonActive: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
  },
  helper: { color: "#64748b", fontSize: 13, lineHeight: 1.7 },
  recipientTools: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(0, 1fr) 180px",
  },
  searchWrap: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 14,
    color: "#64748b",
    display: "flex",
    gap: 10,
    padding: "0 12px",
  },
  searchInput: { background: "transparent", border: 0, color: "#0f172a", flex: 1, fontSize: 14, outline: "none", padding: "12px 0" },
  select: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    padding: "12px 14px",
  },
  recipientsList: {
    display: "grid",
    gap: 10,
    maxHeight: 320,
    overflow: "auto",
  },
  recipientCard: {
    background: "#f8fafc",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 16,
    cursor: "pointer",
    display: "grid",
    gap: 6,
    padding: 12,
    textAlign: "left",
  },
  recipientCardActive: {
    background: "color-mix(in srgb, var(--color-primary) 10%, #ffffff 90%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 45%, #d8e4e0 55%)",
    borderRadius: 16,
    cursor: "pointer",
    display: "grid",
    gap: 6,
    padding: 12,
    textAlign: "left",
  },
  recipientName: { color: "#0f172a", fontSize: 14, fontWeight: 800 },
  recipientMeta: { color: "#64748b", fontSize: 12, lineHeight: 1.5 },
  field: { display: "grid", gap: 8 },
  label: { color: "#334155", fontSize: 13, fontWeight: 800 },
  input: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  textarea: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    minHeight: 130,
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
  },
  actions: { display: "flex", justifyContent: "flex-end" },
  sendButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    justifyContent: "center",
    padding: "12px 16px",
  },
  historyBadge: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 10%, #ffffff 90%)",
    borderRadius: 999,
    color: "var(--color-primary)",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    padding: "8px 12px",
  },
  historyList: { display: "grid", gap: 12 },
  historyItem: {
    background: "#f8fafc",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 16,
    display: "grid",
    gap: 8,
    padding: 14,
  },
  historyTopRow: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  historyChannel: {
    color: "var(--color-primary)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  historyDate: { color: "#64748b", fontSize: 12 },
  historySubject: { color: "#0f172a", fontSize: 15, fontWeight: 800 },
  historyBody: { color: "#334155", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" },
  historyMeta: { color: "#64748b", fontSize: 12 },
  emptySmall: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
    padding: 8,
  },
};
