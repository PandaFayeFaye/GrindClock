import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Adjustment, Employer, Mood, TimeEntry, Worker } from "./types";

// Data model: users/{uid}/employers/{employerId}, users/{uid}/timeEntries/{entryId},
// users/{uid}/workers/{workerId}. Scoping everything under the signed-in user's uid keeps
// Firestore security rules simple: only the owner can read/write their own subtree.

export function employersCol(uid: string) {
  return collection(db, "users", uid, "employers");
}

export function timeEntriesCol(uid: string) {
  return collection(db, "users", uid, "timeEntries");
}

export function workersCol(uid: string) {
  return collection(db, "users", uid, "workers");
}

export function watchEmployers(uid: string, cb: (list: Employer[]) => void) {
  return onSnapshot(employersCol(uid), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Employer));
  });
}

export function addEmployer(uid: string, data: Omit<Employer, "id">) {
  return addDoc(employersCol(uid), data);
}

export function updateEmployer(uid: string, employerId: string, data: Partial<Employer>) {
  return updateDoc(doc(employersCol(uid), employerId), data);
}

/** Retires a gig: hidden from Home/punch flows from now on, but its history stays untouched. */
export function archiveEmployer(uid: string, employerId: string) {
  return updateDoc(doc(employersCol(uid), employerId), { archived: true });
}

/** Un-retires a gig so it shows up on Home again. */
export function reactivateEmployer(uid: string, employerId: string) {
  return updateDoc(doc(employersCol(uid), employerId), { archived: false });
}

export function watchTimeEntries(uid: string, cb: (list: TimeEntry[]) => void) {
  const q = query(timeEntriesCol(uid), orderBy("startTime", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TimeEntry));
  });
}

// Multiple employers can be clocked in at once (gig workers commonly "dual-app" across
// platforms) -- callers are responsible for blocking only same-employer double clock-ins.
export function clockIn(
  uid: string,
  employerId: string,
  clockInLocation?: { lat: number; lng: number; accuracy: number },
  startTime = Date.now(),
) {
  return addDoc(timeEntriesCol(uid), {
    employerId,
    startTime,
    endTime: null,
    status: "confirmed",
    source: "manual",
    ...(clockInLocation ? { clockInLocation } : {}),
  });
}

export function clockOut(
  uid: string,
  entryId: string,
  extra?: {
    mood?: Mood;
    moodNote?: string;
    adjustment?: Adjustment[];
    note?: string;
    isOvertime?: boolean;
    isHoliday?: boolean;
    orderCount?: number;
    overtimeHours?: number;
  },
  endTime = Date.now(),
) {
  return updateDoc(doc(timeEntriesCol(uid), entryId), {
    endTime,
    ...extra,
  });
}

export function addManualEntry(uid: string, data: Omit<TimeEntry, "id">) {
  return addDoc(timeEntriesCol(uid), data);
}

export function getTimeEntry(uid: string, entryId: string) {
  return getDoc(doc(timeEntriesCol(uid), entryId));
}

export function updateTimeEntry(
  uid: string,
  entryId: string,
  data: { [K in keyof TimeEntry]?: TimeEntry[K] | ReturnType<typeof deleteField> },
) {
  return updateDoc(doc(timeEntriesCol(uid), entryId), data);
}

export function deleteTimeEntry(uid: string, entryId: string) {
  return deleteDoc(doc(timeEntriesCol(uid), entryId));
}

export function watchWorkers(uid: string, cb: (list: Worker[]) => void) {
  return onSnapshot(workersCol(uid), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Worker));
  });
}

export function addWorker(uid: string, data: Omit<Worker, "id">) {
  return addDoc(workersCol(uid), data);
}

export async function addManualEntries(uid: string, entries: Omit<TimeEntry, "id">[]) {
  const batch = writeBatch(db);
  for (const data of entries) {
    batch.set(doc(timeEntriesCol(uid)), data);
  }
  await batch.commit();
}

export async function deleteTimeEntries(uid: string, entryIds: string[]) {
  const batch = writeBatch(db);
  for (const id of entryIds) {
    batch.delete(doc(timeEntriesCol(uid), id));
  }
  await batch.commit();
}

export interface UserProfile {
  animal?: string;
  mbti?: string;
  nickname?: string;
}

function profileDoc(uid: string) {
  return doc(db, "users", uid, "profile", "main");
}

export function watchUserProfile(uid: string, cb: (profile: UserProfile) => void) {
  return onSnapshot(profileDoc(uid), (snap) => cb((snap.data() as UserProfile | undefined) ?? {}));
}

export function setUserProfile(uid: string, profile: UserProfile) {
  return setDoc(profileDoc(uid), profile, { merge: true });
}

/**
 * One-shot check for whether this account already has real data (a chosen
 * avatar, or at least one job) -- used to skip onboarding for an existing
 * user signing in on a device/browser that has no local "onboarded" flag.
 */
export async function hasExistingAccountData(uid: string): Promise<boolean> {
  const [profileSnap, employersSnap] = await Promise.all([
    getDoc(profileDoc(uid)),
    getDocs(query(employersCol(uid), limit(1))),
  ]);
  const profile = profileSnap.data() as UserProfile | undefined;
  return !!profile?.animal || !employersSnap.empty;
}
