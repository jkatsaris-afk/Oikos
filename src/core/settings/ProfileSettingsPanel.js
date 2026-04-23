import { Camera, KeyRound, Mail, Phone, Save, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/useAuth";
import {
  changeProfilePassword,
  getProfileExtras,
  saveProfileSettings,
  uploadProfileImage,
} from "./profileSettingsService";

function getInitials(name = "", email = "") {
  const source = (name || email || "U").trim();

  if (!source) {
    return "U";
  }

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export default function ProfileSettingsPanel() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);
  const extras = useMemo(() => getProfileExtras(profile), [profile]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    bio: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setForm({
      fullName: profile?.full_name || "",
      email: profile?.email || user?.email || "",
      phone: extras.phone || "",
      bio: extras.bio || "",
    });
  }, [extras.bio, extras.phone, profile?.email, profile?.full_name, user?.email]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updatePasswordField(key, value) {
    setPasswordForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSaveProfile() {
    if (!user?.id) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      await saveProfileSettings({
        userId: user.id,
        currentProfile: profile,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        bio: form.bio,
      });
      await refreshProfile?.();
      setNotice(
        form.email.trim().toLowerCase() !== (user?.email || "").toLowerCase()
          ? "Profile saved. Check your email if Supabase asks you to confirm the new address."
          : "Profile updated."
      );
    } catch (saveError) {
      console.error("Profile save error:", saveError);
      setError(saveError?.message || "Could not save your profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file || !user?.id) {
      return;
    }

    setUploadingImage(true);
    setError("");
    setNotice("");

    try {
      await uploadProfileImage({
        userId: user.id,
        currentProfile: profile,
        file,
      });
      await refreshProfile?.();
      setNotice("Profile image updated.");
    } catch (uploadError) {
      console.error("Profile image upload error:", uploadError);
      setError(uploadError?.message || "Could not upload your profile image.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handlePasswordSave() {
    if (!passwordForm.password) {
      setError("Enter a new password first.");
      setNotice("");
      return;
    }

    if (passwordForm.password.length < 6) {
      setError("Use at least 6 characters for the new password.");
      setNotice("");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError("The password confirmation does not match.");
      setNotice("");
      return;
    }

    setSavingPassword(true);
    setError("");
    setNotice("");

    try {
      await changeProfilePassword(passwordForm.password);
      setPasswordForm({
        password: "",
        confirmPassword: "",
      });
      setNotice("Password updated.");
    } catch (passwordError) {
      console.error("Password update error:", passwordError);
      setError(passwordError?.message || "Could not update your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div style={styles.stack}>
      <section style={styles.panel}>
        <div style={styles.sectionTitle}>Profile</div>
        <div style={styles.hero}>
          {extras.avatarUrl ? (
            <img
              alt={form.fullName || form.email || "Profile"}
              src={extras.avatarUrl}
              style={styles.avatarImage}
            />
          ) : (
            <div style={styles.avatarFallback}>
              {getInitials(form.fullName, form.email)}
            </div>
          )}

          <div style={styles.heroContent}>
            <div style={styles.heroName}>{form.fullName || "Your Profile"}</div>
            <div style={styles.heroMeta}>{form.email || user?.email || "No email yet"}</div>
            <div style={styles.heroActions}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={styles.actionButton}
                disabled={uploadingImage}
              >
                <Camera size={15} />
                {uploadingImage ? "Uploading..." : "Upload Photo"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}
        {notice ? <div style={styles.notice}>{notice}</div> : null}

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>
              <User size={14} />
              Full Name
            </span>
            <input
              type="text"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              style={styles.input}
              placeholder="Your name"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>
              <Mail size={14} />
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              style={styles.input}
              placeholder="you@example.com"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>
              <Phone size={14} />
              Phone
            </span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              style={styles.input}
              placeholder="Optional phone number"
            />
          </label>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Bio</span>
          <textarea
            value={form.bio}
            onChange={(event) => updateField("bio", event.target.value)}
            style={styles.textarea}
            rows={4}
            placeholder="Tell people a little about yourself"
          />
        </label>

        <div style={styles.footer}>
          <div style={styles.helper}>
            Your profile details stay personal to your account, even when you share organization data.
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            style={styles.saveButton}
            disabled={loading}
          >
            <Save size={15} />
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.sectionTitle}>Password</div>
        <div style={styles.passwordHeader}>
          <div>
            <div style={styles.passwordTitle}>Change Password</div>
            <div style={styles.passwordText}>
              Update your password here for this account.
            </div>
          </div>
          <div style={styles.keyBadge}>
            <KeyRound size={15} />
            Secure
          </div>
        </div>

        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>New Password</span>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(event) => updatePasswordField("password", event.target.value)}
              style={styles.input}
              placeholder="New password"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Confirm Password</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                updatePasswordField("confirmPassword", event.target.value)
              }
              style={styles.input}
              placeholder="Confirm password"
            />
          </label>
        </div>

        <div style={styles.footer}>
          <div style={styles.helper}>Use something strong that you do not reuse elsewhere.</div>
          <button
            type="button"
            onClick={handlePasswordSave}
            style={styles.saveButton}
            disabled={savingPassword}
          >
            <KeyRound size={15} />
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </section>
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
  sectionTitle: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  hero: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    marginTop: 16,
  },
  avatarImage: {
    border: "1px solid #cbd5e1",
    borderRadius: 24,
    height: 96,
    objectFit: "cover",
    width: 96,
  },
  avatarFallback: {
    alignItems: "center",
    background: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
    borderRadius: 24,
    color: "#0f172a",
    display: "flex",
    fontSize: 28,
    fontWeight: 900,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  heroContent: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  heroName: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 900,
  },
  heroMeta: {
    color: "#64748b",
    fontSize: 14,
  },
  heroActions: {
    display: "flex",
    gap: 10,
    marginTop: 4,
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
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginTop: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    alignItems: "center",
    color: "#475569",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
  },
  input: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    padding: "12px 14px",
  },
  textarea: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    marginTop: 8,
    padding: "12px 14px",
    resize: "vertical",
  },
  footer: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 18,
  },
  helper: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: 420,
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
    padding: "11px 16px",
    whiteSpace: "nowrap",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 16,
    padding: "12px 14px",
  },
  notice: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    color: "#166534",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 16,
    padding: "12px 14px",
  },
  passwordHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 16,
  },
  passwordTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 900,
  },
  passwordText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 6,
  },
  keyBadge: {
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
    whiteSpace: "nowrap",
  },
};
