/**
 * How a clip is looked up (spec 2026-10-06 §4): a lone character by the reading its card teaches (调|tiáo), anything longer
 * by its text. Shared by the app and scripts/audio, so both always agree.
 */
export function clipKey(text: string, reading?: string): string {
  const t = text.trim();
  return reading && Array.from(t).length === 1 ? `${t}|${reading}` : t;
}
