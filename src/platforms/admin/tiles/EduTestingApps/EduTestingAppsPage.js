import { useEffect, useState } from "react";
import { FlaskConical, Save, Upload, X } from "lucide-react";

import {
  fetchEduTestingAppCatalog,
  saveEduTestingAppCatalogEntry,
  uploadEduTestingAppLogo,
} from "../../services/eduTestingAppsService";

export default function EduTestingAppsPage() {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadApps() {
    setLoading(true);
    setError("");
    try {
      setApps(await fetchEduTestingAppCatalog());
    } catch (loadError) {
      setError(loadError?.message || "Could not load EDU testing apps.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApps();
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    if (!selectedApp) return;

    setSaving(selectedApp.id);
    setError("");
    setNotice("");
    try {
      await saveEduTestingAppCatalogEntry(selectedApp);
      await loadApps();
      setSelectedApp(null);
      setNotice("Testing app updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not update testing app.");
    } finally {
      setSaving("");
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedApp) return;

    setSaving(`${selectedApp.id}:logo`);
    setError("");
    setNotice("");
    try {
      const logoUrl = await uploadEduTestingAppLogo(selectedApp.id, file);
      setSelectedApp((app) => ({
        ...app,
        logoUrl,
      }));
      setNotice("Logo uploaded. Save the app to keep it.");
    } catch (uploadError) {
      setError(uploadError?.message || "Could not upload logo.");
    } finally {
      setSaving("");
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <h1 style={styles.title}>EDU Testing Apps</h1>
          <p style={styles.subtitle}>
            Manage the shared TestNav, DRC, and NWEA launcher definitions used across every EDU organization.
          </p>
        </div>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <section style={styles.panel}>
        {loading ? <div style={styles.empty}>Loading testing apps...</div> : null}
        {!loading && apps.length === 0 ? <div style={styles.empty}>No testing apps are available.</div> : null}
        {!loading
          ? apps.map((app) => (
              <button key={app.id} style={styles.row} type="button" onClick={() => setSelectedApp(app)}>
                <div style={styles.mark}>
                  {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.logo} /> : <FlaskConical size={24} />}
                </div>
                <div style={styles.rowMain}>
                  <strong>{app.name}</strong>
                  <span>{app.description || "Secure testing launcher"}</span>
                </div>
                <span style={app.isGloballyEnabled ? styles.activePill : styles.hiddenPill}>
                  {app.isGloballyEnabled ? "Available" : "Hidden globally"}
                </span>
              </button>
            ))
          : null}
      </section>

      {selectedApp ? (
        <div style={styles.overlay} role="presentation" onMouseDown={() => setSelectedApp(null)}>
          <form style={styles.modal} role="dialog" aria-modal="true" onSubmit={handleSave} onMouseDown={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit {selectedApp.name}</h2>
              <button style={styles.iconButton} type="button" onClick={() => setSelectedApp(null)} title="Close">
                <X size={18} />
              </button>
            </div>
            <div style={styles.logoEditor}>
              <div style={styles.logoPreview}>
                {selectedApp.logoUrl ? <img src={selectedApp.logoUrl} alt="" style={styles.logo} /> : <FlaskConical size={30} />}
              </div>
              <div style={styles.logoEditorMain}>
                <strong>Testing App Logo</strong>
                <span>Upload a square PNG, JPG, or SVG. This logo appears in the student Testing Hub.</span>
              </div>
              <label style={styles.uploadButton}>
                <Upload size={16} />
                {saving === `${selectedApp.id}:logo` ? "Uploading..." : "Upload Logo"}
                <input
                  style={styles.hiddenFileInput}
                  type="file"
                  accept="image/*"
                  disabled={saving === `${selectedApp.id}:logo`}
                  onChange={handleLogoUpload}
                />
              </label>
            </div>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Name
                <input style={styles.input} value={selectedApp.name} onChange={(event) => setSelectedApp((app) => ({ ...app, name: event.target.value }))} />
              </label>
              <label style={styles.label}>
                Launch URL
                <input style={styles.input} value={selectedApp.launchUrl} onChange={(event) => setSelectedApp((app) => ({ ...app, launchUrl: event.target.value }))} />
              </label>
              <label style={styles.label}>
                Logo URL
                <input style={styles.input} value={selectedApp.logoUrl} onChange={(event) => setSelectedApp((app) => ({ ...app, logoUrl: event.target.value }))} />
              </label>
              <label style={styles.label}>
                Launch Method
                <select style={styles.input} value={selectedApp.launchMode} onChange={(event) => setSelectedApp((app) => ({ ...app, launchMode: event.target.value }))}>
                  <option value="new-window">New window / kiosk handoff</option>
                  <option value="replace">Replace current page</option>
                  <option value="same-window">Same window</option>
                </select>
              </label>
              <label style={styles.label}>
                Description
                <input style={styles.input} value={selectedApp.description} onChange={(event) => setSelectedApp((app) => ({ ...app, description: event.target.value }))} />
              </label>
              <label style={styles.label}>
                Sort Order
                <input
                  style={styles.input}
                  inputMode="numeric"
                  value={selectedApp.sortOrder}
                  onChange={(event) => setSelectedApp((app) => ({ ...app, sortOrder: event.target.value.replace(/\D/g, "") }))}
                />
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedApp.isGloballyEnabled}
                  onChange={(event) => setSelectedApp((app) => ({ ...app, isGloballyEnabled: event.target.checked }))}
                />
                Available to EDU organizations
              </label>
            </div>
            <div style={styles.actions}>
              <button style={styles.secondaryButton} type="button" onClick={() => setSelectedApp(null)}>
                Cancel
              </button>
              <button style={styles.primaryButton} type="submit" disabled={saving === selectedApp.id}>
                <Save size={16} />
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minHeight: "100%",
    padding: 24,
    color: "#162033",
  },
  header: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 30,
    lineHeight: 1.1,
    margin: 0,
  },
  subtitle: {
    color: "#667085",
    margin: "6px 0 0",
    maxWidth: 720,
  },
  panel: {
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 18,
    boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
    display: "grid",
    gap: 10,
    padding: 14,
  },
  row: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    gap: 14,
    gridTemplateColumns: "56px minmax(0, 1fr) auto",
    padding: 12,
    textAlign: "left",
  },
  mark: {
    alignItems: "center",
    background: "#edf2f7",
    borderRadius: 14,
    display: "flex",
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  logo: {
    height: "76%",
    objectFit: "contain",
    width: "76%",
  },
  rowMain: {
    display: "grid",
    gap: 4,
    minWidth: 0,
  },
  activePill: {
    background: "#dcfce7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
    padding: "6px 10px",
  },
  hiddenPill: {
    background: "#fee2e2",
    borderRadius: 999,
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 800,
    padding: "6px 10px",
  },
  empty: {
    color: "#667085",
    padding: 18,
  },
  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#991b1b",
    padding: "10px 12px",
  },
  notice: {
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    color: "#166534",
    padding: "10px 12px",
  },
  overlay: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 20,
    position: "fixed",
    zIndex: 80,
  },
  modal: {
    background: "rgba(255, 255, 255, 0.96)",
    border: "1px solid rgba(255, 255, 255, 0.7)",
    borderRadius: 20,
    boxShadow: "0 28px 70px rgba(15, 23, 42, 0.28)",
    maxWidth: 760,
    padding: 20,
    width: "min(760px, 100%)",
  },
  modalHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    margin: 0,
  },
  formGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  logoEditor: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 16,
    display: "grid",
    gap: 14,
    gridTemplateColumns: "72px minmax(0, 1fr) auto",
    marginBottom: 16,
    padding: 12,
  },
  logoPreview: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 16,
    display: "flex",
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  logoEditorMain: {
    color: "#475467",
    display: "grid",
    fontSize: 13,
    gap: 4,
    lineHeight: 1.35,
    minWidth: 0,
  },
  label: {
    color: "#475467",
    display: "grid",
    fontSize: 13,
    fontWeight: 800,
    gap: 6,
  },
  input: {
    background: "#ffffff",
    border: "1px solid #d0d5dd",
    borderRadius: 12,
    color: "#162033",
    font: "inherit",
    padding: "11px 12px",
  },
  checkboxLabel: {
    alignItems: "center",
    color: "#475467",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
  },
  actions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 18,
  },
  primaryButton: {
    alignItems: "center",
    background: "#4f46e5",
    border: 0,
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 900,
    gap: 8,
    padding: "10px 14px",
  },
  secondaryButton: {
    background: "#eef2f7",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: 12,
    color: "#162033",
    cursor: "pointer",
    fontWeight: 900,
    padding: "10px 14px",
  },
  uploadButton: {
    alignItems: "center",
    background: "#eef2ff",
    border: "1px solid rgba(79, 70, 229, 0.22)",
    borderRadius: 12,
    color: "#3730a3",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },
  hiddenFileInput: {
    height: 1,
    opacity: 0,
    overflow: "hidden",
    position: "absolute",
    width: 1,
  },
  iconButton: {
    alignItems: "center",
    background: "#eef2f7",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: 12,
    color: "#162033",
    cursor: "pointer",
    display: "inline-flex",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
};
