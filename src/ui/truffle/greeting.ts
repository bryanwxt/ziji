// Truffle greets the child at the start of a lesson (spec 2026-10-04 §4.6). The lesson asks once; the next live Truffle to
// appear takes the greeting (each screen draws its own Truffle, so none of them needs to know).
let pending: { line: string; at: number } | null = null;
/** A greeting not taken within this long is dropped, so it never lands on a later screen (final review). */
const GREETING_MS = 4000;

export function requestGreeting(line: string): void {
  pending = { line, at: Date.now() };
}

/** The greeting waiting for the next Truffle, if any; taking it clears it. */
export function takeGreeting(): string | null {
  const p = pending;
  pending = null;
  return p && Date.now() - p.at <= GREETING_MS ? p.line : null;
}

/**
 * How he feels about today (spec 2026-10-04 §4.6), from the days he finished a lesson: 'streak' when yesterday was one of them,
 * 'missed' when the last one was before yesterday, otherwise 'plain' (a new child, or only today so far).
 */
export function dayMood(doneDates: string[], today: string): 'missed' | 'streak' | 'plain' {
  const past = doneDates.filter((d) => d < today);
  if (!past.length) return 'plain';
  const y = new Date(`${today}T12:00:00`);
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  if (past.includes(yesterday)) return 'streak';
  return past.some((d) => d > yesterday) ? 'plain' : 'missed';
}
