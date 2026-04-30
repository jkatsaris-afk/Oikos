import { Save } from "lucide-react";
import { useMemo, useState } from "react";

import {
  getCampusStudentIdDefaults,
  saveCampusStudentIdDefaults,
} from "../../services/studentService";

function normalizePositiveInteger(value, fallback) {
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

export default function StudentsSettings() {
  const initialDefaults = getCampusStudentIdDefaults();
  const [form, setForm] = useState({
    prefix: initialDefaults.prefix,
    nextNumber: String(initialDefaults.nextNumber),
    padLength: String(initialDefaults.padLength),
  });
  const [notice, setNotice] = useState("");

  const previewStudentNumber = useMemo(() => {
    const prefix = form.prefix.trim() || "STU-";
    const nextNumber = normalizePositiveInteger(form.nextNumber, 1000);
    const padLength = normalizePositiveInteger(form.padLength, 4);
    return `${prefix}${String(nextNumber).padStart(padLength, "0")}`;
  }, [form.nextNumber, form.padLength, form.prefix]);

  function handleSave() {
    const saved = saveCampusStudentIdDefaults({
      prefix: form.prefix,
      nextNumber: form.nextNumber,
      padLength: form.padLength,
    });

    setForm({
      prefix: saved.prefix,
      nextNumber: String(saved.nextNumber),
      padLength: String(saved.padLength),
    });
    setNotice("Student ID defaults saved.");
    window.setTimeout(() => setNotice(""), 2500);
  }

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Students Settings</h2>
      <p style={styles.text}>
        Choose the default student ID format used when staff clicks <strong>Add Student</strong>.
        Each new student will start with this number pattern, and the next number will advance
        automatically.
      </p>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Default Student ID Numbers</div>
        <div style={styles.grid}>
          <label style={styles.field}>
            <span style={styles.label}>ID Prefix</span>
            <input
              type="text"
              value={form.prefix}
              onChange={(event) =>
                setForm((current) => ({ ...current, prefix: event.target.value }))
              }
              placeholder="STU-"
              style={styles.input}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Starting Number</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.nextNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, nextNumber: event.target.value }))
              }
              placeholder="1000"
              style={styles.input}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Number Padding</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.padLength}
              onChange={(event) =>
                setForm((current) => ({ ...current, padLength: event.target.value }))
              }
              placeholder="4"
              style={styles.input}
            />
          </label>
        </div>

        <div style={styles.previewCard}>
          <div style={styles.previewLabel}>Next student ID preview</div>
          <div style={styles.previewValue}>{previewStudentNumber}</div>
        </div>

        <div style={styles.helper}>
          Example: a prefix of <code>STU-</code>, starting number <code>1000</code>, and padding
          <code> 4</code> creates IDs like <code>STU-1000</code>, <code>STU-1001</code>, and so on.
        </div>

        {notice ? <div style={styles.notice}>{notice}</div> : null}

        <div style={styles.actions}>
          <button type="button" style={styles.saveButton} onClick={handleSave}>
            <Save size={16} />
            Save Students Settings
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: {
    color: "#1e3a5f",
    margin: "0 0 8px",
  },
  text: {
    color: "#475569",
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 760,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 20,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 20,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  },
  field: {
    display: "flex",
    flexDirection: "column",
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
  previewCard: {
    background: "color-mix(in srgb, var(--color-primary) 8%, white 92%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, #d8e4e0 84%)",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 16,
  },
  previewLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  previewValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 900,
  },
  helper: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.7,
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
    justifyContent: "center",
    padding: "12px 16px",
  },
};
