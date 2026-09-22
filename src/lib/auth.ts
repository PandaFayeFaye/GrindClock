import {
  EmailAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export function watchAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function logout() {
  return signOut(auth);
}

// ---- Phone number + SMS code ----

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

function resetRecaptcha(containerId: string, verifier: RecaptchaVerifier) {
  // Drop our reference FIRST -- verifier.clear() can itself throw (e.g. the
  // invisible widget never finished rendering before the failure), and if
  // that happens before the map entry is removed, the next click reuses this
  // same broken verifier and fails immediately with "reCAPTCHA has already
  // been rendered in this element" instead of ever reaching Firebase's real
  // phone-number validation.
  recaptchaVerifiers.delete(containerId);
  try {
    verifier.clear();
  } catch {
    // Already dropped from our map; grecaptcha's own internal render marker
    // on the DOM node is the thing that actually causes the "already
    // rendered" error, so rebuild the node too -- a fresh element has no
    // marker for grecaptcha to trip over.
    const old = document.getElementById(containerId);
    if (old?.parentElement) {
      const fresh = document.createElement("div");
      fresh.id = containerId;
      old.parentElement.replaceChild(fresh, old);
    }
  }
}

export function sendPhoneOtp(
  phoneNumber: string,
  recaptchaContainerId: string,
): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(recaptchaContainerId);
  return signInWithPhoneNumber(auth, phoneNumber, verifier).catch((err) => {
    // A failed attempt can leave the widget in a bad state -- drop it so the
    // next click builds a fresh one instead of erroring on "already rendered".
    resetRecaptcha(recaptchaContainerId, verifier);
    throw err;
  });
}

export function confirmPhoneOtp(confirmation: ConfirmationResult, code: string) {
  return confirmation.confirm(code);
}

// ---- Email + password ----
// Firebase's passwordless "email link" flow depends on the user receiving and
// opening a link in the SAME browser/app that requested it, which is fragile
// in practice (mail delayed/filtered, or opened from a different browser/app
// than the one that asked -- very common with in-app browsers). Email +
// password sign-in has no such dependency: the account exists the moment
// it's created, and email verification is a non-blocking background step.

export function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password).then((cred) => {
    sendEmailVerification(cred.user).catch(() => {
      // Best-effort only -- a delivery failure here shouldn't block sign-up.
    });
    return cred;
  });
}

export function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

// Lets a phone-only account (no email/password provider yet) add one, so it
// can also sign in with email + password afterwards instead of always
// needing a fresh SMS code.
export function linkEmailPassword(email: string, password: string) {
  const user = auth.currentUser;
  if (!user) return Promise.reject(new Error("Not signed in"));
  return linkWithCredential(user, EmailAuthProvider.credential(email, password));
}
