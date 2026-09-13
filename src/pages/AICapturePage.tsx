import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addManualEntry, watchEmployers } from "../lib/firestore";
import { recognizeImageText } from "../lib/ocr";
import { parseSpeechToDraft } from "../lib/parseSpeechToDraft";
import { SETTINGS_KEYS, useLocalToggle } from "../lib/settings";
import { useT } from "../lib/i18n";
import type { Employer } from "../lib/types";
import "./AICapturePage.css";

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// Live mic-level visualizer, independent of SpeechRecognition (which doesn't
// expose audio levels) -- purely cosmetic, so any failure here is swallowed
// and never blocks recognition itself.
function useMicLevel(active: boolean): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }
    let stopped = false;
    let raf = 0;
    let stream: MediaStream | undefined;
    let ctx: AudioContext | undefined;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stopped) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (stopped) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Mic permission denied/unsupported -- no visualizer, recognition still works.
      }
    })();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      ctx?.close();
    };
  }, [active]);

  return level;
}

export function AICapturePage({ uid }: { uid: string }) {
  const t = useT();
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
  const [processingVoice, setProcessingVoice] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const micLevel = useMicLevel(recording);

  const [employerId, setEmployerId] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("0");
  const [startTimeStr, setStartTimeStr] = useState<string | undefined>(undefined);
  const [endTimeStr, setEndTimeStr] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const speechSupported = !!getSpeechRecognition();

  function applyDraft(text: string) {
    setRawText(text);
    const draft = parseSpeechToDraft(text, employers);
    if (draft.employerId) setEmployerId(draft.employerId);
    if (draft.hours !== undefined) setHours(String(draft.hours));
    if (draft.minutes !== undefined) setMinutes(String(draft.minutes));
    setStartTimeStr(draft.startTimeStr);
    setEndTimeStr(draft.endTimeStr);
    setNote(text);
  }

  function startRecording() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError(t("voiceNotSupportedShort"));
      return;
    }
    setError(null);
    finalTranscriptRef.current = "";
    setLiveText("");
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    // continuous + interimResults: without `continuous`, the browser stops
    // listening after the first short pause (a few seconds), cutting the user
    // off mid-sentence -- this was the reported "auto-disconnects" bug.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalTranscriptRef.current += transcript;
        else interim += transcript;
      }
      setLiveText(finalTranscriptRef.current + interim);
    };
    recognition.onerror = (event) => {
      // "no-speech"/"aborted" fire routinely (e.g. a brief pause, or our own
      // stop() call) and don't mean the session failed -- only surface an
      // error for something the user needs to act on.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(t("didntCatchThat"));
      }
    };
    recognition.onend = () => {
      setRecording(false);
      setProcessingVoice(false);
      const transcript = (finalTranscriptRef.current || liveText).trim();
      if (transcript) {
        applyDraft(transcript);
      } else {
        setError(t("noSpeechCaptured"));
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function stopRecording() {
    setProcessingVoice(true);
    recognitionRef.current?.stop();
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
      setError(t("ocrFailed"));
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

    let start: number;
    let end: number;
    if (startTimeStr && endTimeStr) {
      // Anchor the recognized clock times to today; roll to the next day if the
      // end time is earlier than the start (overnight shift).
      const today = new Date();
      const [sh, sm] = startTimeStr.split(":").map(Number);
      const [eh, em] = endTimeStr.split(":").map(Number);
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), sh, sm).getTime();
      end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eh, em).getTime();
      if (end <= start) end += 24 * 3_600_000;
    } else {
      end = Date.now();
      start = end - (h * 3_600_000 + m * 60_000);
    }

    await addManualEntry(uid, {
      employerId,
      startTime: start,
      endTime: end,
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
        <h1>{t("aiCaptureTitle")}</h1>
        <div className="src-toggle">
          {aiVoiceOn && <button className={`src-btn${source === "voice" ? " active" : ""}`} onClick={() => { setSource("voice"); setRawText(""); }}>{t("voiceTab")}</button>}
          {aiPhotoOn && <button className={`src-btn${source === "ocr" ? " active" : ""}`} onClick={() => { setSource("ocr"); setRawText(""); }}>{t("photoTab")}</button>}
        </div>
      </div>

      <div className="body">
        {!aiVoiceOn && !aiPhotoOn && (
          <p className="warn">{t("aiBothOffWarn")}</p>
        )}
        <div className="disclaimer">{t("aiDisclaimer")}</div>

        {source === "voice" && aiVoiceOn && !showDraftForm && (
          <div className="capture-panel">
            {!speechSupported && <p className="warn">{t("voiceNotSupported")}</p>}

            {recording && (
              <div className="mic-waveform">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className="mic-bar"
                    style={{ transform: `scaleY(${0.25 + micLevel * (0.6 + 0.4 * Math.sin(i * 1.3))})` }}
                  />
                ))}
              </div>
            )}

            <button
              className={`mic-btn${recording ? " recording" : ""}`}
              onClick={recording ? stopRecording : startRecording}
              disabled={!speechSupported || processingVoice}
            >
              {processingVoice ? (
                <span className="mic-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" width="30" height="30">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
                  <path d="M6 11a6 6 0 0012 0M12 17v3M9 20h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <p className="mic-label">
              {processingVoice ? t("processingVoice") : recording ? t("listening") : t("tapToSpeak")}
            </p>

            {recording && (
              <p className="live-transcript">{liveText || t("liveTranscriptPlaceholder")}</p>
            )}
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
            <p className="mic-label">{busy ? t("recognizing", { pct: progress }) : t("tapToPhoto")}</p>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {showDraftForm && (
          <div className="draft-form">
            <span className="draft-badge">{t("draftBadge")}</span>
            <p className="raw-text-preview">{t("rawTextPreview", { text: rawText })}</p>

            <div>
              <p className="field-label">{t("employerLabel")}</p>
              <select className="select-field" value={employerId} onChange={(e) => setEmployerId(e.target.value)}>
                <option value="">{t("pleaseSelect")}</option>
                {employers.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>

            {startTimeStr && endTimeStr && (
              <div className="field-row">
                <div>
                  <p className="field-label">{t("startTimeLabel")}</p>
                  <input
                    className="field-input"
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => {
                      setStartTimeStr(e.target.value);
                      const draft = parseSpeechToDraft(`${e.target.value}-${endTimeStr}`, []);
                      if (draft.hours !== undefined) setHours(String(draft.hours));
                      if (draft.minutes !== undefined) setMinutes(String(draft.minutes));
                    }}
                  />
                </div>
                <div>
                  <p className="field-label">{t("endTimeLabel")}</p>
                  <input
                    className="field-input"
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => {
                      setEndTimeStr(e.target.value);
                      const draft = parseSpeechToDraft(`${startTimeStr}-${e.target.value}`, []);
                      if (draft.hours !== undefined) setHours(String(draft.hours));
                      if (draft.minutes !== undefined) setMinutes(String(draft.minutes));
                    }}
                  />
                </div>
              </div>
            )}

            <div className="field-row">
              <div>
                <p className="field-label">{t("hoursLabel")}</p>
                <input className="field-input" type="number" value={hours} onChange={(e) => { setHours(e.target.value); setStartTimeStr(undefined); setEndTimeStr(undefined); }} />
              </div>
              <div>
                <p className="field-label">{t("minutesLabel")}</p>
                <input className="field-input" type="number" value={minutes} onChange={(e) => { setMinutes(e.target.value); setStartTimeStr(undefined); setEndTimeStr(undefined); }} />
              </div>
            </div>

            <div className="actions">
              <button className="retry-btn" onClick={() => setRawText("")}>{t("retryRecognition")}</button>
              <button className="save-btn" onClick={handleSave} disabled={saving || !employerId}>{t("confirmSave")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
