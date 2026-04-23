import { useState } from "react";

import {
  getSermonApiSettings,
  saveSermonApiSettings,
} from "../../services/sermonService";

export default function SermonSettings() {
  const [settings, setSettings] = useState(getSermonApiSettings());
  const [status, setStatus] = useState("");

  const updateTranslation = (translationKey, field, value) => {
    setSettings((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [translationKey]: {
          ...current.translations[translationKey],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    saveSermonApiSettings(settings);
    setStatus("Saved");

    window.setTimeout(() => setStatus(""), 1500);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Sermon Settings</h3>
      <p style={styles.help}>
        Add your API.Bible key and the Bible IDs you want to use for each
        translation. The key you pasted earlier came back as unauthorized, so
        this is the easiest place to correct it.
      </p>

      <label style={styles.label}>API Key</label>
      <input
        value={settings.apiKey}
        onChange={(event) =>
          setSettings((current) => ({
            ...current,
            apiKey: event.target.value,
          }))
        }
        style={styles.input}
      />

      <label style={styles.label}>Service ID</label>
      <input
        value={settings.serviceId}
        onChange={(event) =>
          setSettings((current) => ({
            ...current,
            serviceId: event.target.value,
          }))
        }
        style={styles.input}
      />

      {["NKJV", "KJV", "NASB"].map((translationKey) => (
        <div key={translationKey} style={styles.translationCard}>
          <div style={styles.translationTitle}>{translationKey}</div>

          <label style={styles.label}>Bible ID</label>
          <input
            value={settings.translations[translationKey]?.bibleId || ""}
            onChange={(event) =>
              updateTranslation(translationKey, "bibleId", event.target.value)
            }
            style={styles.input}
            placeholder="API.Bible Bible ID"
          />
        </div>
      ))}

      <button style={styles.button} onClick={handleSave}>
        Save Settings
      </button>

      {status ? <div style={styles.status}>{status}</div> : null}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },

  title: {
    fontSize: 20,
    margin: 0,
  },

  help: {
    color: "#475569",
    lineHeight: 1.5,
    margin: 0,
  },

  label: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 600,
  },

  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 14,
    padding: "10px 12px",
  },

  translationCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
  },

  translationTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
  },

  button: {
    background: "#5F7D4D",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    padding: "12px 14px",
  },

  status: {
    color: "#166534",
    fontSize: 13,
    fontWeight: 600,
  },
};
