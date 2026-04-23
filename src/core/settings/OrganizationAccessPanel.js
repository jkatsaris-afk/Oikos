import { Camera, Copy, RefreshCcw, Save, Shield, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { getModeFromPath } from "../utils/getMode";
import {
  fetchOrganizationAccess,
  regenerateOrganizationInviteCode,
  removeOrganizationMember,
  updateOrganizationSettings,
  uploadOrganizationLogo,
} from "./organizationAccessService";

function getModeLabel(mode = "") {
  switch (mode) {
    case "church":
      return "Church";
    case "campus":
      return "Campus";
    case "sports":
      return "Sports";
    case "business":
      return "Business";
    case "home":
      return "Home";
    case "edu":
      return "Education";
    case "pages":
      return "Pages";
    case "nightstand":
      return "TV";
    case "farm":
      return "Farm";
    default:
      return "Organization";
  }
}

export default function OrganizationAccessPanel() {
  const fileInputRef = useRef(null);
  const location = useLocation();
  const { user } = useAuth();
  const mode = getModeFromPath(location.pathname, window.location.hostname);

  const [state, setState] = useState({
    account: null,
    accountType: mode,
    members: [],
    isOwner: false,
    membership: null,
  });
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      if (!user?.id) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const nextState = await fetchOrganizationAccess(user.id, mode);

        if (!mounted) return;

        setState(nextState);
        setOrganizationName(nextState.account?.name || "");
      } catch (loadError) {
        console.error("Organization access load error:", loadError);

        if (!mounted) return;

        setError(loadError?.message || "Could not load organization access.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAccess();

    return () => {
      mounted = false;
    };
  }, [mode, user?.id]);

  useEffect(() => {
    setOrganizationName(state.account?.name || "");
  }, [state.account?.name]);

  async function refreshInviteCode() {
    if (!state.account) return;

    setNotice("");
    setError("");
    setBusyUserId("invite-code");

    try {
      const nextAccount = await regenerateOrganizationInviteCode(
        state.account.id,
        state.account.type
      );

      setState((current) => ({
        ...current,
        account: nextAccount,
      }));
      setNotice("Invite code updated.");
    } catch (refreshError) {
      console.error("Invite code refresh error:", refreshError);
      setError(refreshError?.message || "Could not regenerate invite code.");
    } finally {
      setBusyUserId("");
    }
  }

  async function removeMember(memberUserId) {
    if (!state.account) return;

    setNotice("");
    setError("");
    setBusyUserId(memberUserId);

    try {
      await removeOrganizationMember(state.account.id, memberUserId);

      setState((current) => ({
        ...current,
        members: current.members.filter((member) => member.userId !== memberUserId),
      }));
      setNotice("Member removed from the organization.");
    } catch (removeError) {
      console.error("Member remove error:", removeError);
      setError(removeError?.message || "Could not remove member.");
    } finally {
      setBusyUserId("");
    }
  }

  async function copyInviteCode() {
    if (!state.account?.invite_code) return;

    try {
      await window.navigator.clipboard.writeText(state.account.invite_code);
      setNotice("Invite code copied.");
    } catch (copyError) {
      console.error("Invite code copy error:", copyError);
      setError("Could not copy invite code.");
    }
  }

  async function saveOrganizationDetails() {
    if (!state.account) return;

    setNotice("");
    setError("");
    setBusyUserId("save-organization");

    try {
      const nextAccount = await updateOrganizationSettings(state.account.id, {
        name: organizationName,
      });

      setState((current) => ({
        ...current,
        account: nextAccount,
      }));
      setNotice("Organization updated.");
    } catch (saveError) {
      console.error("Organization save error:", saveError);
      setError(saveError?.message || "Could not update the organization.");
    } finally {
      setBusyUserId("");
    }
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0];

    if (!file || !state.account) {
      return;
    }

    setNotice("");
    setError("");
    setBusyUserId("upload-logo");

    try {
      const nextAccount = await uploadOrganizationLogo({
        account: state.account,
        file,
      });

      setState((current) => ({
        ...current,
        account: nextAccount,
      }));
      setNotice("Organization logo updated.");
    } catch (uploadError) {
      console.error("Organization logo upload error:", uploadError);
      setError(uploadError?.message || "Could not upload the organization logo.");
    } finally {
      setBusyUserId("");
      event.target.value = "";
    }
  }

  if (loading) {
    return <div style={styles.emptyState}>Loading organization access...</div>;
  }

  if (!state.account) {
    return (
      <div style={styles.panel}>
        <div style={styles.sectionTitle}>Organization Access</div>
        <p style={styles.text}>
          No {getModeLabel(mode).toLowerCase()} organization is connected to this
          account yet. When you join or create one, shared tile data will come
          through that organization while your own layout and widgets stay personal.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.stack}>
      <section style={styles.panel}>
        <div style={styles.header}>
          <div>
            <div style={styles.sectionTitle}>Organization Access</div>
            <div style={styles.accountName}>{state.account.name}</div>
            <div style={styles.meta}>
              {getModeLabel(mode)} organization • {state.isOwner ? "Owner" : state.membership?.role || "Member"}
            </div>
          </div>
          <div style={styles.badge}>
            <Shield size={14} />
            {state.membership?.status || (state.isOwner ? "active" : "member")}
          </div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}
        {notice ? <div style={styles.notice}>{notice}</div> : null}

        {state.isOwner ? (
          <div style={styles.inviteCard}>
            <div>
              <div style={styles.inviteLabel}>Invite Code</div>
              <div style={styles.inviteCode}>{state.account.invite_code || "No code yet"}</div>
              <div style={styles.helper}>
                Share this code so people can join your {getModeLabel(mode).toLowerCase()} organization.
              </div>
            </div>

            <div style={styles.actions}>
              <button type="button" style={styles.actionButton} onClick={copyInviteCode}>
                <Copy size={15} />
                Copy
              </button>
              <button
                type="button"
                style={styles.actionButton}
                onClick={refreshInviteCode}
                disabled={busyUserId === "invite-code"}
              >
                <RefreshCcw size={15} />
                {busyUserId === "invite-code" ? "Generating..." : "New Code"}
              </button>
            </div>
          </div>
        ) : (
          <p style={styles.text}>
            Your access to shared {getModeLabel(mode).toLowerCase()} information comes through this organization.
            Your tile layout and widget layout stay personal to your own account.
          </p>
        )}

        {state.isOwner ? (
          <div style={styles.ownerPanel}>
            <div style={styles.ownerHeader}>
              {state.account.logo_url ? (
                <img
                  src={state.account.logo_url}
                  alt={state.account.name || "Organization logo"}
                  style={styles.logoImage}
                />
              ) : (
                <div style={styles.logoFallback}>
                  {(state.account.name || "O").slice(0, 1).toUpperCase()}
                </div>
              )}

              <div style={styles.ownerActions}>
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busyUserId === "upload-logo"}
                >
                  <Camera size={15} />
                  {busyUserId === "upload-logo" ? "Uploading..." : "Upload Logo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            <label style={styles.field}>
              <span style={styles.fieldLabel}>Organization Name</span>
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                style={styles.input}
                placeholder="Organization name"
              />
            </label>

            <button
              type="button"
              style={styles.saveButton}
              onClick={saveOrganizationDetails}
              disabled={busyUserId === "save-organization"}
            >
              <Save size={15} />
              {busyUserId === "save-organization" ? "Saving..." : "Save Organization"}
            </button>
          </div>
        ) : null}
      </section>

      {state.isOwner ? (
        <section style={styles.panel}>
          <div style={styles.membersHeader}>
            <div style={styles.sectionTitle}>Members</div>
            <div style={styles.membersCount}>
              <Users size={14} />
              {state.members.length}
            </div>
          </div>

          <div style={styles.membersList}>
            {state.members.map((member) => {
              const isOwner = member.role === "owner";

              return (
                <div key={member.userId} style={styles.memberRow}>
                  <div>
                    <div style={styles.memberName}>{member.fullName}</div>
                    <div style={styles.memberMeta}>
                      {member.email || "No email"} • {member.role} • {member.status}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      ...styles.removeButton,
                      ...(isOwner ? styles.removeButtonDisabled : {}),
                    }}
                    disabled={isOwner || busyUserId === member.userId}
                    onClick={() => removeMember(member.userId)}
                  >
                    <Trash2 size={14} />
                    {busyUserId === member.userId ? "Removing..." : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const styles = {
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
  },
  header: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  accountName: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 900,
    marginTop: 8,
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
  badge: {
    alignItems: "center",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 999,
    color: "#1d4ed8",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    padding: "8px 12px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  text: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    margin: "12px 0 0",
  },
  inviteCard: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    marginTop: 16,
    padding: 16,
  },
  ownerPanel: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 16,
    padding: 16,
  },
  ownerHeader: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
  },
  logoImage: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 16,
    height: 92,
    objectFit: "contain",
    padding: 10,
    width: 92,
  },
  logoFallback: {
    alignItems: "center",
    background: "#e2e8f0",
    borderRadius: 16,
    color: "#334155",
    display: "flex",
    fontSize: 32,
    fontWeight: 900,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  ownerActions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  inviteLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  inviteCode: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: 900,
    letterSpacing: "0.04em",
    marginTop: 8,
  },
  helper: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 8,
  },
  actions: {
    display: "flex",
    gap: 10,
  },
  actionButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
  },
  input: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  saveButton: {
    alignItems: "center",
    background: "#0f172a",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  membersHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  membersCount: {
    alignItems: "center",
    color: "#475569",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 6,
  },
  membersList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 16,
  },
  memberRow: {
    alignItems: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  memberName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
  },
  memberMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
    textTransform: "capitalize",
  },
  removeButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },
  removeButtonDisabled: {
    cursor: "default",
    opacity: 0.45,
  },
  notice: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    color: "#166534",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
    padding: "12px 14px",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
    padding: "12px 14px",
  },
  emptyState: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
};
