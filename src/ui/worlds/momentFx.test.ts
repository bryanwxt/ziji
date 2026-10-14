// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID } from '../../types';
import { FX_MS, momentFx } from './momentFx';
import { MOMENTS, runMoment } from './moments';
import { sceneFor } from './scene';

const kid = { ...DEFAULT_KID, finds: { ...DEFAULT_FINDS } };

describe('what each moment draws (spec 2026-10-13 §6)', () => {
  for (const w of WORLDS) for (const m of MOMENTS[w.id]) {
    const fx = runMoment(w.id, m.prop, kid, '2026-10-06', 1).fx;
    it(`${w.id}:${m.prop} draws its moment, hiding only a part the scene has, with no filter or clip-path`, () => {
      const { svg, hide } = momentFx(w.id, fx, false);
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).not.toMatch(/<filter|filter=|clip-path|NaN|undefined/);
      if (hide) expect(sceneFor(w.id, 'afternoon')).toContain(hide.match(/data-p(?:rop|art)="([^"]+)"/)![0]);
      expect(FX_MS[fx.kind]).toBeGreaterThan(0);
    });
    it(`${w.id}:${m.prop} with reduced motion: nothing moves`, () => {
      expect(momentFx(w.id, fx, true).svg).not.toMatch(/animateTransform|animateMotion/);
    });
  }
  it('in 银河 the boat lifts off the water; elsewhere it bobs (spec 2026-10-13 §5)', () => {
    const fx = { kind: 'boat' as const, animal: null };
    expect(momentFx('milkyway', fx, false).svg).toContain('0 -64');
    expect(momentFx('home', fx, false).svg).not.toContain('0 -64');
  });
});
