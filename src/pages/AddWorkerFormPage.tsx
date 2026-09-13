import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addWorker } from "../lib/firestore";
import { useT } from "../lib/i18n";
import "./AddWorkerFormPage.css";

export function AddWorkerFormPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await addWorker(uid, {
      name: name.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setSaving(false);
    navigate("/team");
  }

  return (
    <div className="worker-form">
      <div className="topbar">
        <button className="close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" /></svg>
        </button>
        <h1>{t("addWorkerTitle")}</h1>
        <button className="save-btn" onClick={handleSave} disabled={saving || !name.trim()}>{t("addWorkerSaveBtn")}</button>
      </div>

      <div className="body">
        <div className="avatar-picker">
          <div className="avatar-circle">{name.slice(0, 1) || "?"}</div>
        </div>

        <div>
          <p className="field-label">{t("workerNameLabel")}</p>
          <input className="name-input" placeholder={t("workerNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <p className="field-label">{t("workerNoteLabel")}</p>
          <textarea className="note-input" placeholder={t("workerNotePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="info-card">{t("workerIsolationInfo")}</div>
      </div>
    </div>
  );
}
