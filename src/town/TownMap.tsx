// 字己镇 on Home (spec 2026-10-06 §3.7): a plain skyline of its nine places; each window is one of the place's words. Not interactive;
// sub-project 3 replaces it with the painted town.
import type { Knowledge } from '../stats/stats';
import { Label } from '../ui/Label';
import { PLACES, placeLight } from './town';

/** where: a card in Home's cards, or a strip in Home's top bar (a landscape iPad has room there, not under the cards: fit sweep, 2c). */
export function TownMap({ know, where = 'card' }: { know: Knowledge; where?: 'card' | 'bar' }) {
  return (
    <div class={`town town--${where}${where === 'card' ? ' card' : ''}`} role="group" aria-label="字己镇">
      <span class="label-tag town__tag">字己镇</span>
      <div class="town__row">
        {PLACES.map((p) => {
          const { windows, level } = placeLight(know, p);
          return (
            <div key={p.id} class={`town__place town__place--${level}`} role="img" aria-label={`${p.zh}：亮了 ${windows.filter((w) => w > 0).length} 个`}>
              <svg class="town__house" viewBox="0 0 40 44" aria-hidden="true">
                <path class="town__roof" d="M3 16 L20 3 L37 16 Z" />
                <rect class="town__wall" x="6" y="15" width="28" height="27" rx="2" />
                {windows.map((w, i) => (
                  <rect key={i} class={`town__win town__win--${w}`} x={10 + (i % 2) * 12} y={19 + Math.floor(i / 2) * 8} width="8" height="5" rx="1" />
                ))}
              </svg>
              <span class="town__name" aria-hidden="true"><Label zh={p.zh} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
