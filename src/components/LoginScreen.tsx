import { useState, type FormEvent } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { confirmPhoneOtp, sendEmailLoginLink, sendPhoneOtp } from "../lib/auth";
import { useT } from "../lib/i18n";

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

type Tab = "phone" | "email";

export function LoginScreen({ emailLinkError }: { emailLinkError?: "noPendingEmail" | "linkExpired" | null }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("phone");

  // Phone flow state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  // Email flow state
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);

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

  async function handleSendEmailLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendEmailLoginLink(email);
      setLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("emailLinkSendFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <img src="/logo-text.png" alt={t("appName")} className="login-logo" />
      <p>{t("appTagline")}</p>

      <div className="login-tabs">
        <button className={tab === "phone" ? "active" : ""} onClick={() => setTab("phone")}>{t("tabPhone")}</button>
        <button className={tab === "email" ? "active" : ""} onClick={() => setTab("email")}>{t("tabEmail")}</button>
      </div>

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

      {tab === "email" && (
        <>
          {!linkSent ? (
            <form onSubmit={handleSendEmailLink} className="login-form">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" disabled={busy}>{t("sendEmailLink")}</button>
            </form>
          ) : (
            <p className="login-hint">{t("emailLinkSentHint", { email })}</p>
          )}
        </>
      )}

      {error && <p className="login-error">{error}</p>}
      {!error && emailLinkError && (
        <p className="login-error">{t(emailLinkError === "noPendingEmail" ? "noPendingEmailError" : "linkExpiredError")}</p>
      )}

      {/* Invisible reCAPTCHA host required by Firebase Phone Auth */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </div>
  );
}
