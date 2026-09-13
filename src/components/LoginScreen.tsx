import { useState, type FormEvent } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { confirmPhoneOtp, loginWithEmail, registerWithEmail, sendPasswordReset, sendPhoneOtp } from "../lib/auth";
import { useT, type DictKey } from "../lib/i18n";

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

type Tab = "phone" | "email";
type EmailMode = "login" | "register";

function friendlyAuthError(err: unknown, t: (k: DictKey) => string): string {
  const code = err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
  switch (code) {
    case "auth/email-already-in-use": return t("authErrEmailInUse");
    case "auth/invalid-email": return t("authErrInvalidEmail");
    case "auth/weak-password": return t("authErrWeakPassword");
    case "auth/user-not-found": return t("authErrUserNotFound");
    case "auth/wrong-password":
    case "auth/invalid-credential": return t("authErrWrongPassword");
    case "auth/too-many-requests": return t("authErrTooManyRequests");
    case "auth/operation-not-allowed": return t("authErrProviderDisabled");
    default: return err instanceof Error ? err.message : t("authErrGeneric");
  }
}

export function LoginScreen() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("email");

  // Phone flow state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  // Email flow state
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setConfirmation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("otpSendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmOtp(e: FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    setError(null);
    setBusy(true);
    try {
      await confirmPhoneOtp(confirmation, otp);
    } catch {
      setError(t("otpWrong"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setBusy(true);
    try {
      if (emailMode === "register") {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(friendlyAuthError(err, t));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError(t("authErrNeedEmailForReset"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      setError(friendlyAuthError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <img src="/logo-text.png" alt={t("appName")} className="login-logo" />
      <p>{t("appTagline")}</p>

      <div className="login-tabs">
        <button className={tab === "email" ? "active" : ""} onClick={() => { setTab("email"); setError(null); }}>{t("tabEmail")}</button>
        <button className={tab === "phone" ? "active" : ""} onClick={() => { setTab("phone"); setError(null); }}>{t("tabPhone")}</button>
      </div>

      {tab === "email" && (
        <>
          <div className="login-mode-toggle">
            <button
              type="button"
              className={emailMode === "login" ? "active" : ""}
              onClick={() => { setEmailMode("login"); setError(null); setResetSent(false); }}
            >
              {t("emailModeLogin")}
            </button>
            <button
              type="button"
              className={emailMode === "register" ? "active" : ""}
              onClick={() => { setEmailMode("register"); setError(null); setResetSent(false); }}
            >
              {t("emailModeRegister")}
            </button>
          </div>
          <form onSubmit={handleEmailSubmit} className="login-form">
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              autoComplete={emailMode === "register" ? "new-password" : "current-password"}
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={busy}>
              {emailMode === "register" ? t("registerBtn") : t("loginBtn")}
            </button>
          </form>
          {emailMode === "login" && (
            <button type="button" className="login-forgot-btn" onClick={handleForgotPassword} disabled={busy}>
              {t("forgotPasswordBtn")}
            </button>
          )}
          {resetSent && <p className="login-hint">{t("passwordResetSentHint", { email })}</p>}
        </>
      )}

      {tab === "phone" && (
        <>
          {!confirmation ? (
            <form onSubmit={handleSendOtp} className="login-form">
              <input
                placeholder={t("phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button type="submit" disabled={busy}>{t("sendOtp")}</button>
            </form>
          ) : (
            <form onSubmit={handleConfirmOtp} className="login-form">
              <input
                placeholder={t("otpPlaceholder")}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button type="submit" disabled={busy}>{t("loginBtn")}</button>
            </form>
          )}
        </>
      )}

      {error && <p className="login-error">{error}</p>}

      {/* Invisible reCAPTCHA host required by Firebase Phone Auth */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </div>
  );
}
