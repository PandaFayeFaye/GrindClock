import { useState, type FormEvent } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { confirmPhoneOtp, sendEmailLoginLink, sendPhoneOtp } from "../lib/auth";

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

type Tab = "phone" | "email";

export function LoginScreen({ emailLinkError }: { emailLinkError?: string | null }) {
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
      setError(err instanceof Error ? err.message : "发送验证码失败，请检查手机号格式（需带国家区号，如+8613800000000）");
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
      setError("验证码不正确，请重新输入");
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
      setError(err instanceof Error ? err.message : "发送登录链接失败，请检查邮箱格式");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <h1>GigTime</h1>
      <p>多雇主工时与收入记录</p>

      <div className="login-tabs">
        <button className={tab === "phone" ? "active" : ""} onClick={() => setTab("phone")}>手机号</button>
        <button className={tab === "email" ? "active" : ""} onClick={() => setTab("email")}>邮箱</button>
      </div>

      {tab === "phone" && (
        <>
          {!confirmation ? (
            <form onSubmit={handleSendOtp} className="login-form">
              <input
                placeholder="手机号（含国家区号，如+8613800000000）"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button type="submit" disabled={busy}>发送验证码</button>
            </form>
          ) : (
            <form onSubmit={handleConfirmOtp} className="login-form">
              <input
                placeholder="6位验证码"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button type="submit" disabled={busy}>登录</button>
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
              <button type="submit" disabled={busy}>发送登录链接</button>
            </form>
          ) : (
            <p className="login-hint">已发送登录链接到 {email}，去邮箱点一下吧</p>
          )}
        </>
      )}

      {error && <p className="login-error">{error}</p>}
      {!error && emailLinkError && <p className="login-error">{emailLinkError}</p>}

      {/* Invisible reCAPTCHA host required by Firebase Phone Auth */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </div>
  );
}
