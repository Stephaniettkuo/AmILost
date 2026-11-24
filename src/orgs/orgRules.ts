// Org rules that need no Firebase: searching orgs, invite codes, and checking a new event.
// Pure functions, so they are easy to test.
import { utcFromAustinWall } from '../calendar/time';

export type Org = {
  id: string;
  name: string;
  short: string;            // short description shown in the list
  description: string;
  isPrivate: boolean;       // private orgs need an invite code to join
  claimed: boolean;         // false until a real officer claims it with a claim code
  calendarUrl?: string;     // the org's public calendar (Google Calendar / iCal link)
};
export type Role = 'member' | 'admin';
export type Visibility = 'public' | 'members';

// An event as the app uses it (times as real moments, in milliseconds since 1970 UTC).
export type OrgEvent = {
  id: string; orgId: string; title: string; description: string; startMs: number; endMs: number;
  placeId: string | null; locationText: string; visibility: Visibility; createdBy: string; source: 'manual' | 'import';
};

// ---------- Finding orgs ----------

// Orgs whose name, short description or id contain the query (capitals don't matter). Empty = all of them.
export function searchOrgs(orgs: Org[], query: string): Org[] {
  const q = query.trim().toLowerCase();
  if (!q) return orgs;
  return orgs.filter((o) => `${o.name} ${o.short} ${o.id}`.toLowerCase().includes(q));
}

// ---------- Codes ----------

// No I, O, 0 or 1, so a code read aloud or off a poster can't be mistyped as another letter.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

// A new invite code. `random` gives numbers from 0 up to (not including) 1; tests pass their own.
export function makeInviteCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

// What people type is cleaned up before use: " ab c-12 " -> "ABC-12" is NOT guessed at; we only trim,
// drop inner spaces and use capitals. (The rules allow codes of 1 to 64 characters.)
export function normalizeCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase().slice(0, 64);
}

// ---------- Posting an event ----------

export type EventForm = {
  title: string;
  description: string;
  day: Date;                // the day, as Austin wall-clock midnight (see calendar/time.ts)
  startMinutes: number;     // minutes after midnight, 0..1439
  lengthMinutes: number;
  placeId: string | null;   // a room on our map, or null
  locationText: string;     // a place that is not on the map ("Welch Patio"), or ""
  visibility: Visibility;
};

export const MAX_TITLE = 80;       // the same limit as firestore.rules
export const MAX_DESCRIPTION = 1500;
export const MAX_LOCATION = 100;
export const LENGTHS = [30, 60, 90, 120, 180]; // the length chips, in minutes

// A problem to show above the Post button, or null when the event is fine to post.
export function validateNewEvent(form: EventForm, org: Pick<Org, 'isPrivate'>): string | null {
  const title = form.title.trim();
  if (!title) return 'Give the event a title.';
  if (title.length > MAX_TITLE) return `Keep the title to ${MAX_TITLE} letters or fewer.`;
  if (form.description.length > MAX_DESCRIPTION) return 'The description is too long.';
  if (form.locationText.trim().length > MAX_LOCATION) return 'The location text is too long.';
  if (!(form.lengthMinutes > 0 && form.lengthMinutes <= 24 * 60)) return 'Pick how long it lasts.';
  if (org.isPrivate && form.visibility === 'public') return 'Private organizations can only post members-only events.';
  return null;
}

// What gets saved. Times become real moments (milliseconds, UTC); empty optional fields are left out
// (Firestore refuses "undefined"). Private orgs are forced to members-only, matching the rules.
export type NewEventDoc = {
  title: string; description?: string; startMs: number; endMs: number;
  placeId?: string; locationText?: string; visibility: Visibility; source: 'manual';
};

export function buildEventDoc(form: EventForm, org: Pick<Org, 'isPrivate'>): NewEventDoc {
  const start = new Date(form.day.getFullYear(), form.day.getMonth(), form.day.getDate(), 0, form.startMinutes);
  const end = new Date(form.day.getFullYear(), form.day.getMonth(), form.day.getDate(), 0, form.startMinutes + form.lengthMinutes);
  const doc: NewEventDoc = {
    title: form.title.trim(),
    startMs: utcFromAustinWall(start),
    endMs: utcFromAustinWall(end),
    visibility: org.isPrivate ? 'members' : form.visibility,
    source: 'manual',
  };
  if (form.description.trim()) doc.description = form.description.trim();
  if (form.placeId) doc.placeId = form.placeId;
  else if (form.locationText.trim()) doc.locationText = form.locationText.trim();
  return doc;
}

// ---------- Small helpers for the time steppers ----------

// 0 -> "12:00 AM", 960 -> "4:00 PM", 750 -> "12:30 PM"
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24, m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// Move the start time by `delta` minutes, staying inside the same day (0:00 to 23:30).
export const stepStart = (minutes: number, delta: number) => Math.max(0, Math.min(23 * 60 + 30, minutes + delta));

// "30 min", "1 hour", "1.5 hours", "2 hours"
export function lengthText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

// ---------- Friendly messages for database errors ----------

// Firestore errors have a code like "permission-denied" or "unavailable".
export function friendlyDbError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'permission-denied':
      return "That wasn't allowed. If you typed a code, check it and try again.";
    case 'unavailable':
    case 'deadline-exceeded':
    case 'failed-precondition':
      return "Can't reach the server right now. Check your internet and try again. Maps and directions still work.";
    case 'unauthenticated':
      return 'Please sign in first.';
    default:
      console.warn('Unhandled database error:', code || error);
      return 'Something went wrong. Please try again.';
  }
}
