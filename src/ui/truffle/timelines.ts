/** Truffle's reactions (spec 2026-10-04 §4.4): the moments a screen can ask him to react to. */
export type ReactionKind = 'right' | 'hard' | 'wrong' | 'streak' | 'newWord' | 'nod' | 'done' | 'excited' | 'pounce' | 'flinch' | 'purr';
export type Reaction = { kind: ReactionKind; key: number };
