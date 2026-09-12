import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { addEmployer } from "../lib/firestore";
import type { PayType } from "../lib/types";
import "./EmployerFormPage.css";

const PALETTE = ["#FFD93D", "#4361EE", "#FF6B6B", "#39C97A", "#B084F5", "#5AC8FA"];

const MODE_ICONS: Record<PayType, ReactElement> = {
  hourly: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#1A1A1A" strokeWidth="1.3" opacity=".5" />
    </svg>
  ),
  comprehensive: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13.5" r="8.5" fill="#B084F5" stroke="#1A1A1A" strokeWidth="2" />
      <circle cx="12" cy="13.5" r="6" fill="#FFF" />
      <path d="M12 9.5v4l3 1.8" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  daily: (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill="#FFF" stroke="#1A1A1A" strokeWidth="2" />
      <rect x="4" y="5" width="16" height="4.5" rx="2.5" fill="#4361EE" stroke="#1A1A1A" strokeWidth="2" />
      <rect x="7.5" y="12.5" width="3.5" height="3.5" rx="1" fill="#FF6B6B" stroke="#1A1A1A" strokeWidth="1.2" />
    </svg>
  ),
  "base+overtime": (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5c-1.4 2.6-5 4.2-5 9.2a5 5 0 0010 0c0-1.6-.6-2.6-1.3-3.4.1 1.4-.6 2.3-1.4 2.6.6-2.6-1-4-2.3-8.4z" fill="#FF6B6B" stroke="#1A1A1A" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  monthly: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" fill="#39C97A" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" />
      <rect x="14.5" y="12" width="6" height="4.5" rx="1" fill="#FFD93D" stroke="#1A1A1A" strokeWidth="1.6" />
    </svg>
  ),
  "per-order": (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 4v9l-8 4-8-4V7z" fill="#5AC8FA" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 14.5l2 2 3.5-3.5" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const MODES: { key: PayType; label: string }[] = [
  { key: "hourly", label: "时薪" },
  { key: "daily", label: "日结" },
  { key: "base+overtime", label: "底薪+加班" },
  { key: "comprehensive", label: "综合工时" },
  { key: "monthly", label: "月结" },
  { key: "per-order", label: "按单计费" },
];

export function EmployerFormPage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [payType, setPayType] = useState<PayType>("hourly");
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const rateNum = Number(rate) || 0;
    await addEmployer(uid, {
      name: name.trim(),
      color: PALETTE[colorIdx],
      payType,
      ...(payType === "hourly" || payType === "comprehensive" || payType === "base+overtime"
        ? { hourlyRate: rateNum }
        : {}),
      ...(payType === "daily" ? { dailyRate: rateNum } : {}),
      ...(payType === "monthly" ? { monthlySalary: rateNum } : {}),
      ...(payType === "per-order" ? { pricePerOrder: rateNum } : {}),
    });
    setSaving(false);
    navigate("/");
  }

  const rateLabel = {
    hourly: "基础时薪",
    comprehensive: "基础时薪",
    "base+overtime": "时薪",
    daily: "日结金额",
    monthly: "月薪",
    "per-order": "每单价格",
  }[payType];

  return (
    <div className="employer-form">
      <div className="topbar">
        <button className="close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1>添加雇主</h1>
        <button className="save-btn" onClick={handleSave} disabled={saving || !name.trim()}>
          保存
        </button>
      </div>

      <div className="body">
        <div>
          <p className="field-label">雇主名称</p>
          <input
            className="name-input"
            placeholder="比如：楼下奶茶店"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <p className="field-label">颜色标签</p>
          <div className="swatches">
            {PALETTE.map((hex, i) => (
              <div
                key={hex}
                className={`swatch${colorIdx === i ? " selected" : ""}`}
                style={{ background: hex }}
                onClick={() => setColorIdx(i)}
              >
                {colorIdx === i && (
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <path d="M5 13l4 4L19 7" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">结算模式</p>
          <div className="mode-cards">
            {MODES.map((m) => (
              <div
                key={m.key}
                className={`mode-card${payType === m.key ? " selected" : ""}`}
                onClick={() => setPayType(m.key)}
              >
                <span className="ic">{MODE_ICONS[m.key]}</span>
                <span className="lb">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">{rateLabel}</p>
          <input
            className="rate-input"
            type="number"
            placeholder="¥"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
