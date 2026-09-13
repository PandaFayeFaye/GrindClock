import {
  RecaptchaVerifier,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

const PENDING_EMAIL_KEY = "gigtime_pending_email";

export function watchAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function logout() {
  return signOut(auth);
}

// ---- Phone number + SMS code (primary path for mainland China users) ----

// Firebase throws "reCAPTCHA has already been rendered in this element" if a
// second RecaptchaVerifier is created against the same DOM node -- the widget
// from a first attempt (even a failed one) is still attached. Reuse one
// verifier per container instead of creating a fresh one on every call.
const recaptchaVerifiers = new Map<string, RecaptchaVerifier>();

function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  let verifier = recaptchaVerifiers.get(containerId);
  if (!verifier) {
    verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
    recaptchaVerifiers.set(containerId, verifier);
  }
  return verifier;
}

export function sendPhoneOtp(
  phoneNumber: string,
  recaptchaContainerId: string,
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(recaptchaContainerId);
  return signInWithPhoneNumber(auth, phoneNumber, verifier).catch((err) => {
    // A failed attempt can leave the widget in a bad state -- drop it so the
    // next click builds a fresh one instead of erroring on "already rendered".
    verifier.clear();
    recaptchaVerifiers.delete(recaptchaContainerId);
    throw err;
  });
}

export function confirmPhoneOtp(confirmation: ConfirmationResult, code: string) {
  return confirmation.confirm(code);
}

// ---- Email magic link (free, primary path for overseas users) ----
// NOTE: `url` must be an allowed redirect domain in Firebase Auth settings, and for
// the native iOS/Android build it needs to resolve back into the app via a
// Capacitor deep link (App URL Open listener) rather than a plain web URL.

export function sendEmailLoginLink(email: string) {
  const actionCodeSettings = {
    url: window.location.origin,
    handleCodeInApp: true,
  };
  window.localStorage.setItem(PENDING_EMAIL_KEY, email);
  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export function isEmailLoginLink(url: string) {
  return isSignInWithEmailLink(auth, url);
}

export async function completeEmailLoginLink(url: string, fallbackEmail?: string) {
  const email = fallbackEmail ?? window.localStorage.getItem(PENDING_EMAIL_KEY);
  if (!email) {
    throw new Error("No pending email found for this sign-in link.");
  }
  const result = await signInWithEmailLink(auth, email, url);
  window.localStorage.removeItem(PENDING_EMAIL_KEY);
  return result;
}
