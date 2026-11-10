// Pure date/time helpers for the posting schedule. All schedule times are India Standard Time
// (UTC+05:30, no daylight saving), so slot maths is exact offset arithmetic.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHHMM(value: string): { h: number; m: number } | null {
  const m = value.match(HHMM_RE);
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

/** The calendar date in India for an instant, as YYYY-MM-DD. */
export function istDate(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The hour (0–23) on the IST clock at instant `d`. */
export function istHour(d: Date): number {
  return new Date(d.getTime() + IST_OFFSET_MS).getUTCHours();
}

/** The instant at which the IST clock shows `hhmm` on the IST calendar day of `d`. */
export function slotOnIstDay(d: Date, hhmm: string): Date {
  const t = parseHHMM(hhmm) ?? { h: 7, m: 0 };
  const [y, mo, day] = istDate(d).split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, day, t.h, t.m) - IST_OFFSET_MS);
}

/** The next posting slot strictly after `now`. */
export function nextSlot(now: Date, hhmm: string): Date {
  const today = slotOnIstDay(now, hhmm);
  return today.getTime() > now.getTime() ? today : new Date(today.getTime() + DAY_MS);
}

/** When the approval email for a slot should go out. */
export function reviewDueAt(slot: Date, leadHours: number): Date {
  return new Date(slot.getTime() - leadHours * 60 * 60 * 1000);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** e.g. "Thu 12 Nov, 7:00 am" (India time). */
export function formatIst(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** e.g. "7:00 am" (India time). */
export function formatIstTime(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatHHMM(hhmm: string): string {
  const t = parseHHMM(hhmm) ?? { h: 7, m: 0 };
  return formatIstTime(new Date(Date.UTC(2026, 0, 1, t.h, t.m) - IST_OFFSET_MS));
}

/** "in 3 h 20 min" / "5 min ago" — coarse relative time for the dashboard. */
export function relative(d: Date, now: Date = new Date()): string {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  let span: string;
  if (mins < 1) span = "less than a minute";
  else if (mins < 60) span = `${mins} min`;
  else if (mins < 48 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    span = m ? `${h} h ${m} min` : `${h} h`;
  } else span = `${Math.round(mins / 1440)} days`;
  return diff >= 0 ? `in ${span}` : `${span} ago`;
}
