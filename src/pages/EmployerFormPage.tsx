import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { addEmployer, employersCol, updateEmployer } from "../lib/firestore";
import type { Adjustment, Employer, PayType } from "../lib/types";
import { Mascot } from "../components/Mascot";
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

const OVERTIME_OPTIONS = [1.5, 2, 3];
const HOLIDAY_OPTIONS = [2, 3];
const BREAK_OPTIONS = [0, 30, 60];
const CYCLES: { key: NonNullable<Employer["settlementCycle"]>; label: string }[] = [
  { key: "daily", label: "日结" },
  { key: "weekly", label: "周结" },
  { key: "monthly", label: "月结" },
];

export function EmployerFormPage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const { employerId } = useParams();
  const isEdit = !!employerId;

  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [payType, setPayType] = useState<PayType>("hourly");
  const [rate, setRate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState<number | undefined>(undefined);
  const [holidayMultiplier, setHolidayMultiplier] = useState<number | undefined>(undefined);
  const [breakMinutes, setBreakMinutes] = useState<number | undefined>(undefined);
  const [settlementCycle, setSettlementCycle] = useState<Employer["settlementCycle"]>(undefined);
  const [commuteOpen, setCommuteOpen] = useState(false);
  const [commuteMinutes, setCommuteMinutes] = useState("");
  const [commuteCost, setCommuteCost] = useState("");
  const [idleTimePct, setIdleTimePct] = useState("");
  const [defaultAdjustments, setDefaultAdjustments] = useState<Adjustment[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!employerId) return;
    getDoc(doc(employersCol(uid), employerId)).then((snap) => {
      const data = snap.data() as Employer | undefined;
      if (data) {
        setName(data.name);
        setColorIdx(Math.max(0, PALETTE.indexOf(data.color)));
        setPayType(data.payType);
        setRate(String(data.hourlyRate ?? data.dailyRate ?? data.monthlySalary ?? data.pricePerOrder ?? ""));
        setBaseSalary(data.baseSalary ? String(data.baseSalary) : "");
        setOvertimeMultiplier(data.overtimeMultiplier);
        setHolidayMultiplier(data.holidayMultiplier);
        setBreakMinutes(data.breakMinutes);
        setSettlementCycle(data.settlementCycle);
        setCommuteMinutes(data.commuteMinutes ? String(data.commuteMinutes) : "");
        setCommuteCost(data.commuteCost ? String(data.commuteCost) : "");
        setIdleTimePct(data.idleTimePct ? String(data.idleTimePct) : "");
        setDefaultAdjustments(data.defaultAdjustments ?? []);
        setNote(data.note ?? "");
        if (data.commuteMinutes || data.commuteCost || data.idleTimePct) setCommuteOpen(true);
      }
      setLoaded(true);
    });
  }, [uid, employerId]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const rateNum = Number(rate) || 0;
    const data: Omit<Employer, "id"> = {
      name: name.trim(),
      color: PALETTE[colorIdx],
      payType,
      ...(payType === "hourly" || payType === "comprehensive" || payType === "base+overtime"
        ? { hourlyRate: rateNum }
        : {}),
      ...(payType === "daily" ? { dailyRate: rateNum } : {}),
      ...(payType === "monthly" ? { monthlySalary: rateNum } : {}),
      ...(payType === "per-order" ? { pricePerOrder: rateNum } : {}),
      ...(payType === "base+overtime" ? { baseSalary: Number(baseSalary) || 0 } : {}),
      ...(overtimeMultiplier ? { overtimeMultiplier } : {}),
      ...(holidayMultiplier ? { holidayMultiplier } : {}),
      ...(breakMinutes ? { breakMinutes } : {}),
      ...(settlementCycle ? { settlementCycle } : {}),
      ...(commuteMinutes ? { commuteMinutes: Number(commuteMinutes) } : {}),
      ...(commuteCost ? { commuteCost: Number(commuteCost) } : {}),
      ...(idleTimePct ? { idleTimePct: Number(idleTimePct) } : {}),
      ...(defaultAdjustments.length > 0 ? { defaultAdjustments } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    if (isEdit && employerId) {
      await updateEmployer(uid, employerId, data);
      setSaving(false);
      navigate("/");
    } else {
      await addEmployer(uid, data);
      setSaving(false);
      setJustSaved(true);
      setTimeout(() => navigate("/"), 1400);
    }
  }

  const rateLabel = {
    hourly: "基础时薪",
    comprehensive: "基础时薪",
    "base+overtime": "加班时薪",
    daily: "日结金额",
    monthly: "月薪",
    "per-order": "每单价格",
  }[payType];

  if (!loaded) return <p className="loading">加载中...</p>;

  if (justSaved) {
    return (
      <div className="employer-saved-splash">
        <Mascot size={110} />
        <p className="splash-title">新雇主「{name.trim()}」入职啦！</p>
        <p className="splash-sub">现在可以去打第一次卡了</p>
      </div>
    );
  }

  return (
    <div className="employer-form">
      <div className="topbar">
        <button className="close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1>{isEdit ? "编辑雇主" : "添加雇主"}</h1>
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

        {payType === "base+overtime" && (
          <div>
            <p className="field-label">底薪（月）</p>
            <input
              className="rate-input"
              type="number"
              placeholder="¥ 每月固定拿到手的底薪"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
            />
          </div>
        )}

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

        <div>
          <p className="field-label">加班费率倍数 <span className="opt">可选</span></p>
          <div className="chip-row">
            {OVERTIME_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip${overtimeMultiplier === v ? " selected" : ""}`}
                onClick={() => setOvertimeMultiplier(overtimeMultiplier === v ? undefined : v)}
              >
                {v}倍
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">节假日费率倍数 <span className="opt">可选</span></p>
          <div className="chip-row">
            {HOLIDAY_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip${holidayMultiplier === v ? " selected" : ""}`}
                onClick={() => setHolidayMultiplier(holidayMultiplier === v ? undefined : v)}
              >
                {v}倍
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">休息扣除时长 <span className="opt">可选</span></p>
          <div className="chip-row">
            {BREAK_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip${breakMinutes === v ? " selected" : ""}`}
                onClick={() => setBreakMinutes(v)}
              >
                {v === 0 ? "不扣除" : `${v}分钟`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">结算周期 <span className="opt">可选</span></p>
          <div className="chip-row">
            {CYCLES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`chip${settlementCycle === c.key ? " selected" : ""}`}
                onClick={() => setSettlementCycle(settlementCycle === c.key ? undefined : c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="collapse-header" onClick={() => setCommuteOpen(!commuteOpen)}>
            <span>净收益对比设置（可选）</span>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ transform: commuteOpen ? "rotate(180deg)" : undefined }}>
              <path d="M6 9l6 6 6-6" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {commuteOpen && (
            <div className="collapse-body">
              <input
                className="rate-input"
                type="number"
                placeholder="预估通勤时长（分钟）"
                value={commuteMinutes}
                onChange={(e) => setCommuteMinutes(e.target.value)}
              />
              <input
                className="rate-input"
                type="number"
                placeholder="预估通勤交通费（元）"
                value={commuteCost}
                onChange={(e) => setCommuteCost(e.target.value)}
              />
              <input
                className="rate-input"
                type="number"
                placeholder="预估等待/摸鱼时间占比（%，如接单间隙）"
                value={idleTimePct}
                onChange={(e) => setIdleTimePct(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <p className="field-label">默认补贴/扣款规则 <span className="opt">可选，会自动套用到每一条新记录</span></p>
          {defaultAdjustments.map((adj, i) => (
            <div className="default-adj-row" key={i}>
              <select
                className="select-field"
                value={adj.type}
                onChange={(e) => setDefaultAdjustments(defaultAdjustments.map((a, j) => j === i ? { ...a, type: e.target.value as "bonus" | "deduction" } : a))}
              >
                <option value="bonus">补贴</option>
                <option value="deduction">扣款</option>
              </select>
              <input
                className="rate-input"
                type="number"
                placeholder="金额"
                value={adj.amount || ""}
                onChange={(e) => setDefaultAdjustments(defaultAdjustments.map((a, j) => j === i ? { ...a, amount: Number(e.target.value) || 0 } : a))}
              />
              <input
                className="rate-input"
                placeholder="备注（如：夜班补贴）"
                value={adj.note ?? ""}
                onChange={(e) => setDefaultAdjustments(defaultAdjustments.map((a, j) => j === i ? { ...a, note: e.target.value } : a))}
              />
              <button type="button" className="remove-adj-btn" onClick={() => setDefaultAdjustments(defaultAdjustments.filter((_, j) => j !== i))}>
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-adj-btn"
            onClick={() => setDefaultAdjustments([...defaultAdjustments, { type: "bonus", amount: 0 }])}
          >
            + 添加一条规则
          </button>
        </div>

        <div>
          <p className="field-label">备注 <span className="opt">可选</span></p>
          <textarea
            className="note-input"
            placeholder="工种、联系方式之类都可以写这里"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
