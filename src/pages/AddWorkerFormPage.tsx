import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addWorker } from "../lib/firestore";
import "./AddWorkerFormPage.css";
import "./AddWorkerFormPage.css";

export function AddWorkerFormPage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await addWorker(uid, {
      name: name.trim(),
      ...(rate ? { defaultHourlyRate: Number(rate) } : {}),
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
        <h1>添加代记录人</h1>
        <button className="save-btn" onClick={handleSave} disabled={saving || !name.trim()}>保存</button>
      </div>

      <div className="body">
        <div className="avatar-picker">
          <div className="avatar-circle">{name.slice(0, 1) || "?"}</div>
        </div>

        <div>
          <p className="field-label">姓名</p>
          <input className="name-input" placeholder="比如：老王" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <p className="field-label">默认时薪 <span className="opt">可选，会预填到之后的记工表单里</span></p>
          <input className="rate-input" type="number" placeholder="¥" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>

        <div>
          <p className="field-label">备注 <span className="opt">可选，如工种/联系方式</span></p>
          <textarea className="note-input" placeholder="比如：瓦工，138****0000" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="info-card">
          添加后，这个人的所有工时记录会归属于你的账号，和你自己的个人打工记录完全分开统计。如果他之后想自己用App，需要单独注册账号。
        </div>
      </div>
    </div>
  );
}
