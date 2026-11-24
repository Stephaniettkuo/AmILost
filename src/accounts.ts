// Talking to Firebase for accounts: sign up, sign in, sign out, and "which orgs am I in?".
// The form checks and friendly messages live in accountRules.ts (no Firebase there, so they
// are tested). Errors thrown here are Firebase's; screens pass them to friendlyAuthError.
import {
  User, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signOut, updateProfile,
} from 'firebase/auth';
import { collection, doc, getDocFromServer, getDocsFromServer, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type MyOrg = { id: string; name: string; short: string; role: 'member' | 'admin' };

// Calls `onChange` now and whenever someone signs in or out. Returns a function that stops it.
export function watchUser(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, onChange, () => onChange(null));
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(user, { displayName: name.trim() });
  // The profile document is a nice-to-have: failing to write it must not undo a good sign-up.
  try {
    await setDoc(doc(db, 'users', user.uid), { displayName: name.trim(), createdAt: serverTimestamp() });
  } catch { /* the Auth account exists; the profile can be written later */ }
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

// The orgs this person belongs to. Orgs are public to read, and you may read your OWN member
// document, so: list the orgs, then check each one for "my" membership document.
async function loadMyOrgsImpl(uid: string): Promise<MyOrg[]> {
  const orgs = await getDocsFromServer(collection(db, 'orgs'));
  const checks = await Promise.all(orgs.docs.map(async (org) => {
    const member = await getDocFromServer(doc(db, 'orgs', org.id, 'members', uid));
    if (!member.exists()) return null;
    const data = org.data();
    return {
      id: org.id, name: String(data.name ?? org.id), short: String(data.short ?? ''),
      role: member.data().role === 'admin' ? 'admin' : 'member',
    } as MyOrg;
  }));
  return checks.filter((o): o is MyOrg => o !== null).sort((a, b) => a.name.localeCompare(b.name));
}

// Gives up after 10 seconds, like the org calls (see orgData.ts).
export function loadMyOrgs(uid: string): Promise<MyOrg[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { code: 'unavailable' })), 10000);
    loadMyOrgsImpl(uid).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
