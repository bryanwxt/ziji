import { displayText } from '../langdu/phrases';

const HAN = /\p{Script=Han}/u;

/** A passage with each character a button: tap the ones he misread (Recordings, and Listen & confirm's passage row). */
export function MisreadText({ text, marked, onToggle }: { text: string; marked: ReadonlySet<string>; onToggle: (ch: string) => void }) {
  return (
    <p class="misreads__text">
      {[...displayText(text)].map((ch, i) =>
        HAN.test(ch) ? (
          <button key={i} type="button" class={`misread-ch${marked.has(ch) ? ' is-on' : ''}`} aria-pressed={marked.has(ch)} onClick={() => onToggle(ch)}>{ch}</button>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </p>
  );
}
