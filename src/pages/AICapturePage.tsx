import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addManualEntry, watchEmployers } from "../lib/firestore";
import { recognizeImageText } from "../lib/ocr";
import { parseSpeechToDraft } from "../lib/parseSpeechToDraft";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import type { Employer } from "../lib/types";
import "./AICapturePage.css";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function AICapturePage({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  useEffect(() => watchEmployers(uid, setEmployers), [uid]);
  const [aiPhotoOn] = useLocalToggle(SETTINGS_KEYS.aiPhoto, true);
  const [aiVoiceOn] = useLocalToggle(SETTINGS_KEYS.aiVoice, true);

  const [source, setSource] = useState<"ocr" | "voice">(aiVoiceOn ? "voice" : "ocr");
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const [employerId, setEmployerId] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("0");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const speechSupported = !!getSpeechRecognition();

  function applyDraft(text: string) {
    setRawText(text);
    const draft = parseSpeechToDraft(text, employers);
    if (draft.employerId) setEmployerId(draft.employerId);
    if (draft.hours !== undefined) setHours(String(draft.hours));
    if (draft.minutes !== undefined) setMinutes(String(draft.minutes));
    setNote(text);
  }

  function startRecording() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("这个浏览器不支持语音识别（建议用Chrome），可以改用拍照识别或手动补录");
      return;
    }
    setError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      applyDraft(transcript);
    };
    recognition.onerror = () => setError("没听清，再试一次？");
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const text = await recognizeImageText(file, setProgress);
      applyDraft(text);
    } catch {
      setError("识别失败，可以手动填写或换一张更清晰的照片");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!employerId) return;
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    if (h === 0 && m === 0) return;
    setSaving(true);
    const start = Date.now() - (h * 3_600_000 + m * 60_000);
    await addManualEntry(uid, {
      employerId,
      startTime: start,
      endTime: Date.now(),
      status: "confirmed",
      source,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setSaving(false);
    navigate("/");
  }

  const showDraftForm = rawText.length > 0;

  return (
    <div className="ai-capture">
      <div className="topbar">
        <button className="close" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" stroke="#1A1A1A" strokeWidth="2.3" strokeLinecap="round" /></svg>
        </button>
        <h1>AI 记工</h1>
        <div className="src-toggle">
          {aiVoiceOn && <button className={`src-btn${source === "voice" ? " active" : ""}`} onClick={() => { setSource("voice"); setRawText(""); }}>语音</button>}
          {aiPhotoOn && <button className={`src-btn${source === "ocr" ? " active" : ""}`} onClick={() => { setSource("ocr"); setRawText(""); }}>拍照</button>}
        </div>
      </div>

      <div className="body">
        {!aiVoiceOn && !aiPhotoOn && (
          <p className="warn">拍照识别和语音记工都在设置页关闭了，去设置页打开一个吧</p>
        )}
        <div className="disclaimer">
          识别用的是免费的浏览器语音识别和OCR文字识别，不是真正理解语义的AI模型，只能抓一些"6小时""XX店"这样的简单信息——保存前一定要检查一下下面的字段对不对。
        </div>

        {source === "voice" && aiVoiceOn && !showDraftForm && (
          <div className="capture-panel">
            {!speechSupported && <p className="warn">这个浏览器不支持语音识别，建议用Chrome，或者切到拍照/手动补录</p>}
            <button className={`mic-btn${recording ? " recording" : ""}`} onClick={recording ? stopRecording : startRecording} disabled={!speechSupported}>
              <svg viewBox="0 0 24 24" fill="none" width="30" height="30">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
                <path d="M6 11a6 6 0 0012 0M12 17v3M9 20h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <p className="mic-label">{recording ? "正在听...点击结束" : "点击开始说话"}</p>
          </div>
        )}

        {source === "ocr" && aiPhotoOn && !showDraftForm && (
          <div className="capture-panel">
            <label className="photo-btn">
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} hidden />
              <svg viewBox="0 0 24 24" fill="none" width="30" height="30">
                <path d="M4 8a2 2 0 012-2h1.5l1-2h7l1 2H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" fill="#fff" />
                <circle cx="12" cy="13" r="3.2" fill="#5AC8FA" />
              </svg>
            </label>
            <p className="mic-label">{busy ? `识别中 ${progress}%...` : "点击拍照或选择相册"}</p>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {showDraftForm && (
          <div className="draft-form">
            <span className="draft-badge">草稿 · 待确认</span>
            <p className="raw-text-preview">识别原文："{rawText}"</p>

            <div>
              <p className="field-label">雇主</p>
              <select className="select-field" value={employerId} onChange={(e) => setEmployerId(e.target.value)}>
                <option value="">请选择</option>
                {employers.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>

            <div className="field-row">
              <div>
                <p className="field-label">小时</p>
                <input className="field-input" type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div>
                <p className="field-label">分钟</p>
                <input className="field-input" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </div>
            </div>

            <div className="actions">
              <button className="retry-btn" onClick={() => setRawText("")}>重新识别</button>
              <button className="save-btn" onClick={handleSave} disabled={saving || !employerId}>确认保存</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
