import { Volume2 } from 'lucide-preact';
import { speak } from '../audio/speech';

/** `small` sits to the right of a line of 组词-sized text, so it doesn't tower over it (parent, 2026-10-05). */
/** `reading`: a lone character's taught reading, so a 多音字 is said the way the card teaches (and from the same clip). */
export function SpeakButton({ text, reading, big = false, small = false }: { text: string; reading?: string; big?: boolean; small?: boolean }) {
  return (
    <button type="button" class={`speak ${big ? 'speak--big' : small ? 'speak--sm' : ''}`} aria-label="听" onClick={() => (reading ? speak(text, { reading }) : speak(text))}>
      <Volume2 size={big ? 60 : small ? 20 : 30} strokeWidth={2.5} />
    </button>
  );
}
