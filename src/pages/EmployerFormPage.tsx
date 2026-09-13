import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { addEmployer, employersCol, updateEmployer, watchEmployers } from "../lib/firestore";
import type { Adjustment, Employer, PayType } from "../lib/types";
import { Mascot } from "../components/Mascot";
import { CURRENCIES, DEFAULT_CURRENCY } from "../lib/currency";
import { useT, type DictKey } from "../lib/i18n";
import "./EmployerFormPage.css";

const PALETTE = ["#FFD93D", "#4361EE", "#FF6B6B", "#39C97A", "#B084F5", "#5AC8FA"];

const INDUSTRY_PRESETS: DictKey[] = [
  "industryRestaurant",
  "industryDelivery",
  "industryRideshare",
  "industryCafe",
  "industryRetail",
  "industryTutoring",
  "industryOffice",
];

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

const MODES: { key: PayType; labelKey: DictKey }[] = [
  { key: "hourly", labelKey: "payTypeHourly" },
  { key: "daily", labelKey: "payTypeDaily" },
  { key: "base+overtime", labelKey: "payTypeBaseOvertime" },
  { key: "comprehensive", labelKey: "payTypeComprehensive" },
  { key: "monthly", labelKey: "payTypeMonthly" },
  { key: "per-order", labelKey: "payTypePerOrder" },
];

const OVERTIME_OPTIONS = [1.5, 2, 3];
const HOLIDAY_OPTIONS = [2, 3];
const BREAK_OPTIONS = [0, 30, 60];
const CYCLES: { key: NonNullable<Employer["settlementCycle"]>; labelKey: DictKey }[] = [
  { key: "daily", labelKey: "cycleDaily" },
  { key: "weekly", labelKey: "cycleWeekly" },
  { key: "monthly", labelKey: "cycleMonthly" },
];

export function EmployerFormPage({ uid }: { uid: string }) {
  const t = useT();
  const navigate = useNavigate();
  const { employerId } = useParams();
  const isEdit = !!employerId;

  const [name, setName] = useState("");
  const [industryTag, setIndustryTag] = useState("");
  const [industryOther, setIndustryOther] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);
  const [payType, setPayType] = useState<PayType>("hourly");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
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
  const [existingEmployers, setExistingEmployers] = useState<Employer[]>([]);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);

  useEffect(() => watchEmployers(uid, setExistingEmployers), [uid]);

  useEffect(() => {
    if (!employerId) return;
    getDoc(doc(employersCol(uid), employerId)).then((snap) => {
      const data = snap.data() as Employer | undefined;
      if (data) {
        setName(data.name);
        if (data.industryTag) {
          if ((INDUSTRY_PRESETS as string[]).includes(data.industryTag)) {
            setIndustryTag(data.industryTag);
          } else {
            setIndustryTag(data.industryTag);
            setIndustryOther(true);
          }
        }
        setColorIdx(Math.max(0, PALETTE.indexOf(data.color)));
        setPayType(data.payType);
        setCurrency(data.currency ?? DEFAULT_CURRENCY);
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

  function findDuplicate() {
    const trimmed = name.trim().toLowerCase();
    return existingEmployers.find((e) => e.id !== employerId && e.name.trim().toLowerCase() === trimmed);
  }

  function handleSaveClick() {
    if (!name.trim()) return;
    if (findDuplicate() && !duplicateConfirm) {
      setDuplicateConfirm(true);
      return;
    }
    handleSave();
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const rateNum = Number(rate) || 0;
    const data: Omit<Employer, "id"> = {
      name: name.trim(),
      color: PALETTE[colorIdx],
      payType,
      currency,
      ...(industryTag.trim() ? { industryTag: industryTag.trim() } : {}),
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

  const rateLabelKey: DictKey = ({
    hourly: "rateLabelHourly",
    comprehensive: "rateLabelHourly",
    "base+overtime": "rateLabelOvertime",
    daily: "rateLabelDaily",
    monthly: "rateLabelMonthly",
    "per-order": "rateLabelPerOrder",
  } satisfies Record<PayType, DictKey>)[payType];

  if (!loaded) return <p className="loading">{t("loading")}</p>;

  if (justSaved) {
    return (
      <div className="employer-saved-splash">
        <Mascot size={110} />
        <p className="splash-title">{t("savedSplashTitle", { name: name.trim() })}</p>
        <p className="splash-sub">{t("savedSplashSub")}</p>
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
        <h1>{isEdit ? t("editEmployerTitle") : t("addEmployerTitle")}</h1>
        <button className="save-btn" onClick={handleSaveClick} disabled={saving || !name.trim()}>
          {t("save")}
        </button>
      </div>

      <div className="body">
        <div>
          <p className="field-label">{t("employerNameLabel")}</p>
          <input
            className="name-input"
            placeholder={t("employerNamePlaceholder")}
            value={name}
            onChange={(e) => { setName(e.target.value); setDuplicateConfirm(false); }}
          />
          {findDuplicate() && (
            <p className="dup-warning">{t("duplicateNameWarning", { name: findDuplicate()!.name })}</p>
          )}
        </div>

        <div>
          <p className="field-label">{t("industryLabel")} <span className="opt">{t("optional")}</span></p>
          <div className="chip-row">
            {INDUSTRY_PRESETS.map((key) => (
              <button
                key={key}
                type="button"
                className={`chip${!industryOther && industryTag === key ? " selected" : ""}`}
                onClick={() => { setIndustryOther(false); setIndustryTag(industryTag === key ? "" : key); }}
              >
                {t(key)}
              </button>
            ))}
            <button
              type="button"
              className={`chip${industryOther ? " selected" : ""}`}
              onClick={() => { setIndustryOther(true); setIndustryTag(""); }}
            >
              {t("industryOther")}
            </button>
          </div>
          {industryOther && (
            <input
              className="rate-input"
              placeholder={t("industryOtherPlaceholder")}
              value={industryTag}
              onChange={(e) => setIndustryTag(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        <div>
          <p className="field-label">{t("colorLabel")}</p>
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
          <p className="field-label">{t("settlementModeLabel")}</p>
          <div className="mode-cards">
            {MODES.map((m) => (
              <div
                key={m.key}
                className={`mode-card${payType === m.key ? " selected" : ""}`}
                onClick={() => setPayType(m.key)}
              >
                <span className="ic">{MODE_ICONS[m.key]}</span>
                <span className="lb">{t(m.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">{t("currencyLabel")}</p>
          <select className="select-field currency-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code} · {c.label}</option>
            ))}
          </select>
        </div>

        {payType === "base+overtime" && (
          <div>
            <p className="field-label">{t("baseSalaryLabel")}</p>
            <input
              className="rate-input"
              type="number"
              placeholder={t("baseSalaryPlaceholder", { sym: CURRENCIES.find((c) => c.code === currency)?.symbol ?? "¥" })}
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
            />
          </div>
        )}

        <div>
          <p className="field-label">{t(rateLabelKey)}</p>
          <input
            className="rate-input"
            type="number"
            placeholder={CURRENCIES.find((c) => c.code === currency)?.symbol ?? "¥"}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <div>
          <p className="field-label">{t("overtimeMultiplierLabel")} <span className="opt">{t("optional")}</span></p>
          <div className="chip-row">
            {OVERTIME_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip${overtimeMultiplier === v ? " selected" : ""}`}
                onClick={() => setOvertimeMultiplier(overtimeMultiplier === v ? undefined : v)}
              >
                {t("multiplierSuffix", { v })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">{t("holidayMultiplierLabel")} <span className="opt">{t("optional")}</span></p>
          <div className="chip-row">
            {HOLIDAY_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip${holidayMultiplier === v ? " selected" : ""}`}
                onClick={() => setHolidayMultiplier(holidayMultiplier === v ? undefined : v)}
              >
                {t("multiplierSuffix", { v })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">{t("breakLabel")} <span className="opt">{t("optional")}</span></p>
          <div className="chip-row">
            {BREAK_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip${breakMinutes === v ? " selected" : ""}`}
                onClick={() => setBreakMinutes(v)}
              >
                {v === 0 ? t("breakNone") : t("breakMinutesFmt", { m: v })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">{t("settlementCycleLabel")} <span className="opt">{t("optional")}</span></p>
          <div className="chip-row">
            {CYCLES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`chip${settlementCycle === c.key ? " selected" : ""}`}
                onClick={() => setSettlementCycle(settlementCycle === c.key ? undefined : c.key)}
              >
                {t(c.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="collapse-header" onClick={() => setCommuteOpen(!commuteOpen)}>
            <span>{t("netPaySettingsLabel")}</span>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ transform: commuteOpen ? "rotate(180deg)" : undefined }}>
              <path d="M6 9l6 6 6-6" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {commuteOpen && (
            <div className="collapse-body">
              <input
                className="rate-input"
                type="number"
                placeholder={t("commuteMinutesPlaceholder")}
                value={commuteMinutes}
                onChange={(e) => setCommuteMinutes(e.target.value)}
              />
              <input
                className="rate-input"
                type="number"
                placeholder={t("commuteCostPlaceholder")}
                value={commuteCost}
                onChange={(e) => setCommuteCost(e.target.value)}
              />
              <input
                className="rate-input"
                type="number"
                placeholder={t("idleTimePlaceholder")}
                value={idleTimePct}
                onChange={(e) => setIdleTimePct(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <p className="field-label">{t("defaultAdjLabel")} <span className="opt">{t("defaultAdjSub")}</span></p>
          {defaultAdjustments.map((adj, i) => (
            <div className="default-adj-row" key={i}>
              <select
                className="select-field"
                value={adj.type}
                onChange={(e) => setDefaultAdjustments(defaultAdjustments.map((a, j) => j === i ? { ...a, type: e.target.value as "bonus" | "deduction" } : a))}
              >
                <option value="bonus">{t("bonus")}</option>
                <option value="deduction">{t("deduction")}</option>
              </select>
              <input
                className="rate-input"
                type="number"
                placeholder={t("amountLabel")}
                value={adj.amount || ""}
                onChange={(e) => setDefaultAdjustments(defaultAdjustments.map((a, j) => j === i ? { ...a, amount: Number(e.target.value) || 0 } : a))}
              />
              <input
                className="rate-input"
                placeholder={t("defaultAdjNotePlaceholder")}
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
            {t("addRuleBtn")}
          </button>
        </div>

        <div>
          <p className="field-label">{t("employerNoteLabel")} <span className="opt">{t("optional")}</span></p>
          <textarea
            className="note-input"
            placeholder={t("employerNotePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
