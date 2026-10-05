import { Volume2 } from 'lucide-preact';
import { speak } from '../audio/speech';

/** `small` sits to the right of a line of 组词-sized text, so it doesn't tower over it (parent, 2026-10-05). */
export function SpeakButton({ text, big = false, small = false }: { text: string; big?: boolean; small?: boolean }) {
  return (
    <button type="button" class={`speak ${big ? 'speak--big' : small ? 'speak--sm' : ''}`} aria-label="听" onClick={() => speak(text)}>
      <Volume2 size={big ? 60 : small ? 20 : 30} strokeWidth={2.5} />
    </button>
  );
}
