import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Employer, TimeEntry } from "./types";

// Data model: users/{uid}/employers/{employerId}, users/{uid}/timeEntries/{entryId}
// Scoping everything under the signed-in user's uid keeps Firestore security rules simple:
// only the owner can read/write their own subtree.

export function employersCol(uid: string) {
  return collection(db, "users", uid, "employers");
}

export function timeEntriesCol(uid: string) {
  return collection(db, "users", uid, "timeEntries");
}

export function watchEmployers(uid: string, cb: (list: Employer[]) => void) {
  return onSnapshot(employersCol(uid), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Employer));
  });
}

export function addEmployer(uid: string, data: Omit<Employer, "id">) {
  return addDoc(employersCol(uid), data);
}

export function watchTimeEntries(uid: string, cb: (list: TimeEntry[]) => void) {
  const q = query(timeEntriesCol(uid), orderBy("startTime", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TimeEntry));
  });
}

export function clockIn(uid: string, employerId: string) {
  return addDoc(timeEntriesCol(uid), {
    employerId,
    startTime: Date.now(),
    endTime: null,
  });
}

export function clockOut(uid: string, entryId: string) {
  return updateDoc(doc(timeEntriesCol(uid), entryId), { endTime: Date.now() });
}

export function deleteTimeEntry(uid: string, entryId: string) {
  return deleteDoc(doc(timeEntriesCol(uid), entryId));
}
