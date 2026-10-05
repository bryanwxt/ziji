/** What he has found by tapping the journey worlds (spec §15 tap fun), with one-a-day limits. */
export interface Finds {
  animals: string[];
  gems: number;
  eggTapped: boolean;
  dinoHatched: boolean;
  lastAnimalDate: string | null;
  lastGemDate: string | null;
  lastDigDate: string | null;
}

export const DEFAULT_FINDS: Finds = { animals: [], gems: 0, eggTapped: false, dinoHatched: false, lastAnimalDate: null, lastGemDate: null, lastDigDate: null };

/** The zodiac animals, in order (the onesie ids). */
export const ZODIAC_ORDER = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];

/** A new animal at most once a day, in zodiac order; otherwise one he has found waves. */
export function findAnimal(f: Finds, today: string): { finds: Finds; animal: string; isNew: boolean } {
  const next = ZODIAC_ORDER.find((a) => !f.animals.includes(a));
  if (next && f.lastAnimalDate !== today) {
    return { finds: { ...f, animals: [...f.animals, next], lastAnimalDate: today }, animal: next, isNew: true };
  }
  const found = f.animals.length ? f.animals[f.animals.length - 1]! : ZODIAC_ORDER[0]!;
  return { finds: f, animal: found, isNew: false };
}

/** Three taps crack the block; the fourth pops a gem, once a day. `taps` counts this visit's taps. */
export function tapGem(f: Finds, today: string, taps: number): { finds: Finds; cracks: number; gem: boolean } {
  const cracks = Math.min(taps, 3);
  if (taps >= 4 && f.lastGemDate !== today) return { finds: { ...f, gems: f.gems + 1, lastGemDate: today }, cracks, gem: true };
  return { finds: f, cracks, gem: false };
}

export const tapEgg = (f: Finds): Finds => (f.dinoHatched || f.eggTapped ? f : { ...f, eggTapped: true });

/** After a completed daily lesson: a tapped egg hatches. */
export const hatchAfterLesson = (f: Finds): Finds => (f.eggTapped && !f.dinoHatched ? { ...f, dinoHatched: true } : f);

/** The first dig on the island each day finds a star. */
export function dig(f: Finds, today: string): { finds: Finds; star: boolean } {
  if (f.lastDigDate === today) return { finds: f, star: false };
  return { finds: { ...f, lastDigDate: today }, star: true };
}

export function normalizeFinds(v: unknown): Finds {
  if (!v || typeof v !== 'object') return { ...DEFAULT_FINDS, animals: [] };
  const x = v as Partial<Record<keyof Finds, unknown>>;
  const date = (d: unknown) => (typeof d === 'string' ? d : null);
  const animals = Array.isArray(x.animals) ? [...new Set(x.animals.filter((a): a is string => typeof a === 'string' && ZODIAC_ORDER.includes(a)))] : [];
  return {
    animals,
    gems: typeof x.gems === 'number' && Number.isInteger(x.gems) && x.gems > 0 ? x.gems : 0,
    eggTapped: x.eggTapped === true,
    dinoHatched: x.dinoHatched === true,
    lastAnimalDate: date(x.lastAnimalDate),
    lastGemDate: date(x.lastGemDate),
    lastDigDate: date(x.lastDigDate),
  };
}

/**
 * What a find changed (before → after), added onto what is stored now: another save made meanwhile (a gem, a star, the day's
 * greeting) is kept, not written over (final review).
 */
export function applyFind<K extends { finds: Finds; bonusStars: number }>(stored: K, before: { finds: Finds; bonusStars: number }, after: { finds: Finds; bonusStars: number }): K {
  const s = stored.finds;
  const b = before.finds;
  const a = after.finds;
  const later = (x: string | null, y: string | null) => (x === null ? y : y === null ? x : x > y ? x : y);
  return {
    ...stored,
    finds: {
      animals: [...s.animals, ...a.animals.filter((x) => !b.animals.includes(x) && !s.animals.includes(x))],
      gems: s.gems + Math.max(0, a.gems - b.gems),
      eggTapped: s.eggTapped || a.eggTapped,
      dinoHatched: s.dinoHatched || a.dinoHatched,
      lastAnimalDate: later(s.lastAnimalDate, a.lastAnimalDate),
      lastGemDate: later(s.lastGemDate, a.lastGemDate),
      lastDigDate: later(s.lastDigDate, a.lastDigDate),
    },
    bonusStars: stored.bonusStars + Math.max(0, after.bonusStars - before.bonusStars),
  };
}
