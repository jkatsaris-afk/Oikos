import { Plus, Save, ShieldCheck, SlidersHorizontal, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import { loadCampusStaffDashboard } from "../../services/staffService";
import {
  getCampusAttendanceSettings,
  saveCampusAttendanceSettings,
} from "../../services/attendanceService";

function slugifyCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createBlankCode(index = 0) {
  return {
    value: `code_${Date.now()}_${index}`,
    label: "",
    color: "#475569",
    requiresNote: false,
  };
}

const PANELS = [
  { id: "codes", label: "Attendance Codes", icon: Tags },
  { id: "rules", label: "Daily Rules", icon: SlidersHorizontal },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
];

export default function AttendanceSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState(() => getCampusAttendanceSettings());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState("codes");
  const [canEdit, setCanEdit] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkStaffAccess() {
      if (!user?.id) {
        if (mounted) {
          setCanEdit(false);
          setCheckingAccess(false);
        }
        return;
      }

      try {
        const dashboard = await loadCampusStaffDashboard(user.id);
        const normalizedEmail = String(user.email || "").trim().toLowerCase();
        const isStaff = (dashboard.staff || []).some(
          (staff) =>
            String(staff.linkedUserId || "") === String(user.id) ||
            String(staff.email || "").trim().toLowerCase() === normalizedEmail
        );

        if (mounted) {
          setCanEdit(isStaff);
        }
      } catch (_loadError) {
        if (mounted) {
          setCanEdit(false);
        }
      } finally {
        if (mounted) {
          setCheckingAccess(false);
        }
      }
    }

    checkStaffAccess();
    return () => {
      mounted = false;
    };
  }, [user?.email, user?.id]);

  function updateCode(index, updates) {
    setForm((current) => ({
      ...current,
      codes: (current.codes || []).map((code, codeIndex) =>
        codeIndex === index ? { ...code, ...updates } : code
      ),
    }));
  }

  function addCode() {
    setForm((current) => ({
      ...current,
      codes: [...(current.codes || []), createBlankCode((current.codes || []).length)],
    }));
  }

  function removeCode(index) {
    setForm((current) => ({
      ...current,
      codes: (current.codes || []).filter((_, codeIndex) => codeIndex !== index),
    }));
  }

  function handleSave() {
    setError("");
    const normalizedCodes = (form.codes || []).map((code, index) => ({
      value: slugifyCode(code.value || code.label || `code_${index + 1}`),
      label: String(code.label || "").trim(),
      color: String(code.color || "").trim() || "#475569",
      requiresNote: Boolean(code.requiresNote),
    }));

    if (!normalizedCodes.length) {
      setError("Add at least one attendance code before saving.");
      return;
    }

    if (normalizedCodes.some((code) => !code.label)) {
      setError("Each attendance code needs a label.");
      return;
    }

    const uniqueValues = new Set(normalizedCodes.map((code) => code.value));
    if (uniqueValues.size !== normalizedCodes.length) {
      setError("Attendance code keys must be unique.");
      return;
    }

    const saved = saveCampusAttendanceSettings({
      ...form,
      codes: normalizedCodes,
    });
    setForm(saved);
    setNotice("Attendance settings saved.");
    window.dispatchEvent(new Event("oikos:attendance-codes-updated"));
    window.setTimeout(() => setNotice(""), 2500);
  }

  return (
    <div style={styles.wrap}>
      <h3 style={styles.title}>Attendance Settings</h3>
      <p style={styles.copy}>
        Manage attendance codes, daily timing rules, and teacher permissions for the Campus
        attendance workflow.
      </p>

      <div style={styles.layout}>
        <aside style={styles.menuCard}>
          <div style={styles.menuTitle}>Settings Menu</div>
          <div style={styles.menuList}>
            {PANELS.map((panel) => {
              const Icon = panel.icon;
              const isActive = activePanel === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  style={{
                    ...styles.menuButton,
                    ...(isActive ? styles.menuButtonActive : {}),
                  }}
                  onClick={() => setActivePanel(panel.id)}
                >
                  <Icon size={16} />
                  {panel.label}
                </button>
              );
            })}
          </div>
          <div style={styles.menuHelper}>
            Only active Campus staff can change attendance settings here.
          </div>
        </aside>

        <div style={styles.contentCard}>
          {activePanel === "codes" ? (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>Attendance Codes</div>
                  <div style={styles.panelCopy}>
                    Add, rename, recolor, and require notes for the attendance codes your school
                    wants to use.
                  </div>
                </div>
                <button
                  type="button"
                  style={styles.addButton}
                  onClick={addCode}
                  disabled={!canEdit || checkingAccess}
                >
                  <Plus size={16} />
                  Add Code
                </button>
              </div>

              <div style={styles.codeList}>
                {(form.codes || []).map((code, index) => (
                  <div key={`${code.value}-${index}`} style={styles.codeCard}>
                    <div style={styles.codeCardTop}>
                      <div
                        style={{
                          ...styles.codePreview,
                          background: `${code.color || "#475569"}14`,
                          color: code.color || "#475569",
                        }}
                      >
                        {code.label || "New Code"}
                      </div>
                      <button
                        type="button"
                        style={styles.deleteButton}
                        onClick={() => removeCode(index)}
                        disabled={!canEdit || checkingAccess || (form.codes || []).length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={styles.grid}>
                      <label style={styles.field}>
                        <span style={styles.label}>Label</span>
                        <input
                          type="text"
                          value={code.label || ""}
                          onChange={(event) => updateCode(index, { label: event.target.value })}
                          style={styles.input}
                          disabled={!canEdit || checkingAccess}
                        />
                      </label>

                      <label style={styles.field}>
                        <span style={styles.label}>Code Key</span>
                        <input
                          type="text"
                          value={code.value || ""}
                          onChange={(event) =>
                            updateCode(index, { value: slugifyCode(event.target.value) })
                          }
                          style={styles.input}
                          disabled={!canEdit || checkingAccess}
                        />
                      </label>

                      <label style={styles.field}>
                        <span style={styles.label}>Color</span>
                        <input
                          type="color"
                          value={code.color || "#475569"}
                          onChange={(event) => updateCode(index, { color: event.target.value })}
                          style={styles.colorInput}
                          disabled={!canEdit || checkingAccess}
                        />
                      </label>
                    </div>

                    <label style={styles.toggleRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(code.requiresNote)}
                        onChange={(event) =>
                          updateCode(index, { requiresNote: event.target.checked })
                        }
                        disabled={!canEdit || checkingAccess}
                      />
                      <span>Require a note whenever this code is selected</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activePanel === "rules" ? (
            <div style={styles.panel}>
              <div style={styles.panelTitle}>Daily Rules</div>
              <div style={styles.panelCopy}>
                Set the timing expectations staff should follow while taking attendance.
              </div>

              <div style={styles.grid}>
                <label style={styles.field}>
                  <span style={styles.label}>Attendance cutoff</span>
                  <input
                    type="time"
                    value={form.cutoffTime || "09:30"}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, cutoffTime: event.target.value }))
                    }
                    style={styles.input}
                    disabled={!canEdit || checkingAccess}
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>Tardy cutoff</span>
                  <input
                    type="time"
                    value={form.tardyCutoffTime || "08:15"}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, tardyCutoffTime: event.target.value }))
                    }
                    style={styles.input}
                    disabled={!canEdit || checkingAccess}
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>Lock attendance after</span>
                  <input
                    type="time"
                    value={form.attendanceLockedAfter || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        attendanceLockedAfter: event.target.value,
                      }))
                    }
                    style={styles.input}
                    disabled={!canEdit || checkingAccess}
                  />
                </label>
              </div>

              <div style={styles.toggleGroup}>
                <label style={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.autoMarkAbsentAtCutoff)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        autoMarkAbsentAtCutoff: event.target.checked,
                      }))
                    }
                    disabled={!canEdit || checkingAccess}
                  />
                  <span>Auto-mark still unmarked students absent after the cutoff time</span>
                </label>
              </div>
            </div>
          ) : null}

          {activePanel === "permissions" ? (
            <div style={styles.panel}>
              <div style={styles.panelTitle}>Permissions</div>
              <div style={styles.panelCopy}>
                Decide what teachers can change and what families are allowed to see.
              </div>

              <div style={styles.toggleGroup}>
                <label style={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.allowTeacherNoteEditing)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allowTeacherNoteEditing: event.target.checked,
                      }))
                    }
                    disabled={!canEdit || checkingAccess}
                  />
                  <span>Allow teachers to edit attendance notes from the teacher portal</span>
                </label>

                <label style={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.familyVisibleNotes)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        familyVisibleNotes: event.target.checked,
                      }))
                    }
                    disabled={!canEdit || checkingAccess}
                  />
                  <span>Show attendance notes to families in the parent portal</span>
                </label>
              </div>
            </div>
          ) : null}

          {error ? <div style={styles.error}>{error}</div> : null}
          {notice ? <div style={styles.notice}>{notice}</div> : null}

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.saveButton}
              onClick={handleSave}
              disabled={!canEdit || checkingAccess}
            >
              <Save size={16} />
              Save Attendance Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "grid",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 900,
  },
  copy: {
    color: "#475569",
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 760,
  },
  layout: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(220px, 260px) minmax(0, 1fr)",
  },
  menuCard: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 20,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "grid",
    alignContent: "start",
    gap: 14,
    padding: 18,
  },
  menuTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 900,
  },
  menuList: {
    display: "grid",
    gap: 10,
  },
  menuButton: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #dbe4ee",
    borderRadius: 14,
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    fontSize: 14,
    fontWeight: 800,
    gap: 10,
    padding: "12px 14px",
    textAlign: "left",
  },
  menuButtonActive: {
    background: "color-mix(in srgb, var(--color-primary) 10%, white 90%)",
    borderColor: "color-mix(in srgb, var(--color-primary) 28%, #dbe4ee 72%)",
    color: "var(--color-primary)",
  },
  menuHelper: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
  },
  contentCard: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 20,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gap: 16,
    padding: 20,
  },
  panel: {
    display: "grid",
    gap: 16,
  },
  panelHeader: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  panelCopy: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: 4,
  },
  addButton: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #dbe4ee",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "11px 14px",
  },
  codeList: {
    display: "grid",
    gap: 14,
  },
  codeCard: {
    border: "1px solid #dbe4ee",
    borderRadius: 18,
    display: "grid",
    gap: 14,
    padding: 16,
  },
  codeCardTop: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  codePreview: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px",
  },
  deleteButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    padding: 10,
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  field: {
    display: "grid",
    gap: 8,
  },
  label: {
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
  colorInput: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    height: 46,
    padding: 6,
    width: "100%",
  },
  toggleGroup: {
    display: "grid",
    gap: 12,
  },
  toggleRow: {
    alignItems: "center",
    color: "#334155",
    display: "flex",
    gap: 10,
    lineHeight: 1.5,
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 14,
    color: "#b91c1c",
    padding: "12px 14px",
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    color: "#166534",
    padding: "12px 14px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  saveButton: {
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
    padding: "12px 16px",
  },
};
