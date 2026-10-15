/** A bound character's pair with the character picked out in it (番茄, 番 marked; kidGloss.ts boundPair): the word he knows,
 *  the character he learns. */
export function BoundWord({ pair, ch }: { pair: string; ch: string }) {
  return <>{Array.from(pair).map((c, i) => <span key={i} class={c === ch ? 'bound__ch' : undefined}>{c}</span>)}</>;
}
