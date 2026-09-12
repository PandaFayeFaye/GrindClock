import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addManualEntry, deleteTimeEntry, getTimeEntry, updateTimeEntry, watchEmployers, watchWorkers } from "../lib/firestore";
import type { Adjustment, Employer, Mood, TimeEntry, Worker } from "../lib/types";
import "./BackfillEntryPage.css";

const MOODS: { key: Mood; label: string }[] = [
  { key: "crash", label: "崩溃" },
  { key: "normal", label: "普通" },
  { key: "great", label: "爽" },
  { key: "heartbeat", label: "心动" },
];

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BackfillEntryPage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetEmployerId = searchParams.get("employerId");
  const workerId = searchParams.get("workerId") ?? undefined;
  const editId = searchParams.get("editId");

  const [employers, setEmployers] = useState<Employer[]>([]);
  useEffect(() => watchEmployers(uid, setEmployers), [uid]);

  const [workers, setWorkers] = useState<Worker[]>([]);
  useEffect(() => watchWorkers(uid, setWorkers), [uid]);
  const worker = workers.find((w) => w.id === workerId);

  const [selectedEmployerId, setSelectedEmployerId] = useState(presetEmployerId ?? "");
  // Fall back to the first employer once the list loads, without a setState-in-effect
  // round trip -- this is derived at render time, not synced.
  const employerId = selectedEmployerId || employers[0]?.id || "";
  const setEmployerId = setSelectedEmployerId;

  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [mode, setMode] = useState<"duration" | "range">("duration");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("0");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isOvertime, setIsOvertime] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [orderCount, setOrderCount] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [note, setNote] = useState("");
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadedEdit, setLoadedEdit] = useState(false);
  const [prefilledDefaults, setPrefilledDefaults] = useState(false);

  useEffect(() => {
    if (!editId) return;
    getTimeEntry(uid, editId).then((snap) => {
      const data = snap.data() as TimeEntry | undefined;
      if (!data) return;
      setSelectedEmployerId(data.employerId);
      const start = new Date(data.startTime);
      const end = new Date(data.endTime ?? data.startTime);
      setDate(toDateInputValue(start));
      setMode("range");
      setStartTime(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
      setEndTime(`${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`);
      setIsOvertime(!!data.isOvertime);
      setIsHoliday(!!data.isHoliday);
      setOrderCount(data.orderCount ? String(data.orderCount) : "");
      setMood(data.mood);
      setNote(data.note ?? "");
      setAdjustments(data.adjustment ?? []);
      setPrefilledDefaults(true); // editing an existing entry -- never overwrite with the employer's current defaults
      setLoadedEdit(true);
    });
    // Only ever re-run if editId itself changes -- this is a one-time load into local form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, uid]);

  const employer = useMemo(() => employers.find((e) => e.id === employerId), [employers, employerId]);
  const isPerOrder = employer?.payType === "per-order";

  useEffect(() => {
    if (prefilledDefaults || !employer) return;
    setAdjustments(employer.defaultAdjustments ?? []);
    setPrefilledDefaults(true);
  }, [prefilledDefaults, employer]);

  function computeRange(): { start: number; end: number } | null {
    const dayStart = new Date(date + "T00:00:00");
    if (mode === "duration") {
      const h = Number(hours) || 0;
      const m = Number(minutes) || 0;
      if (h === 0 && m === 0) return null;
      const start = dayStart.getTime() + 9 * 3_600_000; // arbitrary anchor, only duration matters
      return { start, end: start + h * 3_600_000 + m * 60_000 };
    }
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = dayStart.getTime() + sh * 3_600_000 + sm * 60_000;
    let end = dayStart.getTime() + eh * 3_600_000 + em * 60_000;
    if (end <= start) end += 24 * 3_600_000; // overnight shift
    return { start, end };
  }

  async function handleSave() {
    if (!employerId) return;
    const range = computeRange();
    if (!range) return;
    setSaving(true);
    const data = {
      employerId,
      startTime: range.start,
      endTime: range.end,
      status: "confirmed" as const,
      source: "manual" as const,
      isOvertime,
      isHoliday,
      ...(workerId ? { workerId } : {}),
      ...(isPerOrder && orderCount ? { orderCount: Number(orderCount) } : {}),
      ...(mood ? { mood } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(adjustments.length > 0 ? { adjustment: adjustments } : {}),
    };
    if (editId) {
      await updateTimeEntry(uid, editId, data);
    } else {
      await addManualEntry(uid, data);
    }
    setSaving(false);
    navigate(-1);
  }

  async function handleDelete() {
    if (!editId) return;
    setDeleting(true);
    await deleteTimeEntry(uid, editId);
    setDeleting(false);
    navigate(-1);
  }

  return (
    <div className="backfill-form">
      <div className="topbar">
        <button className="close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1>{editId ? "编辑工时记录" : worker ? `为${worker.name}记工时` : "补录工时"}</h1>
        <button className="save-btn" onClick={handleSave} disabled={saving || !employerId || (!!editId && !loadedEdit)}>
          保存
        </button>
      </div>

      <div className="body">
        <div>
          <p className="field-label">雇主</p>
          <select className="select-field" value={employerId} onChange={(e) => setEmployerId(e.target.value)}>
            {employers.length === 0 && <option value="">还没有雇主</option>}
            {employers.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="field-label">日期</p>
          <input className="date-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <p className="field-label">记录方式</p>
          <div className="mode-tabs">
            <button
              type="button"
              className={`mode-tab${mode === "duration" ? " active" : ""}`}
              onClick={() => setMode("duration")}
            >
              直接填时长
            </button>
            <button
              type="button"
              className={`mode-tab${mode === "range" ? " active" : ""}`}
              onClick={() => setMode("range")}
            >
              填上下班时间点
            </button>
          </div>
        </div>

        {mode === "duration" ? (
          <div>
            <p className="field-label">工时时长</p>
            <div className="time-row">
              <input className="time-input" type="number" placeholder="小时" value={hours} onChange={(e) => setHours(e.target.value)} />
              <span className="time-sep">小时</span>
              <input className="time-input" type="number" placeholder="分钟" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <span className="time-sep">分钟</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="field-label">上下班时间点</p>
            <div className="time-row">
              <input className="time-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <span className="time-sep">→</span>
              <input className="time-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

        <div className="toggle-row" onClick={() => setIsOvertime(!isOvertime)}>
          <span>按加班倍率计算</span>
          <div className={`switch${isOvertime ? " on" : ""}`}><div className="knob" /></div>
        </div>
        <div className="toggle-row" onClick={() => setIsHoliday(!isHoliday)}>
          <span>按节假日倍率计算</span>
          <div className={`switch${isHoliday ? " on" : ""}`}><div className="knob" /></div>
        </div>

        {isPerOrder && (
          <div>
            <p className="field-label">完成单数</p>
            <input className="time-input" type="number" placeholder="单数" value={orderCount} onChange={(e) => setOrderCount(e.target.value)} style={{ width: "100%" }} />
          </div>
        )}

        <div>
          <p className="field-label">
            今天感觉怎么样？<span className="opt">（可跳过）</span>
          </p>
          <div className="mood-tags">
            {MOODS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`mood-tag${mood === m.key ? " selected" : ""}`}
                onClick={() => setMood(mood === m.key ? undefined : m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label">补贴/扣款 <span className="opt">可选，含该雇主的默认规则</span></p>
          {adjustments.map((adj, i) => (
            <div className="adj-edit-row" key={i}>
              <select
                className="select-field"
                value={adj.type}
                onChange={(e) => setAdjustments(adjustments.map((a, j) => j === i ? { ...a, type: e.target.value as "bonus" | "deduction" } : a))}
              >
                <option value="bonus">补贴</option>
                <option value="deduction">扣款</option>
              </select>
              <input
                className="time-input"
                type="number"
                placeholder="金额"
                value={adj.amount || ""}
                onChange={(e) => setAdjustments(adjustments.map((a, j) => j === i ? { ...a, amount: Number(e.target.value) || 0 } : a))}
              />
              <input
                className="time-input"
                placeholder="备注"
                value={adj.note ?? ""}
                onChange={(e) => setAdjustments(adjustments.map((a, j) => j === i ? { ...a, note: e.target.value } : a))}
              />
              <button type="button" className="remove-adj-btn" onClick={() => setAdjustments(adjustments.filter((_, j) => j !== i))}>
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
          <button type="button" className="add-adj-btn" onClick={() => setAdjustments([...adjustments, { type: "bonus", amount: 0 }])}>
            + 添加一条
          </button>
        </div>

        <div>
          <p className="field-label">备注 <span className="opt">可选</span></p>
          <textarea className="note-input" placeholder="今天发生了什么值得记一笔的事吗" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {editId && (
          <button className="delete-entry-btn" onClick={handleDelete} disabled={deleting}>
            删除这条记录
          </button>
        )}
      </div>
    </div>
  );
}
